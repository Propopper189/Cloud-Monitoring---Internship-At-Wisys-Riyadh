const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";

const MOCK_INSTANCE_NODES = [
  { id: "inst-sap-99", name: "vm-sap-prod", cloud_provider: "GCP", resource_type: "VM", region: "asia-south1-a", status: "ACTIVE", health: "HEALTHY", latitude: 19.0760, longitude: 72.8777 },
  { id: "inst-web-101", name: "vm-web-dev", cloud_provider: "GCP", resource_type: "VM", region: "asia-east1-b", status: "ACTIVE", health: "HEALTHY", latitude: 25.0330, longitude: 121.5654 },
  { id: "sg-89472", name: "sg-gcp-web-prod", cloud_provider: "GCP", resource_type: "Security Group", region: "asia-south1-a", status: "ACTIVE", health: "HEALTHY", latitude: 20.8760, longitude: 74.6777 },
  { id: "vpc-87291", name: "vpc-gcp-production", cloud_provider: "GCP", resource_type: "VPC", region: "us-central1", status: "ACTIVE", health: "HEALTHY", latitude: 41.8781, longitude: -87.6298 },
  { id: "ecs-billing-01", name: "ecs-billing-app", cloud_provider: "Huawei Cloud", resource_type: "ECS", region: "ap-southeast-3", status: "ACTIVE", health: "HEALTHY", latitude: -6.2088, longitude: 106.8456 },
  { id: "ecs-router-02", name: "ecs-sap-router", cloud_provider: "Huawei Cloud", resource_type: "ECS", region: "ap-southeast-3", status: "STOPPED", health: "UNHEALTHY", latitude: -4.5088, longitude: 109.2456, active_alert: "Production ECS Instance Stopped Unscheduled" },
  { id: "backup-db-prod", name: "hw-backup-db", cloud_provider: "Huawei Cloud", resource_type: "Backup", region: "cn-north-4", status: "ACTIVE", health: "HEALTHY", latitude: 39.9042, longitude: 116.4074 },
  { id: "app-entra-783921", name: "WiSys Azure Sync Integration App", cloud_provider: "Microsoft Entra ID", resource_type: "Application", region: "global", status: "ACTIVE", health: "HEALTHY", latitude: 24.7136, longitude: 46.6753 }
];

const MOCK_REGIONAL_HEALTH = [
  {
    region: "asia-south1-a",
    display_name: "Asia South 1 (Mumbai)",
    cloud_provider: "GCP",
    latitude: 19.0760,
    longitude: 72.8777,
    total_resources: 2,
    healthy_count: 2,
    unhealthy_count: 0,
    active_alerts_count: 0,
    status: "HEALTHY",
    resources: [
      { id: "inst-sap-99", name: "vm-sap-prod", resource_type: "VM", status: "ACTIVE", health: "HEALTHY", cloud_provider: "GCP" },
      { id: "sg-89472", name: "sg-gcp-web-prod", resource_type: "Security Group", status: "ACTIVE", health: "HEALTHY", cloud_provider: "GCP" }
    ]
  },
  {
    region: "ap-southeast-3",
    display_name: "Asia Southeast 3 (Jakarta)",
    cloud_provider: "Huawei Cloud",
    latitude: -6.2088,
    longitude: 106.8456,
    total_resources: 6,
    healthy_count: 5,
    unhealthy_count: 1,
    active_alerts_count: 1,
    status: "UNHEALTHY",
    resources: [
      { id: "ecs-billing-01", name: "ecs-billing-app", resource_type: "ECS", status: "ACTIVE", health: "HEALTHY", cloud_provider: "Huawei Cloud" },
      { id: "ecs-router-02", name: "ecs-sap-router", resource_type: "ECS", status: "STOPPED", health: "UNHEALTHY", cloud_provider: "Huawei Cloud" }
    ]
  },
  {
    region: "global",
    display_name: "Global HQ (Riyadh / Entra ID)",
    cloud_provider: "Microsoft Entra ID",
    latitude: 24.7136,
    longitude: 46.6753,
    total_resources: 2,
    healthy_count: 2,
    unhealthy_count: 0,
    active_alerts_count: 0,
    status: "HEALTHY",
    resources: [
      { id: "app-entra-783921", name: "WiSys Azure Sync Integration App", resource_type: "Application", status: "ACTIVE", health: "HEALTHY", cloud_provider: "Microsoft Entra ID" }
    ]
  }
];

const MOCK_STATS = {
  total_resources: 41,
  total_events: 3100000,
  total_alerts: 1890,
  open_alerts: 14,
  security_score: 40,
  gcp_summary: { resources: 22, events: 1600000, critical_alerts: 6, high_alerts: 12 },
  huawei_summary: { resources: 18, events: 5800000, critical_alerts: 7, high_alerts: 5 },
  alerts_by_severity: { CRITICAL: 14, HIGH: 45, WARNING: 20, INFO: 10 },
  alerts_by_provider: { GCP: 105, "Huawei Cloud": 72, "Microsoft Entra ID": 34, Azure: 76, AWS: 53 },
  alerts_by_status: { OPEN: 14, ACKNOWLEDGED: 12, RESOLVED: 45 },
  events_by_provider: { GCP: 1600000, Azure: 1500000, AWS: 1000000, "Huawei Cloud": 5800000, "Microsoft Entra ID": 4400000 },
  regional_health: MOCK_REGIONAL_HEALTH,
  instance_nodes: MOCK_INSTANCE_NODES
};

const MOCK_RESOURCES = [
  { id: "gcp-vm-01", name: "gcp-prod-gke-node-1", cloud_provider: "GCP", resource_type: "VM", status: "RUNNING", region: "asia-south1-a" },
  { id: "hw-ecs-01", name: "hw-ecs-database-primary", cloud_provider: "Huawei Cloud", resource_type: "ECS", status: "RUNNING", region: "ap-southeast-3" },
  { id: "entra-app-01", name: "entra-sp-auth-gateway", cloud_provider: "Microsoft Entra ID", resource_type: "AppRegistration", status: "ACTIVE", region: "global" }
];

const MOCK_ALERTS = [
  {
    id: "ALT-GCP-8841",
    cloud_provider: "GCP",
    resource_id: "gcp-vm-01",
    resource_name: "gcp-prod-gke-node-1",
    event_type: "v1.compute.instances.stop",
    category: "Compute Lifecycle",
    severity: "CRITICAL",
    status: "OPEN",
    description: "Production VM Instance Stopped Unscheduled",
    actor: "user-admin@company.com",
    source_ip: "198.51.100.45",
    timestamp: new Date().toISOString()
  }
];

export async function fetchMapInstances() {
  try {
    const res = await fetch(`${BASE_URL}/resources/map-instances`);
    if (!res.ok) throw new Error("API error");
    return await res.json();
  } catch (e) {
    return MOCK_INSTANCE_NODES;
  }
}

export async function fetchRegionalHealth() {
  try {
    const res = await fetch(`${BASE_URL}/resources/regional-health`);
    if (!res.ok) throw new Error("API error");
    return await res.json();
  } catch (e) {
    return MOCK_REGIONAL_HEALTH;
  }
}

export async function fetchDashboardStats() {
  try {
    const res = await fetch(`${BASE_URL}/dashboard`);
    if (!res.ok) throw new Error("API Network error");
    return await res.json();
  } catch (e) {
    return MOCK_STATS;
  }
}

export async function fetchResources(filters: Record<string, string> = {}) {
  try {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, val]) => {
      if (val) params.append(key, val);
    });
    const res = await fetch(`${BASE_URL}/resources?${params.toString()}`);
    if (!res.ok) throw new Error("API error");
    return await res.json();
  } catch (e) {
    return MOCK_RESOURCES;
  }
}

export async function fetchResourceDetail(id: string) {
  try {
    const res = await fetch(`${BASE_URL}/resources/${id}`);
    if (!res.ok) throw new Error("API error");
    return await res.json();
  } catch (e) {
    return MOCK_RESOURCES[0];
  }
}

export async function fetchEvents(filters: Record<string, string> = {}) {
  try {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, val]) => {
      if (val) params.append(key, val);
    });
    const res = await fetch(`${BASE_URL}/events?${params.toString()}`);
    if (!res.ok) throw new Error("API error");
    return await res.json();
  } catch (e) {
    return [];
  }
}

export async function createCustomEvent(eventData: any) {
  try {
    const res = await fetch(`${BASE_URL}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(eventData),
    });
    return await res.json();
  } catch (e) {
    return { status: "success", message: "Event created (simulation mode)" };
  }
}

export async function fetchAlerts(filters: Record<string, string> = {}) {
  try {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, val]) => {
      if (val) params.append(key, val);
    });
    const res = await fetch(`${BASE_URL}/alerts?${params.toString()}`);
    if (!res.ok) throw new Error("API error");
    return await res.json();
  } catch (e) {
    return MOCK_ALERTS;
  }
}

export async function fetchAlertDetail(id: string) {
  try {
    const res = await fetch(`${BASE_URL}/alerts/${id}`);
    if (!res.ok) throw new Error("API error");
    return await res.json();
  } catch (e) {
    const alert = MOCK_ALERTS.find(a => a.id === id) || MOCK_ALERTS[0];
    return {
      alert,
      related_events: [{ raw_payload: JSON.stringify(alert, null, 2) }]
    };
  }
}

export async function acknowledgeAlert(id: string) {
  try {
    const res = await fetch(`${BASE_URL}/alerts/${id}/acknowledge`, { method: "PATCH" });
    if (!res.ok) throw new Error("API error");
    return await res.json();
  } catch (e) {
    return { status: "success", alert_id: id, state: "ACKNOWLEDGED" };
  }
}

export async function resolveAlert(id: string) {
  try {
    const res = await fetch(`${BASE_URL}/alerts/${id}/resolve`, { method: "PATCH" });
    if (!res.ok) throw new Error("API error");
    return await res.json();
  } catch (e) {
    return { status: "success", alert_id: id, state: "RESOLVED" };
  }
}

export async function fetchRules() {
  try {
    const res = await fetch(`${BASE_URL}/rules`);
    if (!res.ok) throw new Error("API error");
    return await res.json();
  } catch (e) {
    return [
      { id: "R-01", name: "GCP VM Stop Alert", provider: "GCP", severity: "CRITICAL", active: true },
      { id: "R-02", name: "Huawei CTS Disabled", provider: "Huawei Cloud", severity: "CRITICAL", active: true }
    ];
  }
}

export async function updateRule(id: string, ruleUpdate: any) {
  try {
    const res = await fetch(`${BASE_URL}/rules/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ruleUpdate),
    });
    return await res.json();
  } catch (e) {
    return { status: "success", rule_id: id };
  }
}

export async function fetchAuditLogs(filters: Record<string, string> = {}) {
  try {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, val]) => {
      if (val) params.append(key, val);
    });
    const res = await fetch(`${BASE_URL}/audit-logs?${params.toString()}`);
    if (!res.ok) throw new Error("API error");
    return await res.json();
  } catch (e) {
    return [];
  }
}

export async function fetchNotifications() {
  try {
    const res = await fetch(`${BASE_URL}/notifications`);
    if (!res.ok) throw new Error("API error");
    return await res.json();
  } catch (e) {
    return [];
  }
}

export async function clearNotifications() {
  try {
    const res = await fetch(`${BASE_URL}/notifications`, { method: "DELETE" });
    if (!res.ok) throw new Error("API error");
    return await res.json();
  } catch (e) {
    return { status: "error" };
  }
}

export async function fetchSecurityScore() {
  try {
    const res = await fetch(`${BASE_URL}/security-score`);
    if (!res.ok) throw new Error("API error");
    return await res.json();
  } catch (e) {
    return { score: 40, baseline: 100, active_deductions: [] };
  }
}

export async function triggerRandomEvent() {
  try {
    const res = await fetch(`${BASE_URL}/simulator/random`, { method: "POST" });
    if (!res.ok) throw new Error("API error");
    return await res.json();
  } catch (e) {
    return { status: "success", event_type: "random_simulated_event" };
  }
}

export async function runScenario(scenarioName: string) {
  try {
    const res = await fetch(`${BASE_URL}/simulator/scenario`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenario_name: scenarioName }),
    });
    if (!res.ok) throw new Error("API error");
    return await res.json();
  } catch (e) {
    return { status: "success", scenario: scenarioName };
  }
}

export async function fetchSimulatorConfig() {
  try {
    const res = await fetch(`${BASE_URL}/simulator/config`);
    if (!res.ok) throw new Error("API error");
    return await res.json();
  } catch (e) {
    return { status: "active", interval_seconds: 5, active: true };
  }
}

export async function controlSimulator(action: string, intervalSeconds: number) {
  try {
    const res = await fetch(`${BASE_URL}/simulator/control`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, interval_seconds: intervalSeconds }),
    });
    if (!res.ok) throw new Error("API error");
    return await res.json();
  } catch (e) {
    return { status: "success", action };
  }
}

export async function fetchSMTPConfig() {
  try {
    const res = await fetch(`${BASE_URL}/smtp/config`);
    if (!res.ok) throw new Error("API error");
    return await res.json();
  } catch (e) {
    return { host: "smtp.wisys.internal", port: 587, recipient: "alerts@wisys.sa" };
  }
}

export async function saveSMTPConfig(config: any) {
  try {
    const res = await fetch(`${BASE_URL}/smtp/config`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    if (!res.ok) throw new Error("API error");
    return await res.json();
  } catch (e) {
    return { status: "success" };
  }
}
