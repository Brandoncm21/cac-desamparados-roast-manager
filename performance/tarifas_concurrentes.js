import http from "k6/http";
import { check, sleep } from "k6";

// Actualizaciones concurrentes de tarifas (verifica EXCLUDE numrange 0025
// bajo concurrencia). Solo Admin. El endpoint responde 409/500 ante traslape.
const BASE_URL = __ENV.BASE_URL || "http://localhost:3016";
const SERVICIO_ID = __ENV.SERVICIO_ID || "5";

const HEADERS = {
  "Content-Type": "application/json",
  Cookie: __ENV.COOKIES || "",
};

export const options = {
  scenarios: {
    tarifas_concurrentes: {
      executor: "ramping-vus",
      startVUs: 1,
      stages: [
        { duration: "5s", target: 5 },
        { duration: "20s", target: 5 },
        { duration: "5s", target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.2"],
  },
};

const payload = JSON.stringify({
  nombre: "Tueste",
  tipo: "tueste",
  intervalos: [
    { peso_min_kg: 1, peso_max_kg: 25, precio_por_kg: 950 },
    { peso_min_kg: 25, peso_max_kg: 100, precio_por_kg: 850 },
    { peso_min_kg: 100, peso_max_kg: null, precio_por_kg: 750 },
  ],
});

export default function escenario() {
  const res = http.put(
    `${BASE_URL}/api/admin/servicios/${SERVICIO_ID}`,
    payload,
    { headers: HEADERS }
  );
  check(res, {
    "200 (Ã©xito) o 409 (traslape rechazado)": (r) =>
      r.status === 200 || r.status === 409,
  });
  sleep(1);
}
