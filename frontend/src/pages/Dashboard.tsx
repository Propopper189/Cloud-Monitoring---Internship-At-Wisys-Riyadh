import React from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { Shield, Server, AlertTriangle, Activity, Bell } from "lucide-react";
import type { DashboardStats, Alert } from "../types";

interface DashboardProps {
  stats: DashboardStats | null;
  recentAlerts: Alert[];
  onViewAlert: (alertId: string) => void;
  onNavigate: (tab: string) => void;
}

const COLORS_SEV = {
  CRITICAL: "#ef4444",
  HIGH: "#f97316",
  WARNING: "#eab308",
  INFO: "#06b6d4",
};

const COLORS_STAT = {
  OPEN: "#ef4444",
  ACKNOWLEDGED: "#3b82f6",
  RESOLVED: "#10b981",
};

const COLORS_PROV = {
  GCP: "#4285F4",
  "Huawei Cloud": "#EA4335",
  "Microsoft Entra ID": "#F4B400",
};

export default function Dashboard({ stats, recentAlerts, onViewAlert, onNavigate }: DashboardProps) {
  if (!stats) {
    return <div style={{ color: "var(--text-secondary)" }}>Loading operations data telemetry...</div>;
  }

  // Data formatting for Recharts
  const sevData = Object.entries(stats.alerts_by_severity)
    .map(([name, value]) => ({ name, value }))
    .filter((d) => d.value > 0);

  const provData = Object.entries(stats.alerts_by_provider)
    .map(([name, value]) => ({ name, value }))
    .filter((d) => d.value > 0);

  const statData = Object.entries(stats.alerts_by_status)
    .map(([name, value]) => ({ name, value }))
    .filter((d) => d.value > 0);

  const eventProvData = Object.entries(stats.events_by_provider)
    .map(([name, value]) => ({ name, value }))
    .filter((d) => d.value > 0);

  return (
    <div>
      <div style={{ marginBottom: "20px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "700" }}>Infrastructure Operations & Security Center</h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "13px" }}>Consolidated multi-cloud alerting pipeline monitor</p>
      </div>

      {/* Main Stats Grid */}
      <div className="stats-grid">
        <div className="card" onClick={() => onNavigate("resources")} style={{ cursor: "pointer" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="card-title">Inventory Nodes</span>
            <Server size={18} className="text-ok" />
          </div>
          <div className="card-value">{stats.total_resources}</div>
          <div className="card-desc">Active cloud resources</div>
        </div>

        <div className="card" onClick={() => onNavigate("simulator")} style={{ cursor: "pointer" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="card-title">Ingested Events</span>
            <Activity size={18} className="text-info" />
          </div>
          <div className="card-value">{stats.total_events}</div>
          <div className="card-desc">Normalized audit traces</div>
        </div>

        <div className="card" onClick={() => onNavigate("alerts")} style={{ cursor: "pointer" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="card-title">Total Incidents</span>
            <AlertTriangle size={18} className="text-warning" />
          </div>
          <div className="card-value">{stats.total_alerts}</div>
          <div className="card-desc">{stats.open_alerts} open operational alerts</div>
        </div>

        <div className="card" onClick={() => onNavigate("security-score")} style={{ cursor: "pointer" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="card-title">Compliance Score</span>
            <Shield size={18} style={{ color: stats.security_score >= 90 ? "var(--severity-ok)" : "var(--severity-warning)" }} />
          </div>
          <div className="card-value" style={{ color: stats.security_score >= 90 ? "#10b981" : (stats.security_score >= 70 ? "#f59e0b" : "#ef4444") }}>
            {stats.security_score}/100
          </div>
          <div className="card-desc">CIS posture security rating</div>
        </div>
      </div>

      {/* Cloud summaries */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
        <div className="card" style={{ borderLeft: "4px solid #4285F4" }}>
          <h4 style={{ fontWeight: "700", marginBottom: "12px", color: "#4285F4" }}>Google Cloud Platform (GCP)</h4>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
            <div>Resources: <strong>{stats.gcp_summary.resources}</strong></div>
            <div>Events Logged: <strong>{stats.gcp_summary.events}</strong></div>
            <div>Active Alerts: <strong className="text-critical">{stats.gcp_summary.critical_alerts} Critical</strong></div>
          </div>
        </div>

        <div className="card" style={{ borderLeft: "4px solid #EA4335" }}>
          <h4 style={{ fontWeight: "700", marginBottom: "12px", color: "#EA4335" }}>Huawei Cloud</h4>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
            <div>Resources: <strong>{stats.huawei_summary.resources}</strong></div>
            <div>Events Logged: <strong>{stats.huawei_summary.events}</strong></div>
            <div>Active Alerts: <strong className="text-critical">{stats.huawei_summary.critical_alerts} Critical</strong></div>
          </div>
        </div>
      </div>

      {/* Recharts Diagrams */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" }}>
        {/* Chart 1: Alerts by Severity */}
        <div className="card">
          <div className="card-title" style={{ marginBottom: "16px", fontWeight: "600" }}>Alerts by Severity</div>
          <div style={{ height: "200px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={sevData} cx="50%" cy="50%" outerRadius={60} fill="#8884d8" dataKey="value" label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}>
                  {sevData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS_SEV[entry.name as keyof typeof COLORS_SEV] || "#8884d8"} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Alerts by Provider */}
        <div className="card">
          <div className="card-title" style={{ marginBottom: "16px", fontWeight: "600" }}>Incidents by Cloud Provider</div>
          <div style={{ height: "200px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={provData}>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155" }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {provData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS_PROV[entry.name as keyof typeof COLORS_PROV] || "#8884d8"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Alert Status */}
        <div className="card">
          <div className="card-title" style={{ marginBottom: "16px", fontWeight: "600" }}>Alert Status Distribution</div>
          <div style={{ height: "200px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} fill="#8884d8" dataKey="value" label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}>
                  {statData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS_STAT[entry.name as keyof typeof COLORS_STAT] || "#8884d8"} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Events by Provider */}
        <div className="card">
          <div className="card-title" style={{ marginBottom: "16px", fontWeight: "600" }}>Ingested Logs by Cloud Provider</div>
          <div style={{ height: "200px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={eventProvData}>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155" }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {eventProvData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS_PROV[entry.name as keyof typeof COLORS_PROV] || "#8884d8"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Alerts Table */}
      <div className="card">
        <div className="panel-header">
          <h3 className="panel-title">Active Security & Operational Incidents</h3>
          <span style={{ fontSize: "12px", color: "var(--text-secondary)", cursor: "pointer" }} onClick={() => onNavigate("alerts")}>
            View All Alerts &rarr;
          </span>
        </div>
        <div className="table-container">
          {recentAlerts.length === 0 ? (
            <div style={{ padding: "20px", textAlign: "center", color: "var(--text-secondary)" }}>
              No active security incidents detected. System secure.
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Alert ID</th>
                  <th>Cloud Provider</th>
                  <th>Resource</th>
                  <th>Category</th>
                  <th>Severity</th>
                  <th>Trigger Event</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentAlerts.slice(0, 5).map((alert) => (
                  <tr key={alert.id}>
                    <td><strong style={{ fontFamily: "monospace" }}>{alert.id}</strong></td>
                    <td>
                      <span className="badge" style={{ borderColor: alert.cloud_provider === "GCP" ? "#4285F4" : "#EA4335", color: alert.cloud_provider === "GCP" ? "#4285F4" : "#EA4335" }}>
                        {alert.cloud_provider}
                      </span>
                    </td>
                    <td>{alert.resource_name}</td>
                    <td>{alert.category}</td>
                    <td>
                      <span className={`badge badge-${alert.severity.toLowerCase()}`}>
                        {alert.severity}
                      </span>
                    </td>
                    <td>{alert.event_type}</td>
                    <td>
                      <span className="badge" style={{
                        borderColor: alert.status === "OPEN" ? "var(--severity-critical)" : "var(--severity-info)",
                        color: alert.status === "OPEN" ? "var(--severity-critical)" : "var(--severity-info)"
                      }}>
                        {alert.status}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-secondary" style={{ padding: "4px 8px", fontSize: "11px" }} onClick={() => onViewAlert(alert.id)}>
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
