"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Thermometer } from "lucide-react";

interface Perfil {
  id_perfil: number;
  numero_lote: string | null;
  nombre_cafe: string | null;
  fecha_tueste: string;
}

export default function TuesteListPage() {
  const router = useRouter();
  const supabase = createClient();
  const [perfiles, setPerfiles] = useState<Perfil[]>([]);

  useEffect(() => {
    supabase
      .from("perfiles_tueste")
      .select("*")
      .order("fecha_tueste", { ascending: false })
      .then(({ data }) => {
        if (data) setPerfiles(data);
      });
  }, [supabase]);

  const crearPerfil = async () => {
    const { data, error } = await supabase
      .from("perfiles_tueste")
      .insert({ nombre_cafe: "Nuevo lote" })
      .select()
      .single();

    if (data) {
      router.push(`/tueste/${data.id_perfil}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Captura de Tueste</h1>
        <Button onClick={crearPerfil}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Perfil
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {perfiles.map((p) => (
          <Card
            key={p.id_perfil}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => router.push(`/tueste/${p.id_perfil}`)}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Thermometer className="h-5 w-5 text-orange-500" />
                {p.numero_lote || `Perfil #${p.id_perfil}`}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>{p.nombre_cafe || "Sin nombre"}</p>
              <p>{p.fecha_tueste}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
