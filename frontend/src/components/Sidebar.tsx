import React from "react";
import { LayoutDashboard, Server, AlertTriangle, Play, Settings, Shield, FileSpreadsheet, Mail } from "lucide-react";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  openAlertsCount: number;
  securityScore: number;
}

export default function Sidebar({ activeTab, onTabChange, openAlertsCount, securityScore }: SidebarProps) {
  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
    { id: "resources", label: "Resources", icon: <Server size={18} /> },
    { 
      id: "alerts", 
      label: "Alerts", 
      icon: <AlertTriangle size={18} />, 
      badge: openAlertsCount > 0 ? openAlertsCount : undefined 
    },
    { id: "simulator", label: "Event Simulator", icon: <Play size={18} /> },
    { id: "rules", label: "Rules", icon: <Settings size={18} /> },
    { id: "audit-logs", label: "Audit Logs", icon: <FileSpreadsheet size={18} /> },
    { 
      id: "security-score", 
      label: "Security Score", 
      icon: <Shield size={18} />, 
      badgeLabel: `${securityScore}%`
    },
    { id: "notifications", label: "Notifications", icon: <Mail size={18} /> }
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1 className="sidebar-title">WiSys Multi-Cloud</h1>
        <div className="sidebar-subtitle">Operations & Alerting Console</div>
      </div>

      <nav className="sidebar-menu">
        {menuItems.map((item) => (
          <div key={item.id} className={`sidebar-item ${activeTab === item.id ? "active" : ""}`} onClick={() => onTabChange(item.id)}>
            <span style={{ display: "flex", alignItems: "center" }}>{item.icon}</span>
            <span style={{ flex: 1 }}>{item.label}</span>
            {item.badge !== undefined && (
              <span className="badge badge-critical" style={{
                borderRadius: "50%",
                width: "20px",
                height: "20px",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                fontSize: "10px",
                padding: 0
              }}>
                {item.badge}
              </span>
            )}
            {item.badgeLabel && (
              <span className="badge" style={{
                borderColor: securityScore >= 90 ? "var(--severity-ok)" : "var(--severity-warning)",
                color: securityScore >= 90 ? "var(--severity-ok)" : "var(--severity-warning)",
                fontSize: "10px"
              }}>
                {item.badgeLabel}
              </span>
            )}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div>CSE443 Internship Evaluation</div>
        <div style={{ marginTop: "4px", fontSize: "9px" }}>Academic Local Sandbox</div>
      </div>
    </aside>
  );
}
