import {
  syncDataSchemas,
  type SyncItem,
  type TablaSync,
} from "./schemas";
import { dedupePorClave } from "./sync-utils";

export interface Aceptado {
  tempId: string;
  recordId: number | null;
}

export interface Rechazado {
  tempId: string;
  code: string;
  message: string;
}

export interface ResultadoSync {
  accepted: Aceptado[];
  rejected: Rechazado[];
}

export interface SyncDbSelect {
  select: (
    cols: string
  ) => Promise<{
    data: Record<string, unknown>[] | null;
    error: { code?: string; message: string } | null;
  }>;
}

export interface SyncDbInsertSelect {
  maybeSingle: () => Promise<{
    data: Record<string, unknown> | null;
    error: { code?: string; message: string } | null;
  }>;
}

export interface SyncDbLike {
  from(table: string): {
    upsert: (
      rows: Record<string, unknown>[],
      opts: { onConflict: string }
    ) => SyncDbSelect;
    insert: (row: Record<string, unknown>) => {
      select: (cols: string) => SyncDbInsertSelect;
    };
  };
}

const CONFLICTOS: Record<TablaSync, string | null> = {
  trazabilidad_temperatura: "id_perfil,minuto",
  hitos_termicos: "id_perfil,tipo_hito",
  ajustes_tueste: "id_perfil,orden_secuencia",
  metricas_tueste: "id_perfil,tipo_metrica",
  servicios_ejecutados: null,
};

const ID_COLUMNAS: Record<TablaSync, string> = {
  trazabilidad_temperatura: "id_registro",
  hitos_termicos: "id_hito",
  ajustes_tueste: "id_ajuste",
  metricas_tueste: "id_metrica",
  servicios_ejecutados: "id_servicio",
};

const COLUMNAS_CLAVE: Record<TablaSync, string | null> = {
  trazabilidad_temperatura: "id_perfil,minuto",
  hitos_termicos: "id_perfil,tipo_hito",
  ajustes_tueste: "id_perfil,orden_secuencia",
  metricas_tueste: "id_perfil,tipo_metrica",
  servicios_ejecutados: null,
};

function claveDeFila(
  table: TablaSync,
  fila: Record<string, unknown>
): string | null {
  switch (table) {
    case "trazabilidad_temperatura":
      return `${fila["id_perfil"]}:${fila["minuto"]}`;
    case "hitos_termicos":
      return `${fila["id_perfil"]}:${fila["tipo_hito"]}`;
    case "ajustes_tueste":
      return `${fila["id_perfil"]}:${fila["orden_secuencia"]}`;
    case "metricas_tueste":
      return `${fila["id_perfil"]}:${fila["tipo_metrica"]}`;
    default:
      return null;
  }
}

export function codigoErrorPg(code: string | undefined): string {
  switch (code) {
    case "23505":
      return "CONFLICT";
    case "23503":
      return "FOREIGN_KEY";
    case "23514":
      return "CHECK_VIOLATION";
    case "23502":
      return "NOT_NULL";
    default:
      return "DB_ERROR";
  }
}

/** Trunca mensajes de PG (pueden incluir valores) sin exponer secretos. */
export function mensajeSeguro(message: string | undefined): string {
  if (!message) return "Error de base de datos";
  return message.slice(0, 200);
}

export async function procesarItemsParaSync(
  db: SyncDbLike,
  items: SyncItem[]
): Promise<ResultadoSync> {
  const aceptados: Aceptado[] = [];
  const rechazados: Rechazado[] = [];

  const porTabla = new Map<TablaSync, SyncItem[]>();
  for (const item of items) {
    const lista = porTabla.get(item.table) ?? [];
    lista.push(item);
    porTabla.set(item.table, lista);
  }

  for (const [table, grupo] of porTabla) {
    const validos: {
      item: SyncItem;
      data: Record<string, unknown>;
    }[] = [];

    for (const item of grupo) {
      const validacion = syncDataSchemas[table].safeParse(item.data);
      if (!validacion.success) {
        const primerIssue = validacion.error.issues[0];
        rechazados.push({
          tempId: item.tempId,
          code: "VALIDATION_ERROR",
          message: primerIssue
            ? `${primerIssue.path.join(".")}: ${primerIssue.message}`.slice(0, 200)
            : "Datos inválidos",
        });
        continue;
      }
      validos.push({
        item,
        data: validacion.data as Record<string, unknown>,
      });
    }

    if (validos.length === 0) continue;

    const conflicto = CONFLICTOS[table];
    const idCol = ID_COLUMNAS[table];
    const columnasClave = COLUMNAS_CLAVE[table];

    // Deduplicar por clave natural (last-write-wins) antes del bulk.
    const unicos = dedupePorClave(
      validos.map((v) => ({
        table,
        tempId: v.item.tempId,
        data: v.data,
      }))
    ).map((u) => ({
      item: validos.find((v) => v.item.tempId === u.tempId)!.item,
      data: u.data,
    }));

    if (conflicto && columnasClave) {
      const filas = unicos.map((v) => v.data);
      const bulk = await db
        .from(table)
        .upsert(filas, { onConflict: conflicto })
        .select(`${idCol},${columnasClave}`);

      if (!bulk.error) {
        const porId = new Map<string, number>();
        for (const fila of bulk.data ?? []) {
          const clave = claveDeFila(table, fila);
          if (clave !== null && typeof fila[idCol] === "number") {
            porId.set(clave, fila[idCol] as number);
          }
        }
        for (const v of unicos) {
          const clave = claveDeFila(table, v.data);
          aceptados.push({
            tempId: v.item.tempId,
            recordId: clave !== null ? (porId.get(clave) ?? null) : null,
          });
        }
        continue;
      }

      // El bulk falló: aislar por item para reportar cada fallo.
      for (const v of unicos) {
        const individual = await db
          .from(table)
          .upsert([v.data], { onConflict: conflicto })
          .select(`${idCol}`);
        const fila = individual.data?.[0] as
          | Record<string, unknown>
          | undefined;
        if (individual.error) {
          rechazados.push({
            tempId: v.item.tempId,
            code: codigoErrorPg(individual.error.code),
            message: mensajeSeguro(individual.error.message),
          });
        } else {
          aceptados.push({
            tempId: v.item.tempId,
            recordId:
              fila && typeof fila[idCol] === "number"
                ? (fila[idCol] as number)
                : null,
          });
        }
      }
      continue;
    }

    // Sin constraint idempotente (servicios_ejecutados): insert individual.
    for (const v of unicos) {
      const individual = await db
        .from(table)
        .insert(v.data)
        .select(`${idCol}`)
        .maybeSingle();
      if (individual.error) {
        rechazados.push({
          tempId: v.item.tempId,
          code: codigoErrorPg(individual.error.code),
          message: mensajeSeguro(individual.error.message),
        });
      } else {
        const fila = (individual.data ?? {}) as Record<string, unknown>;
        aceptados.push({
          tempId: v.item.tempId,
          recordId:
            typeof fila[idCol] === "number" ? (fila[idCol] as number) : null,
        });
      }
    }
  }

  return { accepted: aceptados, rejected: rechazados };
}
