import http from "k6/http";
import { check, sleep } from "k6";
import { Rate } from "k6/metrics";

// Custom metrics
const errorRate = new Rate("errors");

export const options = {
  stages: [
    { duration: "30s", target: 20 },   // Warm up
    { duration: "1m", target: 50 },    // Ramp up
    { duration: "3m", target: 100 },   // Normal load
    { duration: "1m", target: 200 },   // Peak load
    { duration: "30s", target: 0 },    // Cool down
  ],
  thresholds: {
    http_req_duration: ["p(95)<1000"], // 95% of requests should be below 1s
    http_req_failed: ["rate<0.05"],    // Less than 5% of requests should fail
    errors: ["rate<0.1"],              // Custom error rate < 10%
  },
};

// Service URLs
const PRODUCTS_URL = "http://products-service:3001";
const CLIENTS_URL = "http://clients-service:3002";
const ORDERS_URL = "http://orders-service:3003";
const PAYMENTS_URL = "http://payments-service:3004";
const NOTIFICATIONS_URL = "http://notification-service:3005";

export default function () {
  const params = {
    headers: { "Content-Type": "application/json" },
  };

  // Test Products Service
  const productsRes = http.get(`${PRODUCTS_URL}/v1/products`);
  check(productsRes, {
    "products: status 200": (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(1);

  // Test Clients Service
  const clientsRes = http.get(`${CLIENTS_URL}/v1/clients`);
  check(clientsRes, {
    "clients: status 200": (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(1);

  // Test Orders Service
  const ordersRes = http.get(`${ORDERS_URL}/v1/orders`);
  check(ordersRes, {
    "orders: status 200": (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(1);

  // Test Payments Service - Get payment types
  const paymentTypesRes = http.get(`${PAYMENTS_URL}/v1/payments/types`);
  check(paymentTypesRes, {
    "payments types: status 200": (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(1);

  // Test Notifications Service
  const notificationPayload = JSON.stringify({
    clientId: Math.floor(Math.random() * 100) + 1,
    title: "Test Notification",
    message: "Load test notification",
  });

  const notifRes = http.post(
    `${NOTIFICATIONS_URL}/v1/notifications`,
    notificationPayload,
    params
  );
  check(notifRes, {
    "notifications: status 200": (r) => r.status === 200,
    "notifications: success": (r) => r.json().success === true,
  }) || errorRate.add(1);

  sleep(2);
}
