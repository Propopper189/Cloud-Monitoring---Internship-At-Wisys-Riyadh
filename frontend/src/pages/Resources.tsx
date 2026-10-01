import React, { useState } from "react";
import { Search, Filter, Server, ShieldAlert } from "lucide-react";
import type { Resource } from "../types";

interface ResourcesProps {
  resources: Resource[];
  onFilterChange: (filters: Record<string, string>) => void;
}

export default function Resources({ resources, onFilterChange }: ResourcesProps) {
  const [filters, setFilters] = useState({
    cloud_provider: "",
    resource_type: "",
    status: "",
    risk_level: "",
    search: "",
  });

  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);

  const handleFilterChange = (key: string, value: string) => {
    const updated = { ...filters, [key]: value };
    setFilters(updated);
    onFilterChange(updated);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFilterChange("search", e.target.value);
  };

  const formatDetails = (jsonStr?: string) => {
    if (!jsonStr) return "No configuration details available.";
    try {
      const parsed = JSON.parse(jsonStr);
      return Object.entries(parsed).map(([key, val]) => (
        <div key={key} style={{ marginBottom: "8px", fontSize: "13px" }}>
          <strong style={{ textTransform: "capitalize", color: "var(--text-secondary)" }}>{key.replace("_", " ")}: </strong>
          <span>{String(val)}</span>
        </div>
      ));
    } catch {
      return jsonStr;
    }
  };

  return (
    <div>
      <div style={{ marginBottom: "20px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "700" }}>Cloud Resource Inventory</h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "13px" }}>Auto-discovered assets across multi-cloud tenants</p>
      </div>

      {/* Filters Bar */}
      <div className="filters-bar">
        <div style={{ flex: 1, minWidth: "200px", position: "relative" }}>
          <input type="text" placeholder="Search by resource name, ID..." className="filter-input" style={{ width: "100%", paddingLeft: "12px" }} value={filters.search} onChange={handleSearchChange} />
        </div>

        <select className="filter-input" value={filters.cloud_provider} onChange={(e) => handleFilterChange("cloud_provider", e.target.value)}>
          <option value="">All Cloud Providers</option>
          <option value="GCP">GCP</option>
          <option value="Huawei Cloud">Huawei Cloud</option>
          <option value="Microsoft Entra ID">Microsoft Entra ID</option>
        </select>

        <select className="filter-input" value={filters.resource_type} onChange={(e) => handleFilterChange("resource_type", e.target.value)}>
          <option value="">All Resource Types</option>
          <option value="VM">VM / ECS Instances</option>
          <option value="VPC">VPC Networks</option>
          <option value="Security Group">Security Groups</option>
          <option value="Application">Application Registrations</option>
          <option value="Backup">Storage Backups</option>
          <option value="Alarm Policy">Alarm Policies</option>
        </select>

        <select className="filter-input" value={filters.status} onChange={(e) => handleFilterChange("status", e.target.value)}>
          <option value="">All Statuses</option>
          <option value="ACTIVE">ACTIVE / RUNNING</option>
          <option value="STOPPED">STOPPED</option>
          <option value="MODIFIED">MODIFIED</option>
          <option value="DISABLED">DISABLED</option>
          <option value="FAILED">FAILED</option>
        </select>

        <select className="filter-input" value={filters.risk_level} onChange={(e) => handleFilterChange("risk_level", e.target.value)}>
          <option value="">All Risk Levels</option>
          <option value="LOW">Low Risk</option>
          <option value="MEDIUM">Medium Risk</option>
          <option value="HIGH">High Risk</option>
          <option value="CRITICAL">Critical Risk</option>
        </select>
      </div>

      {/* Grid inventory list */}
      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Resource ID</th>
                <th>Name</th>
                <th>Provider</th>
                <th>Region</th>
                <th>Type</th>
                <th>Status</th>
                <th>Risk Level</th>
                <th>Last Evaluated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {resources.map((resource) => (
                <tr key={resource.id}>
                  <td><strong style={{ fontFamily: "monospace" }}>{resource.id}</strong></td>
                  <td>{resource.name}</td>
                  <td>
                    <span className="badge" style={{
                      borderColor: resource.cloud_provider === "GCP" ? "#4285F4" : (resource.cloud_provider === "Huawei Cloud" ? "#EA4335" : "#F4B400"),
                      color: resource.cloud_provider === "GCP" ? "#4285F4" : (resource.cloud_provider === "Huawei Cloud" ? "#EA4335" : "#F4B400")
                    }}>
                      {resource.cloud_provider}
                    </span>
                  </td>
                  <td>{resource.region}</td>
                  <td>{resource.resource_type}</td>
                  <td>
                    <span className="badge" style={{
                      backgroundColor: resource.status === "ACTIVE" ? "var(--bg-ok)" : "rgba(239, 68, 68, 0.1)",
                      color: resource.status === "ACTIVE" ? "var(--severity-ok)" : "var(--severity-critical)",
                      borderColor: resource.status === "ACTIVE" ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)"
                    }}>
                      {resource.status}
                    </span>
                  </td>
                  <td>
                    <span className={`badge badge-${resource.risk_level.toLowerCase()}`}>
                      {resource.risk_level}
                    </span>
                  </td>
                  <td>{new Date(resource.last_monitored).toLocaleTimeString()}</td>
                  <td>
                    <button className="btn btn-secondary" style={{ padding: "4px 8px", fontSize: "11px" }} onClick={() => setSelectedResource(resource)}>
                      Inspect Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspect Modal */}
      {selectedResource && (
        <div className="modal-overlay" onClick={() => setSelectedResource(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "500px" }}>
            <div className="modal-header">
              <h3 className="modal-title">Resource Config Details</h3>
              <button className="modal-close" onClick={() => setSelectedResource(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                <Server size={24} className="text-info" />
                <div>
                  <h4 style={{ fontWeight: "700" }}>{selectedResource.name}</h4>
                  <span style={{ fontSize: "11px", color: "var(--text-secondary)", fontFamily: "monospace" }}>{selectedResource.id}</span>
                </div>
              </div>
              
              <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "16px", marginTop: "16px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                  <div>
                    <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Cloud Provider</div>
                    <strong>{selectedResource.cloud_provider}</strong>
                  </div>
                  <div>
                    <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Region</div>
                    <strong>{selectedResource.region}</strong>
                  </div>
                  <div>
                    <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Resource Type</div>
                    <strong>{selectedResource.resource_type}</strong>
                  </div>
                  <div>
                    <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Current Status</div>
                    <strong>{selectedResource.status}</strong>
                  </div>
                </div>

                <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "16px" }}>
                  <h5 style={{ fontWeight: "600", marginBottom: "8px", fontSize: "12px", color: "var(--text-secondary)" }}>Configuration Metadata</h5>
                  <div style={{ backgroundColor: "var(--bg-main)", padding: "12px", borderRadius: "6px", border: "1px solid var(--border-color)" }}>
                    {formatDetails(selectedResource.details_json)}
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedResource(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
