import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://localhost:3016";
const TOKEN = __ENV.TOKEN || "";
const PAGE_SIZE = __ENV.PAGE_SIZE || "25";

const HEADERS = {
  "Content-Type": "application/json",
  ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
  Cookie: __ENV.COOKIES || "",
};

export const options = {
  scenarios: {
    listado_ordenes: {
      executor: "ramping-vus",
      startVUs: 1,
      stages: [
        { duration: "20s", target: 5 },
        { duration: "40s", target: 5 },
        { duration: "10s", target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<800"],
  },
};

export default function escenario() {
  const page = Math.floor(Math.random() * 5) + 1;
  const res = http.get(
    `${BASE_URL}/api/ordenes?page=${page}&pageSize=${PAGE_SIZE}`,
    { headers: HEADERS }
  );
  check(res, {
    "status 200": (r) => r.status === 200,
    "tiene pagination": (r) => {
      try {
        return r.json("pagination.total") >= 0;
      } catch {
        return false;
      }
    },
  });
  sleep(1);
}
