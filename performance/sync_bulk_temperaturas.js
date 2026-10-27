import http from "k6/http";
import { check, sleep } from "k6";

// Bulk sync de temperaturas vÃ­a POST /api/sync (lÃ­mite: 500 items/batch).
const BASE_URL = __ENV.BASE_URL || "http://localhost:3016";
const PERFIL_ID = __ENV.PERFIL_ID || "1";

const HEADERS = {
  "Content-Type": "application/json",
  Cookie: __ENV.COOKIES || "",
};

export const options = {
  scenarios: {
    bulk_sync: {
      executor: "ramping-vus",
      startVUs: 1,
      stages: [
        { duration: "10s", target: 5 },
        { duration: "30s", target: 5 },
        { duration: "5s", target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.02"],
    http_req_duration: ["p(95)<2000"],
  },
};

function generarItems(n) {
  return Array.from({ length: n }, (_, i) => ({
    tempId: `temp-${__VU}-${__ITER}-${i}`,
    table: "trazabilidad_temperatura",
    data: {
      id_perfil: Number(PERFIL_ID),
      minuto: (i % 100) + Math.floor(__ITER / 100) * 100,
      temperatura_registrada: 150 + (i % 60),
    },
  }));
}

export default function escenario() {
  const payload = JSON.stringify({ items: generarItems(100) });
  const res = http.post(`${BASE_URL}/api/sync`, payload, { headers: HEADERS });
  check(res, {
    "status 200": (r) => r.status === 200,
    "sin rechazados": (r) => {
      try {
        return (r.json("data.rejected") || []).length === 0;
      } catch {
        return false;
      }
    },
  });
  sleep(1);
}
