"use client";

import { Thermometer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SeccionTuesteProps {
  cargando: boolean;
  idPerfil: number | null;
  creandoPerfil: boolean;
  onVerPerfil: () => void;
  onIniciarTueste: () => void;
}

/** Acceso al perfil de tueste de la orden: verlo si existe o crearlo. */
export function SeccionTueste({
  cargando,
  idPerfil,
  creandoPerfil,
  onVerPerfil,
  onIniciarTueste,
}: SeccionTuesteProps) {
  return (
    <Card className="mb-8 noPrint">
      <CardHeader>
        <CardTitle className="text-lg">Proceso de Tueste</CardTitle>
      </CardHeader>
      <CardContent>
        {cargando ? (
          <p className="text-muted-foreground">Verificando perfil de tueste...</p>
        ) : idPerfil ? (
          <Button className="w-full h-12" onClick={onVerPerfil}>
            <Thermometer className="h-4 w-4 mr-2" />
            Ver perfil de tueste
          </Button>
        ) : (
          <Button className="w-full h-12" onClick={onIniciarTueste} disabled={creandoPerfil}>
            <Thermometer className="h-4 w-4 mr-2" />
            {creandoPerfil ? "Creando perfil..." : "Iniciar Tueste"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
