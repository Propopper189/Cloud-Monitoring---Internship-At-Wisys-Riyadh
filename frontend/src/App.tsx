import React, { useState, useEffect } from "react";
import { Play, Pause, RefreshCw, AlertTriangle, Shield, CheckCircle2 } from "lucide-react";

import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Resources from "./pages/Resources";
import Alerts from "./pages/Alerts";
import EventSimulator from "./pages/EventSimulator";
import Rules from "./pages/Rules";
import AuditLogs from "./pages/AuditLogs";
import SecurityScore from "./pages/SecurityScore";
import Notifications from "./pages/Notifications";

import { 
  fetchDashboardStats, 
  fetchResources, 
  fetchAlerts, 
  fetchRules, 
  fetchAuditLogs, 
  fetchNotifications, 
  fetchSecurityScore, 
  fetchSimulatorConfig,
  fetchAlertDetail,
  acknowledgeAlert,
  resolveAlert
} from "./services/api";

import type { DashboardStats, Resource, Alert, Rule, AuditLog, Notification, SecurityScoreData, AlertDetailResponse } from "./types";

export default function App() {
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  
  // Data States
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [scoreData, setScoreData] = useState<SecurityScoreData | null>(null);
  const [simConfig, setSimConfig] = useState<{ status: string; interval_seconds: number; active: boolean } | null>(null);
  
  // Global Alert Inspector State
  const [globalInspectId, setGlobalInspectId] = useState<string | null>(null);
  const [inspectDetail, setInspectDetail] = useState<AlertDetailResponse | null>(null);

  const loadData = async () => {
    try {
      const [
        statsData, 
        resourcesData, 
        alertsData, 
        rulesData, 
        auditData, 
        notifData, 
        scoreDataRes, 
        simConfigRes
      ] = await Promise.all([
        fetchDashboardStats(),
        fetchResources(),
        fetchAlerts(),
        fetchRules(),
        fetchAuditLogs(),
        fetchNotifications(),
        fetchSecurityScore(),
        fetchSimulatorConfig()
      ]);

      setStats(statsData);
      setResources(resourcesData);
      setAlerts(alertsData);
      setRules(rulesData);
      setAuditLogs(auditData);
      setNotifications(notifData);
      setScoreData(scoreDataRes);
      setSimConfig(simConfigRes);
    } catch (err) {
      console.error("Failed to sync client data", err);
    }
  };

  // Poll dashboard, alerts, score, and resources every 3 seconds for real-time dashboard feel
  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      loadData();
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleGlobalInspect = async (alertId: string) => {
    setGlobalInspectId(alertId);
    setInspectDetail(null);
    try {
      const data = await fetchAlertDetail(alertId);
      setInspectDetail(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAcknowledgeGlobal = async (id: string) => {
    try {
      await acknowledgeAlert(id);
      loadData();
      if (globalInspectId === id) {
        const data = await fetchAlertDetail(id);
        setInspectDetail(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleResolveGlobal = async (id: string) => {
    try {
      await resolveAlert(id);
      loadData();
      if (globalInspectId === id) {
        const data = await fetchAlertDetail(id);
        setInspectDetail(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Helper to switch tab and open inspector
  const handleDashboardAlertClick = (alertId: string) => {
    setActiveTab("alerts");
    handleGlobalInspect(alertId);
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <Dashboard 
            stats={stats} 
            recentAlerts={alerts.filter(a => a.status !== "RESOLVED")} 
            onViewAlert={handleDashboardAlertClick} 
            onNavigate={setActiveTab} 
          />
        );
      case "resources":
        return (
          <Resources 
            resources={resources} 
            onFilterChange={async (filters) => {
              const res = await fetchResources(filters);
              setResources(res);
            }} 
          />
        );
      case "alerts":
        return (
          <Alerts 
            alerts={alerts} 
            onFilterChange={async (filters) => {
              const res = await fetchAlerts(filters);
              setAlerts(res);
            }} 
            onRefresh={loadData} 
          />
        );
      case "simulator":
        return (
          <EventSimulator 
            simulatorConfig={simConfig} 
            onRefresh={loadData} 
          />
        );
      case "rules":
        return (
          <Rules 
            rules={rules} 
            onRefresh={loadData} 
          />
        );
      case "audit-logs":
        return (
          <AuditLogs 
            auditLogs={auditLogs} 
            onFilterChange={async (filters) => {
              const logs = await fetchAuditLogs(filters);
              setAuditLogs(logs);
            }} 
          />
        );
      case "security-score":
        return <SecurityScore scoreData={scoreData} />;
      case "notifications":
        return <Notifications notifications={notifications} />;
      default:
        return <Dashboard stats={stats} recentAlerts={alerts} onViewAlert={handleDashboardAlertClick} onNavigate={setActiveTab} />;
    }
  };

  return (
    <div className="app-container">
      <Sidebar 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        openAlertsCount={alerts.filter(a => a.status === "OPEN").length} 
        securityScore={scoreData?.score || 100} 
      />
      
      <main className="content-panel">
        <header className="top-header">
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "14px", fontWeight: "600", textTransform: "capitalize" }}>
              Console / {activeTab.replace("-", " ")}
            </span>
            {simConfig?.active && (
              <span className="badge badge-ok" style={{ display: "flex", alignItems: "center", gap: "4px", padding: "2px 6px", fontSize: "10px" }}>
                <span className="simulator-pulse" style={{
                  width: "6px",
                  height: "6px",
                  backgroundColor: "var(--severity-ok)",
                  borderRadius: "50%",
                  display: "inline-block"
                }}></span>
                SIMULATOR ACTIVE
              </span>
            )}
          </div>
          <div className="academic-banner">
            Academic Simulation Environment
          </div>
        </header>
        
        <div className="main-content">
          {renderActiveTab()}
        </div>
      </main>

      {/* Global Alert Inspector Modal (Renders if globalInspectId is active) */}
      {globalInspectId && (
        <div className="modal-overlay" onClick={() => setGlobalInspectId(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Incident Investigation Inspector</h3>
              <button className="modal-close" onClick={() => setGlobalInspectId(null)}>&times;</button>
            </div>
            
            <div className="modal-body">
              {!inspectDetail ? (
                <div style={{ color: "var(--text-secondary)" }}>Loading log history, audit trails, and raw payload...</div>
              ) : (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <span className={`badge badge-${inspectDetail.alert.severity.toLowerCase()}`} style={{ fontSize: "12px" }}>
                        {inspectDetail.alert.severity}
                      </span>
                      <div>
                        <h4 style={{ fontWeight: "700", fontSize: "16px" }}>{inspectDetail.alert.description}</h4>
                        <span style={{ fontSize: "11px", color: "var(--text-secondary)", fontFamily: "monospace" }}>Incident ID: {inspectDetail.alert.id}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
                    <div className="card">
                      <h5 style={{ fontWeight: "600", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "10px" }}>Context Attributes</h5>
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px" }}>
                        <div><strong>Timestamp:</strong> {new Date(inspectDetail.alert.timestamp).toLocaleString()}</div>
                        <div><strong>Cloud Tenant:</strong> {inspectDetail.alert.cloud_provider}</div>
                        <div><strong>User Actor:</strong> {inspectDetail.alert.actor}</div>
                        <div><strong>Source Host IP:</strong> {inspectDetail.alert.source_ip}</div>
                      </div>
                    </div>

                    <div className="card">
                      <h5 style={{ fontWeight: "600", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "10px" }}>Operations Center</h5>
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px" }}>
                        <div><strong>Incident State:</strong> <span className={`badge badge-${inspectDetail.alert.status.toLowerCase()}`}>{inspectDetail.alert.status}</span></div>
                        {inspectDetail.alert.acknowledged_at && (
                          <div>Ack By: <strong>{inspectDetail.alert.acknowledged_by}</strong></div>
                        )}
                        {inspectDetail.alert.resolved_at && (
                          <div>Resolved By: <strong>{inspectDetail.alert.resolved_by}</strong></div>
                        )}
                        <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                          {inspectDetail.alert.status === "OPEN" && (
                            <button className="btn" style={{ padding: "4px 8px", fontSize: "11px", backgroundColor: "#3b82f6", color: "#fff" }} onClick={() => handleAcknowledgeGlobal(inspectDetail.alert.id)}>
                              Acknowledge
                            </button>
                          )}
                          {inspectDetail.alert.status !== "RESOLVED" && (
                            <button className="btn" style={{ padding: "4px 8px", fontSize: "11px", backgroundColor: "#10b981", color: "#fff" }} onClick={() => handleResolveGlobal(inspectDetail.alert.id)}>
                              Resolve
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="card" style={{ marginBottom: "20px" }}>
                    <h5 style={{ fontWeight: "600", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "10px" }}>Incident Lifecycle Timeline</h5>
                    <div className="timeline">
                      <div className="timeline-item">
                        <div className="timeline-dot active"></div>
                        <div className="timeline-time">{new Date(inspectDetail.alert.timestamp).toLocaleTimeString()}</div>
                        <div className="timeline-text">Cloud trace matching. Normalized event registered in audit logs.</div>
                      </div>
                      <div className="timeline-item">
                        <div className="timeline-dot active"></div>
                        <div className="timeline-time">{new Date(inspectDetail.alert.timestamp).toLocaleTimeString()}</div>
                        <div className="timeline-text">Security rule policy engine triggered. Severity marked: {inspectDetail.alert.severity}.</div>
                      </div>
                      {inspectDetail.alert.severity === "CRITICAL" || inspectDetail.alert.severity === "HIGH" ? (
                        <div className="timeline-item">
                          <div className="timeline-dot active"></div>
                          <div className="timeline-time">{new Date(inspectDetail.alert.timestamp).toLocaleTimeString()}</div>
                          <div className="timeline-text">Alert Notification dispatched to operator mailbox.</div>
                        </div>
                      ) : null}
                      {inspectDetail.alert.acknowledged_at && (
                        <div className="timeline-item">
                          <div className="timeline-dot active" style={{ backgroundColor: "#3b82f6" }}></div>
                          <div className="timeline-time">{new Date(inspectDetail.alert.acknowledged_at).toLocaleTimeString()}</div>
                          <div className="timeline-text">Operator acknowledged incident. Threat compliance reduction mitigated by 50%.</div>
                        </div>
                      )}
                      {inspectDetail.alert.resolved_at && (
                        <div className="timeline-item">
                          <div className="timeline-dot active" style={{ backgroundColor: "#10b981" }}></div>
                          <div className="timeline-time">{new Date(inspectDetail.alert.resolved_at).toLocaleTimeString()}</div>
                          <div className="timeline-text">Incident resolved. Security compliance baseline restored.</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {inspectDetail.related_events.length > 0 && inspectDetail.related_events[0].raw_payload && (
                    <div>
                      <h5 style={{ fontWeight: "600", fontSize: "12px", color: "var(--text-secondary)" }}>Raw Cloud Log (JSON Payload)</h5>
                      <pre>{inspectDetail.related_events[0].raw_payload}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setGlobalInspectId(null)}>Close Inspector</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
