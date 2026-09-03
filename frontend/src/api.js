// ─── Centralized API Module ───────────────────────────────────────
// Toggle USE_MOCK to false once the real backend is running.
// All API calls flow through this file — swap is a one-line change.

import {
  mockGetContacts,
  mockEvaluateTransfer,
  mockExecuteTransfer,
  mockGetHistory,
} from "./mock";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
const USE_MOCK = true; // ← flip to false when backend is ready

async function request(method, path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`API ${method} ${path} failed: ${res.status}`);
  return res.json();
}

// ── Public API ──

export async function getContacts() {
  if (USE_MOCK) return mockGetContacts();
  return request("GET", "/api/contacts");
}

export async function evaluateTransfer(data) {
  if (USE_MOCK) return mockEvaluateTransfer(data);
  return request("POST", "/api/transfer/evaluate", data);
}

export async function executeTransfer(data) {
  if (USE_MOCK) return mockExecuteTransfer(data);
  return request("POST", "/api/transfer/execute", data);
}

export async function getTransferHistory() {
  if (USE_MOCK) return mockGetHistory();
  return request("GET", "/api/transfer/history");
}
