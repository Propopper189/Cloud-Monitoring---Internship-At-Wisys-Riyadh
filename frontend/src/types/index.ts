export interface Resource {
  id: string;
  name: string;
  cloud_provider: string;
  region: string;
  resource_type: string;
  status: string;
  risk_level: string;
  details_json?: string;
  last_monitored: string;
  created_at: string;
}

export interface CloudEvent {
  id: string;
  timestamp: string;
  cloud_provider: string;
  account_id?: string;
  project_id?: string;
  region: string;
  resource_id: string;
  resource_name: string;
  resource_type: string;
  event_type: string;
  actor: string;
  source_ip: string;
  severity: string;
  description: string;
  raw_payload?: string;
}

export interface Alert {
  id: string;
  timestamp: string;
  cloud_provider: string;
  category: string;
  event_type: string;
  resource_id: string;
  resource_name: string;
  severity: string;
  actor: string;
  source_ip: string;
  description: string;
  status: string;
  rule_id?: string;
  acknowledged_at?: string;
  resolved_at?: string;
  acknowledged_by?: string;
  resolved_by?: string;
}

export interface Rule {
  id: string;
  name: string;
  event_type: string;
  severity: string;
  description: string;
  enabled: boolean;
  cloud_provider: string;
}

export interface AuditLog {
  id: number;
  timestamp: string;
  actor: string;
  source_ip: string;
  action: string;
  resource: string;
  cloud_provider: string;
  result: string;
}

export interface Notification {
  id: string;
  alert_id: string;
  recipient: string;
  subject: string;
  message: string;
  timestamp: string;
  status: string;
}

export interface SecurityCheck {
  id: string;
  name: string;
  category: string;
  status: string;
  description: string;
  points_deducted: number;
  explanation?: string;
}

export interface SecurityScoreData {
  score: number;
  passed_checks: SecurityCheck[];
  warning_checks: SecurityCheck[];
  failed_checks: SecurityCheck[];
}

export interface RegionalHealthItem {
  region: string;
  display_name: string;
  cloud_provider: string;
  latitude: number;
  longitude: number;
  total_resources: number;
  healthy_count: number;
  unhealthy_count: number;
  active_alerts_count: number;
  status: "HEALTHY" | "UNHEALTHY";
  resources: Array<{
    id: string;
    name: string;
    resource_type: string;
    status: string;
    health: string;
    cloud_provider: string;
  }>;
}

export interface InstanceMapNode {
  id: string;
  name: string;
  cloud_provider: string;
  resource_type: string;
  region: string;
  status: string;
  health: "HEALTHY" | "UNHEALTHY";
  latitude: number;
  longitude: number;
  active_alert?: string;
}

export interface DashboardStats {
  total_resources: number;
  total_events: number;
  total_alerts: number;
  critical_alerts: number;
  high_alerts: number;
  warning_alerts: number;
  open_alerts: number;
  acknowledged_alerts: number;
  resolved_alerts: number;
  security_score: number;
  gcp_summary: {
    resources: number;
    events: number;
    alerts: number;
    critical_alerts: number;
  };
  huawei_summary: {
    resources: number;
    events: number;
    alerts: number;
    critical_alerts: number;
  };
  alerts_by_severity: Record<string, number>;
  alerts_by_provider: Record<string, number>;
  alerts_by_category: Record<string, number>;
  alerts_by_status: Record<string, number>;
  events_by_provider: Record<string, number>;
  regional_health?: RegionalHealthItem[];
  instance_nodes?: InstanceMapNode[];
}

export interface AlertDetailResponse {
  alert: Alert;
  related_events: CloudEvent[];
  related_audit_logs: AuditLog[];
}
