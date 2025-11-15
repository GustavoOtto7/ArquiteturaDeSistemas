import http from "k6/http";
import { check, sleep } from "k6";

// Simple quick test configuration
export const options = {
  vus: 5,
  duration: "30s",
  thresholds: {
    http_req_duration: ["p(95)<500"],
    http_req_failed: ["rate<0.1"],
  },
};

const BASE_URL = "http://payments-service:3004";

export default function () {
  // Health check
  const healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, {
    "health check OK": (r) => r.status === 200,
  });

  sleep(1);

  // Get payment types
  const typesRes = http.get(`${BASE_URL}/v1/payments/types`);
  check(typesRes, {
    "get payment types OK": (r) => r.status === 200,
  });

  sleep(1);
}
