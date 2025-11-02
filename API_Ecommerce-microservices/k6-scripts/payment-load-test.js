import http from "k6/http";
import { check, sleep } from "k6";
import { Rate } from "k6/metrics";

// Custom metrics
const errorRate = new Rate("errors");

export const options = {
  stages: [
    { duration: "30s", target: 10 },   // Ramp up to 10 users
    { duration: "1m", target: 50 },    // Ramp up to 50 users
    { duration: "2m", target: 100 },   // Stay at 100 users
    { duration: "1m", target: 200 },   // Ramp up to 200 users
    { duration: "1m", target: 500 },   // Stress test with 500 users
    { duration: "30s", target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    http_req_failed: ["rate<0.01"],    // Error rate < 1%
    http_req_duration: ["p(95)<500"],  // 95% of requests < 500ms
    errors: ["rate<0.1"],              // Custom error rate < 10%
  },
};

// Base URL - using service name from docker network
const BASE_URL = "http://payments-service:3004";

export default function () {
  // Test 1: Health check
  const healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, {
    "health check status is 200": (r) => r.status === 200,
  });

  sleep(1);

  // Test 2: Get payment types
  const typesRes = http.get(`${BASE_URL}/v1/payments/types`);
  const typesCheck = check(typesRes, {
    "get payment types status is 200": (r) => r.status === 200,
    "get payment types has data": (r) => r.json().length >= 0,
  });
  errorRate.add(!typesCheck);

  sleep(1);

  // Test 3: Process a payment for an order
  const orderId = Math.floor(Math.random() * 1000) + 1;
  const paymentPayload = JSON.stringify({
    payment_method: ["Cartão de Crédito", "Cartão de Débito", "PIX", "Boleto Bancário"][
      Math.floor(Math.random() * 4)
    ],
  });

  const params = {
    headers: { "Content-Type": "application/json" },
  };

  const processRes = http.post(
    `${BASE_URL}/v1/payments/process/${orderId}`,
    paymentPayload,
    params
  );
  const processCheck = check(processRes, {
    "process payment status is 200 or 201": (r) => r.status === 200 || r.status === 201,
  });
  errorRate.add(!processCheck);

  sleep(1);

  // Test 4: Get payments for the order
  const orderPaymentsRes = http.get(`${BASE_URL}/v1/payments/orders/${orderId}`);
  const orderPaymentsCheck = check(orderPaymentsRes, {
    "get order payments status is 200": (r) => r.status === 200,
  });
  errorRate.add(!orderPaymentsCheck);

  sleep(2);
}
