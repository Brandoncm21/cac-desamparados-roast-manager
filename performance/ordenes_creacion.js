import http from "k6/http";
import { check, sleep } from "k6";
import { SharedArray } from "k6/data";

// Crea Ã³rdenes concurrentes. Requiere cliente existente y servicios seed.
// Las variables van por entorno: CLIENTE_ID (id_cliente vÃ¡lido), SERVICIO_ID.
const BASE_URL = __ENV.BASE_URL || "http://localhost:3016";
const CLIENTE_ID = __ENV.CLIENTE_ID || "1";
const SERVICIO_ID = __ENV.SERVICIO_ID || "5";

const HEADERS = {
  "Content-Type": "application/json",
  Cookie: __ENV.COOKIES || "",
};

export const options = {
  scenarios: {
    creacion_ordenes: {
      executor: "ramping-vus",
      startVUs: 1,
      stages: [
        { duration: "10s", target: 3 },
        { duration: "30s", target: 3 },
        { duration: "5s", target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.1"],
    http_req_duration: ["p(95)<1500"],
  },
};

const payload = JSON.stringify({
  id_cliente: Number(CLIENTE_ID),
  id_empleado_recibe: Number(__ENV.EMPLEADO_ID || "1"),
  servicios: [{ servicio_id: Number(SERVICIO_ID), tipo_servicio: "Chancado" }],
});

export default function escenario() {
  const res = http.post(`${BASE_URL}/api/ordenes`, payload, { headers: HEADERS });
  check(res, { "creada (201/422)": (r) => r.status === 201 || r.status === 422 });
  sleep(2);
}
