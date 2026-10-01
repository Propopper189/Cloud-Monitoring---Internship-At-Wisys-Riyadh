import React, { useState } from "react";
import { Edit2, Shield, Eye, HelpCircle } from "lucide-react";
import type { Rule } from "../types";
import { updateRule } from "../services/api";

interface RulesProps {
  rules: Rule[];
  onRefresh: () => void;
}

export default function Rules({ rules, onRefresh }: RulesProps) {
  const [selectedRule, setSelectedRule] = useState<Rule | null>(null);
  const [formData, setFormData] = useState({
    severity: "CRITICAL",
    description: "",
    enabled: true,
  });

  const [loading, setLoading] = useState(false);

  const handleEditClick = (rule: Rule) => {
    setSelectedRule(rule);
    setFormData({
      severity: rule.severity,
      description: rule.description,
      enabled: rule.enabled,
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRule) return;
    setLoading(true);
    try {
      await updateRule(selectedRule.id, formData);
      setSelectedRule(null);
      onRefresh();
    } catch (err) {
      console.error("Failed to update rule", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: "20px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "700" }}>Alarm Rules Configuration</h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "13px" }}>Customize threshold metrics, severities, and activation flags for rule engine evaluations</p>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Rule ID</th>
                <th>Policy Name</th>
                <th>Matched Event Type</th>
                <th>Severity</th>
                <th>Alert Ticket Output Description</th>
                <th>Cloud Provider</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule.id}>
                  <td><strong style={{ fontFamily: "monospace" }}>{rule.id}</strong></td>
                  <td>{rule.name}</td>
                  <td><span className="badge badge-info" style={{ fontFamily: "monospace", fontSize: "11px" }}>{rule.event_type}</span></td>
                  <td>
                    <span className={`badge badge-${rule.severity.toLowerCase()}`}>
                      {rule.severity}
                    </span>
                  </td>
                  <td>{rule.description}</td>
                  <td>
                    <span className="badge" style={{ borderColor: "#64748b", color: "#e2e8f0" }}>
                      {rule.cloud_provider}
                    </span>
                  </td>
                  <td>
                    <span className="badge" style={{
                      backgroundColor: rule.enabled ? "var(--bg-ok)" : "rgba(255, 255, 255, 0.05)",
                      color: rule.enabled ? "var(--severity-ok)" : "var(--text-secondary)",
                      borderColor: rule.enabled ? "rgba(16, 185, 129, 0.2)" : "var(--border-color)"
                    }}>
                      {rule.enabled ? "ENABLED" : "DISABLED"}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-secondary" style={{ padding: "4px 8px", fontSize: "11px", display: "inline-flex", gap: "4px" }} onClick={() => handleEditClick(rule)}>
                      <Edit2 size={11} /> Edit Config
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Rule Modal */}
      {selectedRule && (
        <div className="modal-overlay" onClick={() => setSelectedRule(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "450px" }}>
            <div className="modal-header">
              <h3 className="modal-title">Configure Detection Rule</h3>
              <button className="modal-close" onClick={() => setSelectedRule(null)}>&times;</button>
            </div>
            
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "16px" }}>
                  <Shield size={20} className="text-info" />
                  <div>
                    <strong style={{ fontSize: "14px" }}>{selectedRule.name}</strong>
                    <div style={{ fontSize: "11px", color: "var(--text-secondary)", fontFamily: "monospace" }}>ID: {selectedRule.id}</div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Rule Alarm Severity</label>
                  <select className="filter-input" style={{ width: "100%" }} value={formData.severity} onChange={(e) => setFormData({ ...formData, severity: e.target.value })}>
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="WARNING">WARNING</option>
                    <option value="INFO">INFO</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Custom Alert Output Description</label>
                  <input type="text" className="filter-input" style={{ width: "100%" }} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} required />
                </div>

                <div className="form-group" style={{ flexDirection: "row", alignItems: "center", gap: "10px", marginTop: "12px" }}>
                  <input type="checkbox" id="rule-enabled-chk" checked={formData.enabled} onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })} style={{ cursor: "pointer" }} />
                  <label htmlFor="rule-enabled-chk" style={{ cursor: "pointer", fontSize: "13px" }}>Rule Evaluation Enabled</label>
                </div>
              </div>
              
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedRule(null)}>Cancel</button>
                <button type="submit" className="btn" disabled={loading}>Save Parameters</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
