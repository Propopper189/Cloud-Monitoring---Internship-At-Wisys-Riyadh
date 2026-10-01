import React from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { Shield, Server, AlertTriangle, Activity, Globe, Cpu, Layers } from "lucide-react";
import type { DashboardStats, Alert } from "../types";
import RegionalDeploymentMap from "../components/RegionalDeploymentMap";

interface DashboardProps {
  stats: DashboardStats | null;
  recentAlerts: Alert[];
  onViewAlert: (alertId: string) => void;
  onNavigate: (tab: string) => void;
}

export default function Dashboard({ stats, recentAlerts, onViewAlert, onNavigate }: DashboardProps) {
  // Fallback defaults matching backend SQLite telemetry
  const totalResources = stats?.total_resources || 41;
  const totalEventsFormatted = stats ? `${(stats.total_events / 1000).toFixed(0)}K` : "3,100K";
  const totalIncidents = stats?.total_alerts || 1890;
  const compScore = stats?.security_score !== undefined ? stats.security_score : 40;

  // Mathematically calculated Needle coordinates for Compliance Score Meter (100% Synced)
  const angleRad = Math.PI - (Math.min(100, Math.max(0, compScore)) / 100) * Math.PI;
  const needleRadius = 26;
  const needleX = 45 - needleRadius * Math.cos(angleRad);
  const needleY = 40 - needleRadius * Math.sin(angleRad);

  // Data for Charts
  const provBarData = [
    { name: "GCP", incidents: stats?.gcp_summary?.critical_alerts ? stats.gcp_summary.critical_alerts * 15 : 105, logs: "1.6 logs" },
    { name: "Huawei", incidents: stats?.huawei_summary?.critical_alerts ? stats.huawei_summary.critical_alerts * 12 : 72, logs: "5.8 logs" },
    { name: "Microsoft Entra ID", incidents: 34, logs: "4.4 logs" },
    { name: "Azure", incidents: 76, logs: "1.5 logs" },
    { name: "AWS", incidents: 53, logs: "1.0M logs" }
  ];

  const provLogData = [
    { name: "GCP", val: 1.6, fill: "#38BDF8" },
    { name: "Azure", val: 1.5, fill: "#0284C7" },
    { name: "AWS", val: 1.0, fill: "#F59E0B" },
    { name: "Huawei", val: 5.8, fill: "#EF4444" },
    { name: "Entra ID", val: 4.4, fill: "#A855F7" }
  ];

  const ringData1 = [
    { name: "New (Critical)", value: 35, color: "#FF4D4D" },
    { name: "Investigating", value: 25, color: "#FF8800" },
    { name: "False Positive", value: 20, color: "#10B981" },
    { name: "Resolved", value: 20, color: "#38BDF8" }
  ];

  const ringData2 = [
    { name: "New (Critical)", value: 15, color: "#FF4D4D" },
    { name: "Investigating", value: 23, color: "#FF8800" },
    { name: "False Positive", value: 20, color: "#10B981" },
    { name: "Resolved", value: 42, color: "#38BDF8" }
  ];

  return (
    <div className="dashboard-view">
      {/* ROW 1: TOP 4 KPI CARDS */}
      <div className="grid-4-col">
        {/* Card 1: Inventory Nodes */}
        <div className="card" onClick={() => onNavigate("resources")} style={{ cursor: "pointer" }}>
          <div className="card-header">
            <span className="card-title">INVENTORY NODES</span>
            <Layers size={18} style={{ color: "#10B981" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div className="card-value">{totalResources}</div>
            <svg width="80" height="28" viewBox="0 0 80 28">
              <path d="M 0 20 Q 20 5 40 22 T 80 10" fill="none" stroke="#10B981" strokeWidth="2.5" />
              <circle cx="80" cy="10" r="3.5" fill="#10B981" />
            </svg>
          </div>
          <div className="card-subtitle">
            <span>
              <strong style={{ color: "#38BDF8" }}>GCP: 22</strong>, <strong style={{ color: "#FF4D4D" }}>Huawei: 18</strong>, <strong style={{ color: "#FACC15" }}>Entra ID: 1</strong>
            </span>
          </div>
        </div>

        {/* Card 2: Ingested Events */}
        <div className="card" onClick={() => onNavigate("simulator")} style={{ cursor: "pointer" }}>
          <div className="card-header">
            <span className="card-title">INGESTED EVENTS</span>
            <Activity size={18} style={{ color: "#00F0FF" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div className="card-value">{totalEventsFormatted}</div>
            <svg width="80" height="28" viewBox="0 0 80 28">
              <path d="M 0 18 Q 15 25 30 10 T 60 20 T 80 5" fill="none" stroke="#00F0FF" strokeWidth="2.5" />
              <circle cx="80" cy="5" r="3.5" fill="#00F0FF" />
            </svg>
          </div>
          <div className="card-subtitle">
            <span>Avg: <strong style={{ color: "#10B981" }}>3.1M/day</strong> | Peak: 4.2M</span>
            <span style={{ color: "var(--text-muted)" }}>Last 24h</span>
          </div>
        </div>

        {/* Card 3: Total Incidents */}
        <div className="card" onClick={() => onNavigate("alerts")} style={{ cursor: "pointer" }}>
          <div className="card-header">
            <span className="card-title">TOTAL INCIDENTS</span>
            <AlertTriangle size={18} style={{ color: "#FF8800" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div className="card-value">{totalIncidents.toLocaleString()}</div>
            <svg width="80" height="28" viewBox="0 0 80 28">
              <rect x="5" y="16" width="6" height="12" fill="#FF4D4D" rx="1" />
              <rect x="18" y="12" width="6" height="16" fill="#FF8800" rx="1" />
              <rect x="31" y="8" width="6" height="20" fill="#FF4D4D" rx="1" />
              <rect x="44" y="4" width="6" height="24" fill="#FF4D4D" rx="1" />
              <rect x="57" y="14" width="6" height="14" fill="#FF8800" rx="1" />
              <rect x="70" y="10" width="6" height="18" fill="#FF4D4D" rx="1" />
            </svg>
          </div>
          <div className="card-subtitle">
            <span><strong style={{ color: "#FF4D4D" }}>14 Critical</strong> | <strong style={{ color: "#FF8800" }}>45 High</strong></span>
            <span style={{ color: "var(--text-muted)" }}>Last hour</span>
          </div>
        </div>

        {/* Card 4: Compliance Score Gauge (Fully Synced Meter) */}
        <div className="card" onClick={() => onNavigate("security-score")} style={{ cursor: "pointer" }}>
          <div className="card-header">
            <span className="card-title">COMPLIANCE SCORE</span>
            <Shield size={18} style={{ color: compScore >= 80 ? "#10B981" : "#FF8800" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div className="card-value" style={{ color: compScore >= 80 ? "#10B981" : (compScore >= 60 ? "#FACC15" : "#FF4D4D") }}>
              {compScore}/100
            </div>
            {/* Synced Semi-circle Gauge SVG with Dynamic Needle Angle */}
            <svg width="90" height="45" viewBox="0 0 90 45">
              <path d="M 10 40 A 35 35 0 0 1 80 40" fill="none" stroke="#1E293B" strokeWidth="8" strokeLinecap="round" />
              <path 
                d="M 10 40 A 35 35 0 0 1 80 40" 
                fill="none" 
                stroke="url(#scoreGradient)" 
                strokeWidth="8" 
                strokeLinecap="round" 
                strokeDasharray="110" 
                strokeDashoffset={110 - (110 * compScore) / 100} 
                style={{ transition: "stroke-dashoffset 0.5s ease" }}
              />
              <defs>
                <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#FF4D4D" />
                  <stop offset="50%" stopColor="#FACC15" />
                  <stop offset="100%" stopColor="#10B981" />
                </linearGradient>
              </defs>
              {/* Dynamic Needle Line Synced to compScore */}
              <line 
                x1="45" 
                y1="40" 
                x2={needleX} 
                y2={needleY} 
                stroke="#FFFFFF" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                style={{ transition: "all 0.5s ease" }}
              />
              <circle cx="45" cy="40" r="3" fill="#FFFFFF" />
            </svg>
          </div>
          <div className="card-subtitle">
            <span>GIS Benchmarks ({compScore}%/100)</span>
            <span style={{ color: "var(--text-muted)" }}>BICT simulation</span>
          </div>
        </div>
      </div>

      {/* ROW 2: CLOUD PROVIDER STATUS CARDS (4 CARDS) */}
      <div className="grid-4-col">
        {/* Provider 1: GCP */}
        <div className="provider-card" style={{ borderLeft: "3px solid #38BDF8" }}>
          <div className="provider-header">
            <div className="provider-title">
              <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#38BDF8", display: "inline-block" }}></span>
              GCP (Multi-Cloud Core)
            </div>
            <span className="status-badge status-badge-green">Health ●</span>
          </div>
          <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginBottom: "4px" }}>Resources: 22</div>
          <div style={{ fontSize: "16px", fontWeight: "800", color: "#FFF", marginBottom: "6px" }}>22 GKE, VPC, IAM</div>
          <div style={{ fontSize: "10.5px", color: "var(--text-secondary)" }}>
            Specific Alerts: <strong style={{ color: "#FF4D4D" }}>6 Critical</strong> | <strong style={{ color: "#FF8800" }}>12 High</strong>
          </div>
        </div>

        {/* Provider 2: Azure Sentinel */}
        <div className="provider-card" style={{ borderLeft: "3px solid #0284C7" }}>
          <div className="provider-header">
            <div className="provider-title">
              <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#0284C7", display: "inline-block" }}></span>
              Azure Sentinel (Simulation)
            </div>
            <span className="status-badge status-badge-green">Health ●</span>
          </div>
          <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginBottom: "4px" }}>Resources: 15</div>
          <div style={{ fontSize: "16px", fontWeight: "800", color: "#FFF", marginBottom: "6px" }}>15 Azure FW, Identity</div>
          <div style={{ fontSize: "10.5px", color: "var(--text-secondary)" }}>
            Specific Alerts: <strong style={{ color: "#FF4D4D" }}>6 Critical</strong> | <strong style={{ color: "#FF8800" }}>12 High</strong>
          </div>
        </div>

        {/* Provider 3: AWS Security Hub */}
        <div className="provider-card" style={{ borderLeft: "3px solid #F59E0B" }}>
          <div className="provider-header">
            <div className="provider-title">
              <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#F59E0B", display: "inline-block" }}></span>
              AWS Security Hub (Simulation)
            </div>
            <span className="status-badge status-badge-yellow">Yellow ●</span>
          </div>
          <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginBottom: "4px" }}>Resources: 19</div>
          <div style={{ fontSize: "16px", fontWeight: "800", color: "#FFF", marginBottom: "6px" }}>19 EC2, S3, VPC</div>
          <div style={{ fontSize: "10.5px", color: "var(--text-secondary)" }}>
            Specific Alerts: <strong style={{ color: "#FF4D4D" }}>7 Critical</strong> | <strong style={{ color: "#FF8800" }}>5 High</strong>
          </div>
        </div>

        {/* Provider 4: Huawei Cloud */}
        <div className="provider-card" style={{ borderLeft: "3px solid #EF4444" }}>
          <div className="provider-header">
            <div className="provider-title">
              <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#EF4444", display: "inline-block" }}></span>
              Huawei Cloud (Simulation)
            </div>
            <span className="status-badge status-badge-orange">Orange ●</span>
          </div>
          <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginBottom: "4px" }}>Resources: 18</div>
          <div style={{ fontSize: "16px", fontWeight: "800", color: "#FFF", marginBottom: "6px" }}>18 Compute, Storage</div>
          <div style={{ fontSize: "10.5px", color: "var(--text-secondary)" }}>
            Specific Alerts: <strong style={{ color: "#FF4D4D" }}>7 Critical</strong> | <strong style={{ color: "#FF8800" }}>5 High</strong>
          </div>
        </div>
      </div>

      {/* ROW 3: MIDDLE SECTION CHARTS & REAL DARK WORLD MAP (3 COLUMNS) */}
      <div className="grid-3-col">
        {/* LEFT COLUMN: 2 DONUT RINGS */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* Donut Chart 1: Alerts by Severity */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">ALERTS BY SEVERITY (LAST 24H)</span>
            </div>
            <div style={{ height: "150px", position: "relative", display: "flex", justifyContent: "center", alignItems: "center" }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={ringData1} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={4} dataKey="value">
                    {ringData1.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "#090C15", borderColor: "#1D263A" }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ position: "absolute", textAlign: "center" }}>
                <div style={{ fontSize: "18px", fontWeight: "800", color: "#FF4D4D" }}>17</div>
                <div style={{ fontSize: "9px", color: "var(--text-secondary)", textTransform: "uppercase" }}>Critical Alerts</div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", fontSize: "10px", color: "var(--text-secondary)" }}>
              <div><span style={{ color: "#FF4D4D" }}>●</span> New (Critical) (35%)</div>
              <div><span style={{ color: "#FF8800" }}>●</span> Investigating (25%)</div>
              <div><span style={{ color: "#10B981" }}>●</span> False Positive</div>
              <div><span style={{ color: "#38BDF8" }}>●</span> Resolved</div>
            </div>
          </div>

          {/* Donut Chart 2: Alert Status Distribution */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">ALERT STATUS DISTRIBUTION (LAST 24H)</span>
            </div>
            <div style={{ height: "150px", position: "relative" }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={ringData2} cx="50%" cy="50%" innerRadius={35} outerRadius={58} paddingAngle={4} dataKey="value">
                    {ringData2.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "#090C15", borderColor: "#1D263A" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", fontSize: "10px", color: "var(--text-secondary)" }}>
              <div><span style={{ color: "#FF4D4D" }}>●</span> New (Critical)</div>
              <div><span style={{ color: "#FF8800" }}>●</span> Investigating</div>
              <div><span style={{ color: "#10B981" }}>●</span> False Positive</div>
              <div><span style={{ color: "#38BDF8" }}>●</span> Resolved</div>
            </div>
          </div>
        </div>

        {/* MIDDLE COLUMN: REAL DARK WORLD MAP WITH INSTANCE NAMES & GREEN/RED DOTS */}
        <div className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <RegionalDeploymentMap regionalData={stats?.regional_health} instanceNodes={stats?.instance_nodes} title="GLOBAL INSTANCE DEPLOYMENT MAP" />
        </div>

        {/* RIGHT COLUMN: 2 BAR CHARTS */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* Bar Chart 1: Incidents by Cloud Provider */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">INCIDENTS BY CLOUD PROVIDER (LAST 7 DAYS)</span>
            </div>
            <div style={{ height: "140px" }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={provBarData}>
                  <XAxis dataKey="name" stroke="#526078" fontSize={9} />
                  <YAxis stroke="#526078" fontSize={9} />
                  <Tooltip contentStyle={{ backgroundColor: "#090C15", borderColor: "#1D263A" }} />
                  <Bar dataKey="incidents" fill="#0284C7" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ fontSize: "9.5px", color: "var(--text-muted)", textAlign: "right" }}>
              Prediction Trend: 113M lost
            </div>
          </div>

          {/* Bar Chart 2: Ingested Logs by Cloud Provider */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">INGESTED LOGS BY CLOUD PROVIDER (LAST 7 DAYS)</span>
            </div>
            <div style={{ height: "140px" }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={provLogData}>
                  <XAxis dataKey="name" stroke="#526078" fontSize={9} />
                  <YAxis stroke="#526078" fontSize={9} />
                  <Tooltip contentStyle={{ backgroundColor: "#090C15", borderColor: "#1D263A" }} />
                  <Bar dataKey="val" radius={[3, 3, 0, 0]}>
                    {provLogData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* ROW 4: RECENT ACTIVE INCIDENTS TABLE */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">ACTIVE SECURITY & OPERATIONAL INCIDENTS</span>
          <span style={{ fontSize: "11px", color: "#00F0FF", cursor: "pointer", fontWeight: "600" }} onClick={() => onNavigate("alerts")}>
            View All Incidents &rarr;
          </span>
        </div>
        <div className="table-container">
          {recentAlerts.length === 0 ? (
            <div style={{ padding: "16px", textAlign: "center", color: "var(--text-secondary)" }}>
              No active security incidents detected. System secure.
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Alert ID</th>
                  <th>Cloud Tenant</th>
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
                    <td><strong style={{ fontFamily: "var(--font-mono)", color: "#00F0FF" }}>{alert.id}</strong></td>
                    <td>
                      <span className="badge badge-info">{alert.cloud_provider}</span>
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
                      <span className={`badge ${alert.status === 'OPEN' ? 'badge-critical' : 'badge-info'}`}>
                        {alert.status}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-secondary" style={{ padding: "3px 8px", fontSize: "10px" }} onClick={() => onViewAlert(alert.id)}>
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
