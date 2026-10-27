import http from "k6/http";
import { check, sleep } from "k6";

// Lectura de perfiles de tueste con sus curvas (serie completa por perfil).
const BASE_URL = __ENV.BASE_URL || "http://localhost:3016";
const HEADERS = {
  "Content-Type": "application/json",
  Cookie: __ENV.COOKIES || "",
};

export const options = {
  scenarios: {
    lectura_perfiles: {
      executor: "constant-arrival-rate",
      rate: 20,
      timeUnit: "1s",
      duration: "60s",
      preAllocatedVUs: 15,
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<700"],
  },
};

export default function escenario() {
  const perfilId = Math.floor(Math.random() * 20) + 1;
  const res = http.get(`${BASE_URL}/api/perfiles-tueste/${perfilId}`, {
    headers: HEADERS,
  });
  check(res, {
    "status 200 o 404": (r) => r.status === 200 || r.status === 404,
  });
  sleep(0.5);
}
