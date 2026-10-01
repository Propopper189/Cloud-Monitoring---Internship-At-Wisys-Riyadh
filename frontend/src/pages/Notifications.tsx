import React, { useState, useEffect } from "react";
import { Mail, Settings } from "lucide-react";
import type { Notification } from "../types";
import { fetchSMTPConfig, saveSMTPConfig } from "../services/api";

interface NotificationsProps {
  notifications: Notification[];
}

export default function Notifications({ notifications }: NotificationsProps) {
  const [selectedMail, setSelectedMail] = useState<Notification | null>(null);
  const [smtpConfig, setSmtpConfig] = useState({
    smtp_server: "",
    smtp_port: 587,
    smtp_username: "",
    smtp_password: "",
    alert_recipient: ""
  });
  const [smtpStatus, setSmtpStatus] = useState("");
  const [isConfiguring, setIsConfiguring] = useState(false);

  useEffect(() => {
    async function loadConfig() {
      try {
        const data = await fetchSMTPConfig();
        setSmtpConfig({
          smtp_server: data.smtp_server || "",
          smtp_port: data.smtp_port || 587,
          smtp_username: data.smtp_username || "",
          smtp_password: data.smtp_password_masked || "",
          alert_recipient: data.alert_recipient || ""
        });
      } catch (err) {
        console.error("Failed to load SMTP configuration", err);
      }
    }
    loadConfig();
  }, []);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSmtpStatus("");
    try {
      await saveSMTPConfig(smtpConfig);
      setSmtpStatus("SUCCESS: SMTP server configuration saved successfully!");
      setTimeout(() => setSmtpStatus(""), 4000);
    } catch (err) {
      setSmtpStatus("FAILED: Could not update SMTP configuration.");
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    if (status === "DISPATCHED_REAL_EMAIL") {
      return {
        borderColor: "var(--severity-ok)",
        color: "var(--severity-ok)",
        backgroundColor: "var(--bg-ok)"
      };
    } else if (status.startsWith("SMTP_ERROR")) {
      return {
        borderColor: "var(--severity-critical)",
        color: "var(--severity-critical)",
        backgroundColor: "var(--bg-critical)"
      };
    } else {
      return {
        borderColor: "var(--severity-info)",
        color: "var(--severity-info)",
        backgroundColor: "rgba(16,185,129,0.02)"
      };
    }
  };

  return (
    <div>
      <div style={{ marginBottom: "20px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "700" }}>Alert Notification Queue</h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "13px" }}>Manage SMTP server variables and investigate outbound security alerts</p>
      </div>

      <div className="card" style={{ marginBottom: "24px" }}>
        <div className="panel-header" style={{ cursor: "pointer" }} onClick={() => setIsConfiguring(!isConfiguring)}>
          <h3 className="panel-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Settings size={16} className="text-info" /> Real SMTP Email Server Configuration
          </h3>
          <button className="btn btn-secondary" style={{ padding: "4px 8px", fontSize: "11px" }}>
            {isConfiguring ? "Collapse Settings" : "Configure SMTP Settings"}
          </button>
        </div>

        {isConfiguring && (
          <form onSubmit={handleSaveConfig} style={{ marginTop: "16px", borderTop: "1px solid var(--border-color)", paddingTop: "16px" }}>
            <p style={{ color: "var(--text-secondary)", fontSize: "12px", marginBottom: "16px" }}>
              Provide your real mail credentials (e.g. Google Gmail 16-character App Passwords) to forward notifications instantly to your real inbox.
            </p>

            {smtpStatus && (
              <div style={{
                backgroundColor: smtpStatus.startsWith("SUCCESS") ? "var(--bg-ok)" : "var(--bg-critical)",
                color: smtpStatus.startsWith("SUCCESS") ? "var(--severity-ok)" : "var(--severity-critical)",
                border: `1px solid ${smtpStatus.startsWith("SUCCESS") ? "var(--severity-ok)" : "var(--severity-critical)"}`,
                padding: "10px 14px",
                borderRadius: "6px",
                marginBottom: "16px",
                fontSize: "12px"
              }}>
                {smtpStatus}
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
              <div className="form-group">
                <label className="form-label">SMTP Mail Server</label>
                <input type="text" placeholder="e.g. smtp.gmail.com" className="filter-input" style={{ width: "100%" }}
                  value={smtpConfig.smtp_server} onChange={(e) => setSmtpConfig({ ...smtpConfig, smtp_server: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">SMTP Port</label>
                <input type="number" placeholder="587" className="filter-input" style={{ width: "100%" }}
                  value={smtpConfig.smtp_port} onChange={(e) => setSmtpConfig({ ...smtpConfig, smtp_port: Number(e.target.value) })} required />
              </div>
              <div className="form-group">
                <label className="form-label">SMTP Username (Sender Email)</label>
                <input type="email" placeholder="sender-address@gmail.com" className="filter-input" style={{ width: "100%" }}
                  value={smtpConfig.smtp_username} onChange={(e) => setSmtpConfig({ ...smtpConfig, smtp_username: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">SMTP Password / App Password</label>
                <input type="password" placeholder="••••••••••••••••" className="filter-input" style={{ width: "100%" }}
                  value={smtpConfig.smtp_password} onChange={(e) => setSmtpConfig({ ...smtpConfig, smtp_password: e.target.value })} required />
              </div>
              <div className="form-group" style={{ gridColumn: "span 2" }}>
                <label className="form-label">Alert Recipient Email (Your Real Mailbox)</label>
                <input type="email" placeholder="recipient-address@gmail.com" className="filter-input" style={{ width: "100%" }}
                  value={smtpConfig.alert_recipient} onChange={(e) => setSmtpConfig({ ...smtpConfig, alert_recipient: e.target.value })} required />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button className="btn" type="submit" style={{ backgroundColor: "#10b981", color: "#fff" }}>
                Save Configurations
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="card">
        <div className="panel-header">
          <h3 className="panel-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Mail size={16} className="text-info" /> Outbound SMTP Dispatch Log
          </h3>
        </div>

        <div className="table-container">
          {notifications.length === 0 ? (
            <div style={{ padding: "20px", textAlign: "center", color: "var(--text-secondary)" }}>
              No notifications dispatched. (Only CRITICAL/HIGH alerts generate SMTP routing).
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Dispatch ID</th>
                  <th>Incident Ref</th>
                  <th>Timestamp</th>
                  <th>Recipient Mailbox</th>
                  <th>Subject Line</th>
                  <th>Mail Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {notifications.map((mail) => (
                  <tr key={mail.id}>
                    <td style={{ fontFamily: "monospace", fontSize: "11px" }}>{mail.id}</td>
                    <td style={{ fontFamily: "monospace", fontWeight: "600" }}>{mail.alert_id}</td>
                    <td style={{ color: "var(--text-secondary)" }}>{new Date(mail.timestamp).toLocaleString()}</td>
                    <td><strong style={{ color: "#38bdf8" }}>{mail.recipient}</strong></td>
                    <td>{mail.subject}</td>
                    <td>
                      <span className="badge" style={getStatusBadgeStyle(mail.status)}>
                        {mail.status}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-secondary" style={{ padding: "4px 8px", fontSize: "11px" }} onClick={() => setSelectedMail(mail)}>
                        Read Mail Body
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {selectedMail && (
        <div className="modal-overlay" onClick={() => setSelectedMail(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "550px" }}>
            <div className="modal-header" style={{ backgroundColor: "rgba(255,255,255,0.01)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Mail className="text-info" size={20} />
                <h3 className="modal-title">Operational Alert Email</h3>
              </div>
              <button className="modal-close" onClick={() => setSelectedMail(null)}>&times;</button>
            </div>
            
            <div className="modal-body" style={{ fontFamily: "Courier New, Courier, monospace", fontSize: "13px" }}>
              <div style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "12px", marginBottom: "16px" }}>
                <div><strong>FROM:</strong> {smtpConfig.smtp_username || "central-alerts@wisys-monitor.sa"}</div>
                <div><strong>TO:</strong> {selectedMail.recipient}</div>
                <div><strong>DATE:</strong> {new Date(selectedMail.timestamp).toUTCString()}</div>
                <div><strong>SUBJECT:</strong> {selectedMail.subject}</div>
              </div>
              <div style={{ whiteSpace: "pre-wrap", color: "#e2e8f0" }}>
                {selectedMail.message}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedMail(null)}>Close Mail</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
