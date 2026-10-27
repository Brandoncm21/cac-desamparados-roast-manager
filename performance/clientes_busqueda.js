import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://localhost:3016";
const HEADERS = {
  "Content-Type": "application/json",
  Cookie: __ENV.COOKIES || "",
};

export const options = {
  scenarios: {
    busqueda_clientes: {
      executor: "constant-arrival-rate",
      rate: 10,
      timeUnit: "1s",
      duration: "60s",
      preAllocatedVUs: 10,
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<500"],
  },
};

const TERMINOS = ["fin", "tarra", "valle", "san", "brun"];

export default function escenario() {
  const term = TERMINOS[Math.floor(Math.random() * TERMINOS.length)];
  const page = Math.floor(Math.random() * 3) + 1;
  const res = http.get(
    `${BASE_URL}/api/clientes?search=${term}&page=${page}&pageSize=10`,
    { headers: HEADERS }
  );
  check(res, { "status 200": (r) => r.status === 200 });
  sleep(0.5);
}
