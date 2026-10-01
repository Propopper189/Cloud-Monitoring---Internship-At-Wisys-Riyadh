import React, { useState } from "react";
import { Shield, User, Clock, Network, AlertOctagon, CheckCircle2 } from "lucide-react";
import type { Alert, AlertDetailResponse } from "../types";
import { fetchAlertDetail, acknowledgeAlert, resolveAlert } from "../services/api";

interface AlertsProps {
  alerts: Alert[];
  onFilterChange: (filters: Record<string, string>) => void;
  onRefresh: () => void;
}

export default function Alerts({ alerts, onFilterChange, onRefresh }: AlertsProps) {
  const [filters, setFilters] = useState({
    severity: "",
    cloud_provider: "",
    status: "",
    search: "",
  });

  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [alertDetail, setAlertDetail] = useState<AlertDetailResponse | null>(null);

  const handleFilterChange = (key: string, value: string) => {
    const updated = { ...filters, [key]: value };
    setFilters(updated);
    onFilterChange(updated);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFilterChange("search", e.target.value);
  };

  const handleInspect = async (alert: Alert) => {
    setSelectedAlert(alert);
    setAlertDetail(null);
    try {
      const data = await fetchAlertDetail(alert.id);
      setAlertDetail(data);
    } catch (err) {
      console.error("Failed to load alert details", err);
    }
  };

  const handleAcknowledge = async (id: string) => {
    try {
      await acknowledgeAlert(id);
      onRefresh();
      // Reload details if open
      if (selectedAlert && selectedAlert.id === id) {
        const data = await fetchAlertDetail(id);
        setAlertDetail(data);
        setSelectedAlert(data.alert);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleResolve = async (id: string) => {
    try {
      await resolveAlert(id);
      onRefresh();
      // Close/reload details
      if (selectedAlert && selectedAlert.id === id) {
        const data = await fetchAlertDetail(id);
        setAlertDetail(data);
        setSelectedAlert(data.alert);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: "20px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "700" }}>Security Incident Alerts Console</h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "13px" }}>Actionable alarms matched by the security rule engine</p>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div style={{ flex: 1, minWidth: "200px" }}>
          <input type="text" placeholder="Search by resource, actor, description..." className="filter-input" style={{ width: "100%" }} value={filters.search} onChange={handleSearchChange} />
        </div>

        <select className="filter-input" value={filters.severity} onChange={(e) => handleFilterChange("severity", e.target.value)}>
          <option value="">All Severities</option>
          <option value="CRITICAL">CRITICAL</option>
          <option value="HIGH">HIGH</option>
          <option value="WARNING">WARNING</option>
          <option value="INFO">INFO</option>
        </select>

        <select className="filter-input" value={filters.cloud_provider} onChange={(e) => handleFilterChange("cloud_provider", e.target.value)}>
          <option value="">All Providers</option>
          <option value="GCP">GCP</option>
          <option value="Huawei Cloud">Huawei Cloud</option>
          <option value="Microsoft Entra ID">Microsoft Entra ID</option>
        </select>

        <select className="filter-input" value={filters.status} onChange={(e) => handleFilterChange("status", e.target.value)}>
          <option value="">All Statuses</option>
          <option value="OPEN">OPEN</option>
          <option value="ACKNOWLEDGED">ACKNOWLEDGED</option>
          <option value="RESOLVED">RESOLVED</option>
        </select>
      </div>

      {/* Alerts Table */}
      <div className="card">
        <div className="table-container">
          {alerts.length === 0 ? (
            <div style={{ padding: "20px", textAlign: "center", color: "var(--text-secondary)" }}>
              No alerts found matching the active filters.
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Alert ID</th>
                  <th>Cloud Provider</th>
                  <th>Category</th>
                  <th>Severity</th>
                  <th>Resource</th>
                  <th>Event Type</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((alert) => (
                  <tr key={alert.id}>
                    <td><strong style={{ fontFamily: "monospace" }}>{alert.id}</strong></td>
                    <td>
                      <span className="badge" style={{
                        borderColor: alert.cloud_provider === "GCP" ? "#4285F4" : (alert.cloud_provider === "Huawei Cloud" ? "#EA4335" : "#F4B400"),
                        color: alert.cloud_provider === "GCP" ? "#4285F4" : (alert.cloud_provider === "Huawei Cloud" ? "#EA4335" : "#F4B400")
                      }}>
                        {alert.cloud_provider}
                      </span>
                    </td>
                    <td>{alert.category}</td>
                    <td>
                      <span className={`badge badge-${alert.severity.toLowerCase()}`}>
                        {alert.severity}
                      </span>
                    </td>
                    <td>{alert.resource_name}</td>
                    <td>{alert.event_type}</td>
                    <td>{alert.description}</td>
                    <td>
                      <span className="badge" style={{
                        borderColor: alert.status === "OPEN" ? "var(--severity-critical)" : (alert.status === "ACKNOWLEDGED" ? "#3b82f6" : "var(--severity-ok)"),
                        color: alert.status === "OPEN" ? "var(--severity-critical)" : (alert.status === "ACKNOWLEDGED" ? "#3b82f6" : "var(--severity-ok)"),
                        backgroundColor: alert.status === "OPEN" ? "var(--bg-critical)" : (alert.status === "ACKNOWLEDGED" ? "rgba(59, 130, 246, 0.1)" : "var(--bg-ok)")
                      }}>
                        {alert.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button className="btn btn-secondary" style={{ padding: "4px 8px", fontSize: "11px" }} onClick={() => handleInspect(alert)}>
                          Inspect
                        </button>
                        {alert.status === "OPEN" && (
                          <button className="btn" style={{ padding: "4px 8px", fontSize: "11px", backgroundColor: "#3b82f6", color: "#fff" }} onClick={() => handleAcknowledge(alert.id)}>
                            Acknowledge
                          </button>
                        )}
                        {alert.status !== "RESOLVED" && (
                          <button className="btn" style={{ padding: "4px 8px", fontSize: "11px", backgroundColor: "#10b981", color: "#fff" }} onClick={() => handleResolve(alert.id)}>
                            Resolve
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Inspect Modal */}
      {selectedAlert && (
        <div className="modal-overlay" onClick={() => setSelectedAlert(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Incident Investigation Inspector</h3>
              <button className="modal-close" onClick={() => setSelectedAlert(null)}>&times;</button>
            </div>
            
            <div className="modal-body">
              {!alertDetail ? (
                <div style={{ color: "var(--text-secondary)" }}>Loading log history, audit trails, and raw payload...</div>
              ) : (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <AlertOctagon size={24} className="text-critical" />
                      <div>
                        <h4 style={{ fontWeight: "700" }}>{alertDetail.alert.description}</h4>
                        <span style={{ fontSize: "11px", color: "var(--text-secondary)", fontFamily: "monospace" }}>Incident Ticket: {alertDetail.alert.id}</span>
                      </div>
                    </div>
                    <span className={`badge badge-${alertDetail.alert.severity.toLowerCase()}`}>
                      {alertDetail.alert.severity}
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
                    <div className="card">
                      <h5 style={{ fontWeight: "600", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "12px" }}>Incident Context</h5>
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <div style={{ display: "flex", gap: "8px", alignItems: "center", fontSize: "13px" }}><Clock size={14} /> <strong>Trigger Time:</strong> {new Date(alertDetail.alert.timestamp).toLocaleString()}</div>
                        <div style={{ display: "flex", gap: "8px", alignItems: "center", fontSize: "13px" }}><Network size={14} /> <strong>Provider:</strong> {alertDetail.alert.cloud_provider}</div>
                        <div style={{ display: "flex", gap: "8px", alignItems: "center", fontSize: "13px" }}><User size={14} /> <strong>User Actor:</strong> {alertDetail.alert.actor}</div>
                        <div style={{ display: "flex", gap: "8px", alignItems: "center", fontSize: "13px" }}><Shield size={14} /> <strong>Source Caller IP:</strong> {alertDetail.alert.source_ip}</div>
                      </div>
                    </div>

                    <div className="card">
                      <h5 style={{ fontWeight: "600", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "12px" }}>Resolution Operations</h5>
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px" }}>
                        <div><strong>Incident Lifecycle Status:</strong> <span className="badge badge-critical">{alertDetail.alert.status}</span></div>
                        {alertDetail.alert.acknowledged_at && (
                          <div>Acknowledged by: <strong>{alertDetail.alert.acknowledged_by}</strong> at {new Date(alertDetail.alert.acknowledged_at).toLocaleTimeString()}</div>
                        )}
                        {alertDetail.alert.resolved_at && (
                          <div>Resolved by: <strong>{alertDetail.alert.resolved_by}</strong> at {new Date(alertDetail.alert.resolved_at).toLocaleTimeString()}</div>
                        )}
                        
                        <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                          {alertDetail.alert.status === "OPEN" && (
                            <button className="btn" style={{ padding: "6px 12px", fontSize: "12px", backgroundColor: "#3b82f6", color: "#fff" }} onClick={() => handleAcknowledge(alertDetail.alert.id)}>
                              Acknowledge Ticket
                            </button>
                          )}
                          {alertDetail.alert.status !== "RESOLVED" && (
                            <button className="btn" style={{ padding: "6px 12px", fontSize: "12px", backgroundColor: "#10b981", color: "#fff" }} onClick={() => handleResolve(alertDetail.alert.id)}>
                              Resolve Incident
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Alert Lifecycle Timeline */}
                  <div className="card" style={{ marginBottom: "24px" }}>
                    <h5 style={{ fontWeight: "600", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "12px" }}>Incident Lifecycle Timeline</h5>
                    <div className="timeline">
                      <div className="timeline-item">
                        <div className="timeline-dot active"></div>
                        <div className="timeline-time">{new Date(alertDetail.alert.timestamp).toLocaleTimeString()}</div>
                        <div className="timeline-text">Cloud trace matching. Normalized event registered in audit logs.</div>
                      </div>
                      <div className="timeline-item">
                        <div className="timeline-dot active"></div>
                        <div className="timeline-time">{new Date(alertDetail.alert.timestamp).toLocaleTimeString()}</div>
                        <div className="timeline-text">Security rule policy engine triggered. Severity marked: {alertDetail.alert.severity}.</div>
                      </div>
                      {alertDetail.alert.severity === "CRITICAL" || alertDetail.alert.severity === "HIGH" ? (
                        <div className="timeline-item">
                          <div className="timeline-dot active"></div>
                          <div className="timeline-time">{new Date(alertDetail.alert.timestamp).toLocaleTimeString()}</div>
                          <div className="timeline-text">Alert Notification dispatched to operator mailbox.</div>
                        </div>
                      ) : null}
                      {alertDetail.alert.acknowledged_at && (
                        <div className="timeline-item">
                          <div className="timeline-dot active" style={{ backgroundColor: "#3b82f6" }}></div>
                          <div className="timeline-time">{new Date(alertDetail.alert.acknowledged_at).toLocaleTimeString()}</div>
                          <div className="timeline-text">Operator acknowledged incident. Threat compliance reduction mitigated by 50%.</div>
                        </div>
                      )}
                      {alertDetail.alert.resolved_at && (
                        <div className="timeline-item">
                          <div className="timeline-dot active" style={{ backgroundColor: "#10b981" }}></div>
                          <div className="timeline-time">{new Date(alertDetail.alert.resolved_at).toLocaleTimeString()}</div>
                          <div className="timeline-text">Incident resolved. Security compliance baseline restored.</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Raw payload inspector */}
                  {alertDetail.related_events.length > 0 && alertDetail.related_events[0].raw_payload && (
                    <div>
                      <h5 style={{ fontWeight: "600", fontSize: "12px", color: "var(--text-secondary)" }}>Raw Cloud Log (JSON Payload)</h5>
                      <pre>{alertDetail.related_events[0].raw_payload}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedAlert(null)}>Close Inspector</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
