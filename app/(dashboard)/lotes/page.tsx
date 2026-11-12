"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUserRole, canEditLote, canDeleteLote } from "@/lib/auth-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface Lote {
  id_lote: number;
  nlote: string;
  clientes: { nombre_completo: string } | null;
  fincas: { nombre: string; altura: number | null; zonas_finca: { nombre: string } | null } | null;
  disponible: number | null;
  enproceso: string;
  vendido: boolean;
  fecha_acopio: string;
}

const ESTADOS_LOTE = ["No", "En Secado", "En Trilla", "En Bodega", "En Catación", "Vendido"];

export default function LotesPage() {
  const router = useRouter();

  const [lotes, setLotes] = useState<Lote[]>([]);
  const [estado, setEstado] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [userRole, setUserRole] = useState<"Admin" | "Tostador" | "Recepción" | "Operador" | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [estado]);

  const loadLotes = async () => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    if (estado) params.set("enproceso", estado);
    if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());

    const res = await fetch(`/api/lotes?${params.toString()}`);
    const result = await res.json();
    if (!res.ok) {
      toast.error("Error al cargar lotes: " + (result.error?.message || "Error desconocido"));
      return;
    }
    setLotes(result.data ?? []);
    setTotalItems(result.pagination?.total ?? 0);
  };

  useEffect(() => {
    loadLotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado, debouncedSearch, page, pageSize]);

  useEffect(() => {
    getCurrentUserRole().then(setUserRole);
  }, []);

  const totalPages = Math.ceil(totalItems / pageSize);

  const eliminarLote = async (id: number) => {
    if (!window.confirm("¿Está seguro de que desea desactivar este lote?")) return;

    const res = await fetch(`/api/lotes/${id}`, { method: "DELETE" });
    const result = (await res.json()) as { data?: { deleted: boolean }; error?: { message: string } };

    if (!res.ok) {
      toast.error("Error al desactivar lote: " + (result.error?.message || "Error desconocido"));
      return;
    }

    toast.success("Lote desactivado exitosamente");
    setLotes((prev) => prev.filter((l) => l.id_lote !== id));
    setTotalItems((prev) => Math.max(prev - 1, 0));
    router.refresh();
  };

  const estadoBadge = (estado: string) => {
    const colors: Record<string, string> = {
      No: "bg-gray-100 text-gray-800",
      "En Secado": "bg-amber-100 text-amber-800",
      "En Trilla": "bg-blue-100 text-blue-800",
      "En Bodega": "bg-purple-100 text-purple-800",
      "En Catación": "bg-orange-100 text-orange-800",
      Vendido: "bg-green-100 text-green-800",
    };
    return colors[estado] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mt-6">
        <h1 className="text-2xl font-bold">Lotes de Café</h1>
        {canEditLote(userRole) && (
          <Link href="/lotes/nueva">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Lote
            </Button>
          </Link>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por N° de lote..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={estado} onValueChange={(v) => setEstado(v ?? "")}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos</SelectItem>
            {ESTADOS_LOTE.map((e) => (
              <SelectItem key={e} value={e}>{e}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>N° Lote</TableHead>
              <TableHead>Productor</TableHead>
              <TableHead>Finca</TableHead>
              <TableHead className="hidden md:table-cell">Zona</TableHead>
              <TableHead>Disponible</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lotes.map((lote) => (
              <TableRow key={lote.id_lote}>
                <TableCell className="font-mono">{lote.nlote}</TableCell>
                <TableCell>{lote.clientes?.nombre_completo ?? "-"}</TableCell>
                <TableCell>{lote.fincas?.nombre ?? "-"}</TableCell>
                <TableCell className="hidden md:table-cell">{lote.fincas?.zonas_finca?.nombre || "-"}</TableCell>
                <TableCell>
                  {lote.disponible != null ? `${lote.disponible} kg` : "-"}
                </TableCell>
                <TableCell>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${estadoBadge(lote.enproceso)}`}>
                    {lote.vendido && lote.enproceso !== "Vendido" ? "Vendido" : lote.enproceso}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link href={`/lotes/${lote.id_lote}`}>
                      <Button variant="ghost" size="sm">Ver</Button>
                    </Link>
                    {canEditLote(userRole) && (
                      <Link href={`/lotes/${lote.id_lote}/editar`}>
                        <Button variant="outline" size="sm">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </Link>
                    )}
                    {canDeleteLote(userRole) && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => eliminarLote(lote.id_lote)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        pageSize={pageSize}
        totalItems={totalItems}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  );
}
