import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function CalificacionPage() {
  return (
    <div className="space-y-6">
      <div className="mt-6">
        <h1 className="text-2xl font-bold">Calificación</h1>
        <p className="text-sm text-muted-foreground">
          Módulo en preparación dentro del flujo de Beneficiado / Acopio.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Próximamente</CardTitle>
          <CardDescription>
            Aquí se registrará la calificación final del lote. Por ahora usá Catación para dejar
            la nota y las observaciones del café.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Mientras tanto, el estado del lote y sus etapas están disponibles en Recibido de Café.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
