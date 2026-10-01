const BASE_URL = "http://127.0.0.1:8000/api";

export async function fetchDashboardStats() {
  const res = await fetch(`${BASE_URL}/dashboard`);
  return res.json();
}

export async function fetchResources(filters: Record<string, string> = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, val]) => {
    if (val) params.append(key, val);
  });
  const res = await fetch(`${BASE_URL}/resources?${params.toString()}`);
  return res.json();
}

export async function fetchResourceDetail(id: string) {
  const res = await fetch(`${BASE_URL}/resources/${id}`);
  return res.json();
}

export async function fetchEvents(filters: Record<string, string> = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, val]) => {
    if (val) params.append(key, val);
  });
  const res = await fetch(`${BASE_URL}/events?${params.toString()}`);
  return res.json();
}

export async function createCustomEvent(eventData: any) {
  const res = await fetch(`${BASE_URL}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(eventData),
  });
  return res.json();
}

export async function fetchAlerts(filters: Record<string, string> = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, val]) => {
    if (val) params.append(key, val);
  });
  const res = await fetch(`${BASE_URL}/alerts?${params.toString()}`);
  return res.json();
}

export async function fetchAlertDetail(id: string) {
  const res = await fetch(`${BASE_URL}/alerts/${id}`);
  return res.json();
}

export async function acknowledgeAlert(id: string) {
  const res = await fetch(`${BASE_URL}/alerts/${id}/acknowledge`, { method: "PATCH" });
  return res.json();
}

export async function resolveAlert(id: string) {
  const res = await fetch(`${BASE_URL}/alerts/${id}/resolve`, { method: "PATCH" });
  return res.json();
}

export async function fetchRules() {
  const res = await fetch(`${BASE_URL}/rules`);
  return res.json();
}

export async function updateRule(id: string, ruleUpdate: any) {
  const res = await fetch(`${BASE_URL}/rules/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ruleUpdate),
  });
  return res.json();
}

export async function fetchAuditLogs(filters: Record<string, string> = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, val]) => {
    if (val) params.append(key, val);
  });
  const res = await fetch(`${BASE_URL}/audit-logs?${params.toString()}`);
  return res.json();
}

export async function fetchNotifications() {
  const res = await fetch(`${BASE_URL}/notifications`);
  return res.json();
}

export async function fetchSecurityScore() {
  const res = await fetch(`${BASE_URL}/security-score`);
  return res.json();
}

export async function triggerRandomEvent() {
  const res = await fetch(`${BASE_URL}/simulator/random`, { method: "POST" });
  return res.json();
}

export async function runScenario(scenarioName: string) {
  const res = await fetch(`${BASE_URL}/simulator/scenario`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scenario_name: scenarioName }),
  });
  return res.json();
}

export async function fetchSimulatorConfig() {
  const res = await fetch(`${BASE_URL}/simulator/config`);
  return res.json();
}

export async function controlSimulator(action: string, intervalSeconds: number) {
  const res = await fetch(`${BASE_URL}/simulator/control`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, interval_seconds: intervalSeconds }),
  });
  return res.json();
}

export async function fetchSMTPConfig() {
  const res = await fetch(`${BASE_URL}/smtp/config`);
  return res.json();
}

export async function saveSMTPConfig(config: any) {
  const res = await fetch(`${BASE_URL}/smtp/config`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
  return res.json();
}
