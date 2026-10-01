import React from "react";
import { 
  LayoutDashboard, 
  Server, 
  AlertTriangle, 
  Zap, 
  ShieldCheck, 
  FileText, 
  Bell, 
  Shield, 
  Globe, 
  Lock 
} from "lucide-react";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  openAlertsCount: number;
  securityScore: number;
}

export default function Sidebar({ activeTab, onTabChange, openAlertsCount, securityScore }: SidebarProps) {
  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={16} /> },
    { id: "resources", label: "Resources", icon: <Server size={16} />, live: true },
    { 
      id: "alerts", 
      label: "Alerts", 
      icon: <AlertTriangle size={16} />, 
      badgeCount: openAlertsCount > 0 ? openAlertsCount : 14 
    },
    { id: "simulator", label: "Event Simulator", icon: <Zap size={16} /> },
    { id: "rules", label: "Rules", icon: <ShieldCheck size={16} /> },
    { id: "audit-logs", label: "Audit Logs", icon: <FileText size={16} /> },
    { id: "notifications", label: "Notifications", icon: <Bell size={16} />, live: true },
    { id: "security-score", label: "Security Score", icon: <Shield size={16} /> },
    { id: "threat-intelligence", label: "Threat Intelligence", icon: <Globe size={16} />, live: true },
    { id: "vulnerability-manager", label: "Vulnerability Manager", icon: <Lock size={16} />, live: true }
  ];

  // Calculate arc angles for gauge
  const scorePercent = Math.min(100, Math.max(0, securityScore));
  const strokeDashoffset = 157 - (157 * scorePercent) / 100;

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <Shield size={18} />
          </div>
          <div>
            <h1 className="sidebar-title">WISYS MULTI-CLOUD</h1>
            <div className="sidebar-subtitle">Operations & Alerting Console</div>
          </div>
        </div>
      </div>

      <nav className="sidebar-menu">
        {menuItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <div 
              key={item.id} 
              className={`sidebar-item ${isActive ? "active" : ""}`} 
              onClick={() => onTabChange(item.id)}
            >
              <span style={{ display: "flex", alignItems: "center" }}>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              
              {item.live && <span className="sidebar-badge-live"></span>}
              {item.badgeCount !== undefined && (
                <span className="sidebar-badge sidebar-badge-red">
                  {item.badgeCount}
                </span>
              )}
            </div>
          );
        })}
      </nav>

      {/* Embedded Sidebar Security Score Gauge Widget */}
      <div className="sidebar-score-widget">
        <div className="sidebar-score-title">
          <Shield size={13} style={{ color: "#00F0FF" }} />
          Security Score
        </div>

        <div className="sidebar-gauge-container">
          <svg width="120" height="75" viewBox="0 0 120 75">
            {/* Background Arc */}
            <path
              d="M 15 65 A 45 45 0 0 1 105 65"
              fill="none"
              stroke="#1D263A"
              strokeWidth="10"
              strokeLinecap="round"
            />
            {/* Color Arc */}
            <path
              d="M 15 65 A 45 45 0 0 1 105 65"
              fill="none"
              stroke={scorePercent >= 80 ? "#10B981" : scorePercent >= 60 ? "#FACC15" : "#FF4D4D"}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray="157"
              strokeDashoffset={strokeDashoffset}
              style={{ transition: "stroke-dashoffset 0.5s ease" }}
            />
            {/* Score Text */}
            <text x="60" y="52" textAnchor="middle" fill="#FFFFFF" fontSize="22" fontWeight="800" fontFamily="Inter">
              {scorePercent}%
            </text>
          </svg>
        </div>

        <div className="sidebar-score-breakdown">
          <div className="sidebar-score-item">
            <span><span className="sidebar-score-dot" style={{ backgroundColor: "#FF4D4D" }}></span>Compliance</span>
            <span style={{ fontWeight: "700" }}>35%</span>
          </div>
          <div className="sidebar-score-item">
            <span><span className="sidebar-score-dot" style={{ backgroundColor: "#FACC15" }}></span>Configuration</span>
            <span style={{ fontWeight: "700" }}>48%</span>
          </div>
          <div className="sidebar-score-item">
            <span><span className="sidebar-score-dot" style={{ backgroundColor: "#10B981" }}></span>Network</span>
            <span style={{ fontWeight: "700" }}>42%</span>
          </div>
        </div>
      </div>

      <div className="sidebar-footer">
        <div className="sidebar-footer-title">CSE443 Internship Evaluation</div>
        <div style={{ marginTop: "2px" }}>Academic User ID</div>
      </div>
    </aside>
  );
}
