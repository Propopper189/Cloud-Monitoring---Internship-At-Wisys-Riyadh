import React, { useState } from "react";
import { Lock, FileSpreadsheet } from "lucide-react";
import type { AuditLog } from "../types";

interface AuditLogsProps {
  auditLogs: AuditLog[];
  onFilterChange: (filters: Record<string, string>) => void;
}

export default function AuditLogs({ auditLogs, onFilterChange }: AuditLogsProps) {
  const [filters, setFilters] = useState({
    actor: "",
    cloud_provider: "",
    search: "",
  });

  const handleFilterChange = (key: string, value: string) => {
    const updated = { ...filters, [key]: value };
    setFilters(updated);
    onFilterChange(updated);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFilterChange("search", e.target.value);
  };

  return (
    <div>
      <div style={{ marginBottom: "20px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "700" }}>System Audit Logs</h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "13px" }}>Immutable ledger of administrative configuration changes and incident actions</p>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div style={{ flex: 1, minWidth: "250px" }}>
          <input type="text" placeholder="Search by action, resource description..." className="filter-input" style={{ width: "100%" }} value={filters.search} onChange={handleSearchChange} />
        </div>

        <input type="text" placeholder="Filter by Actor Email..." className="filter-input" value={filters.actor} onChange={(e) => handleFilterChange("actor", e.target.value)} />

        <select className="filter-input" value={filters.cloud_provider} onChange={(e) => handleFilterChange("cloud_provider", e.target.value)}>
          <option value="">All Cloud Providers</option>
          <option value="GCP">GCP</option>
          <option value="Huawei Cloud">Huawei Cloud</option>
          <option value="Microsoft Entra ID">Microsoft Entra ID</option>
        </select>
      </div>

      {/* Table */}
      <div className="card">
        <div className="panel-header">
          <h3 className="panel-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}><Lock size={16} className="text-info" /> Operations Access Log</h3>
        </div>
        
        <div className="table-container">
          {auditLogs.length === 0 ? (
            <div style={{ padding: "20px", textAlign: "center", color: "var(--text-secondary)" }}>
              No audit logs recorded in this timeline.
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Actor / Initiator</th>
                  <th>Caller IP Address</th>
                  <th>Action Operation</th>
                  <th>Impacted Resource</th>
                  <th>Cloud Tenant</th>
                  <th>Status Code</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ color: "var(--text-secondary)" }}>{new Date(log.timestamp).toLocaleString()}</td>
                    <td><strong style={{ color: "#38bdf8" }}>{log.actor}</strong></td>
                    <td style={{ fontFamily: "monospace" }}>{log.source_ip}</td>
                    <td>{log.action}</td>
                    <td>{log.resource}</td>
                    <td>
                      <span className="badge" style={{
                        borderColor: log.cloud_provider === "GCP" ? "#4285F4" : (log.cloud_provider === "Huawei Cloud" ? "#EA4335" : "#F4B400"),
                        color: log.cloud_provider === "GCP" ? "#4285F4" : (log.cloud_provider === "Huawei Cloud" ? "#EA4335" : "#F4B400")
                      }}>
                        {log.cloud_provider}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-ok">
                        {log.result}
                      </span>
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
