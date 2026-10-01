import React, { useState } from "react";
import { Play, Pause, StopCircle, Zap, ShieldAlert, Cpu } from "lucide-react";
import { triggerRandomEvent, runScenario, controlSimulator } from "../services/api";

interface EventSimulatorProps {
  simulatorConfig: { status: string; interval_seconds: number; active: boolean } | null;
  onRefresh: () => void;
}

const EVENT_TYPES = [
  "VM_STOPPED",
  "VM_STARTED",
  "VM_RESTARTED",
  "VM_DELETED",
  "VM_HEALTH_CHECK_FAILED",
  "DISK_UTILIZATION_HIGH",
  "BACKUP_FAILED",
  "SECURITY_GROUP_MODIFIED",
  "VPC_DELETED",
  "AUDIT_LOG_DISABLED",
  "IAM_POLICY_CHANGED",
  "ALARM_POLICY_DISABLED",
  "ALARM_POLICY_DELETED"
];

const PROVIDER_RESOURCES: Record<string, Array<{ id: string; name: string; type: string; region: string }>> = {
  GCP: [
    { id: "inst-sap-99", name: "vm-sap-prod", type: "VM", region: "asia-south1-a" },
    { id: "inst-web-101", name: "vm-web-dev", type: "VM", region: "us-central1" },
    { id: "sg-89472", name: "sg-gcp-web-prod", type: "Security Group", region: "us-central1" },
    { id: "vpc-87291", name: "vpc-gcp-production", type: "VPC", region: "global" },
    { id: "alarm-cpu-usage", name: "alarm-cpu-usage", type: "Alarm Policy", region: "us-central1" },
    { id: "audit-sink-991", name: "gcp-logging-audit", type: "Logging Sink", region: "global" }
  ],
  "Huawei Cloud": [
    { id: "ecs-billing-01", name: "ecs-billing-app", type: "ECS", region: "me-east-1" },
    { id: "ecs-router-02", name: "ecs-sap-router", type: "ECS", region: "ap-southeast-3" },
    { id: "sg-92718", name: "sg-hw-database", type: "Security Group", region: "ap-southeast-3" },
    { id: "vpc-48192", name: "vpc-hw-prod", type: "VPC", region: "ap-southeast-3" },
    { id: "backup-db-prod", name: "hw-backup-db", type: "Backup", region: "me-east-1" },
    { id: "alarm-cpu-77", name: "alarm-policy-vm-cpu", type: "Alarm Policy", region: "me-east-1" },
    { id: "cts-audit-001", name: "hw-cts-audit", type: "Logging Sink", region: "ap-southeast-3" }
  ],
  "Microsoft Entra ID": [
    { id: "app-entra-783921", name: "WiSys Azure Sync Integration App", type: "Application", region: "global" }
  ]
};

const RESOURCE_TYPE_EVENTS: Record<string, string[]> = {
  VM: ["VM_STOPPED", "VM_STARTED", "VM_RESTARTED", "VM_DELETED", "VM_HEALTH_CHECK_FAILED", "DISK_UTILIZATION_HIGH"],
  ECS: ["VM_STOPPED", "VM_STARTED", "VM_RESTARTED", "VM_DELETED", "VM_HEALTH_CHECK_FAILED", "DISK_UTILIZATION_HIGH"],
  "Security Group": ["SECURITY_GROUP_MODIFIED"],
  VPC: ["VPC_DELETED"],
  Backup: ["BACKUP_FAILED"],
  "Alarm Policy": ["ALARM_POLICY_DISABLED", "ALARM_POLICY_DELETED"],
  Application: ["IAM_POLICY_CHANGED", "IAM_ROLE_CHANGED"],
  "Logging Sink": ["AUDIT_LOG_DISABLED"]
};

const PROVIDER_ACTORS: Record<string, string[]> = {
  GCP: ["operator-ops@wisys.sa", "gcp-engineer@wisys.sa", "admin-sec@wisys.sa"],
  "Huawei Cloud": ["huawei-admin@wisys.sa", "db-operator@wisys.sa", "admin-sec@wisys.sa"],
  "Microsoft Entra ID": ["entra-admin@wisys.sa", "entra-audit@wisys.sa"]
};

const PROVIDER_IPS: Record<string, string[]> = {
  GCP: ["192.0.2.14", "192.0.2.25", "10.0.0.5"],
  "Huawei Cloud": ["198.51.100.22", "198.51.100.12", "10.10.1.12"],
  "Microsoft Entra ID": ["203.0.113.8", "203.0.113.51", "10.20.5.99"]
};


export default function EventSimulator({ simulatorConfig, onRefresh }: EventSimulatorProps) {
  const [formData, setFormData] = useState({
    cloud_provider: "GCP",
    event_type: "VM_STOPPED",
    region: "asia-south1-a",
    resource_id: "inst-sap-99",
    resource_name: "vm-sap-prod",
    resource_type: "VM",
    actor: "operator-ops@wisys.sa",
    source_ip: "192.0.2.14",
    severity: "CRITICAL",
    description: "VM stopped unexpectedly.",
  });

  const [intervalSec, setIntervalSec] = useState(5);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  const handleInputChange = (key: string, val: string) => {
    setFormData({ ...formData, [key]: val });
  };

  const handleProviderChange = (prov: string) => {
    const resources = PROVIDER_RESOURCES[prov] || [];
    const types = Array.from(new Set(resources.map(r => r.type)));
    const firstType = types[0] || "";
    
    const filteredRes = resources.filter(r => r.type === firstType);
    const firstRes = filteredRes[0] || { id: "", name: "", type: "", region: "" };
    
    const actors = PROVIDER_ACTORS[prov] || ["anonymous@wisys.sa"];
    const ips = PROVIDER_IPS[prov] || ["192.0.2.1"];
    const allowedEvents = RESOURCE_TYPE_EVENTS[firstType] || ["UNKNOWN"];

    setFormData({
      ...formData,
      cloud_provider: prov,
      resource_type: firstType,
      resource_id: firstRes.id,
      resource_name: firstRes.name,
      region: firstRes.region,
      event_type: allowedEvents[0],
      actor: actors[0],
      source_ip: ips[0],
      description: `Simulated event triggered for ${firstRes.name}`
    });
  };

  const handleResourceTypeChange = (type: string) => {
    const prov = formData.cloud_provider;
    const resources = PROVIDER_RESOURCES[prov] || [];
    const filteredRes = resources.filter(r => r.type === type);
    const firstRes = filteredRes[0] || { id: "", name: "", type: "", region: "" };
    const allowedEvents = RESOURCE_TYPE_EVENTS[type] || ["UNKNOWN"];

    setFormData({
      ...formData,
      resource_type: type,
      resource_id: firstRes.id,
      resource_name: firstRes.name,
      region: firstRes.region,
      event_type: allowedEvents[0],
      description: `Simulated event triggered for ${firstRes.name}`
    });
  };

  const handleResourceIdChange = (id: string) => {
    const prov = formData.cloud_provider;
    const resources = PROVIDER_RESOURCES[prov] || [];
    const matched = resources.find(r => r.id === id);
    if (matched) {
      const allowedEvents = RESOURCE_TYPE_EVENTS[matched.type] || ["UNKNOWN"];
      setFormData({
        ...formData,
        resource_id: id,
        resource_name: matched.name,
        resource_type: matched.type,
        region: matched.region,
        event_type: allowedEvents[0],
        description: `Simulated event triggered for ${matched.name}`
      });
    } else {
      setFormData({
        ...formData,
        resource_id: id
      });
    }
  };

  const handleEventTypeChange = (evtType: string) => {
    setFormData({
      ...formData,
      event_type: evtType,
      description: `${evtType.replace(/_/g, " ")} warning detected on resource ${formData.resource_name}.`
    });
  };

  const handleGenerateManual = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusMsg("");
    try {
      const res = await fetch("http://127.0.0.1:8000/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      setStatusMsg(`Success: Normalized event ingested with ID: ${data.id}`);
      onRefresh();
    } catch (err) {
      setStatusMsg("Failed to ingest custom event.");
    } finally {
      setLoading(false);
    }
  };

  const handleRunScenario = async (name: string) => {
    setLoading(true);
    setStatusMsg("");
    try {
      await runScenario(name);
      setStatusMsg(`Scenario "${name}" successfully executed. Security score updated.`);
      onRefresh();
    } catch (err) {
      setStatusMsg("Failed to execute scenario.");
    } finally {
      setLoading(false);
    }
  };

  const handleControlSimulator = async (action: string) => {
    try {
      await controlSimulator(action, intervalSec);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: "20px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "700" }}>Log Ingestion & Threat Simulator</h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "13px" }}>Trigger security events manually or execute demo scenarios</p>
      </div>

      {statusMsg && (
        <div style={{
          backgroundColor: statusMsg.startsWith("Success") ? "var(--bg-ok)" : "var(--bg-critical)",
          color: statusMsg.startsWith("Success") ? "var(--severity-ok)" : "var(--severity-critical)",
          border: `1px solid ${statusMsg.startsWith("Success") ? "var(--severity-ok)" : "var(--severity-critical)"}`,
          padding: "12px",
          borderRadius: "6px",
          marginBottom: "20px",
          fontSize: "13px"
        }}>
          {statusMsg}
        </div>
      )}

      {/* Simulator Controls */}
      <div className="card" style={{ marginBottom: "24px" }}>
        <div className="panel-header">
          <h3 className="panel-title">Automated Event Simulation Engine</h3>
          <span className="badge" style={{
            borderColor: simulatorConfig?.active ? "var(--severity-ok)" : "var(--text-secondary)",
            color: simulatorConfig?.active ? "var(--severity-ok)" : "var(--text-secondary)"
          }}>
            State: {simulatorConfig?.status || "STOPPED"}
          </span>
        </div>
        
        <p style={{ color: "var(--text-secondary)", fontSize: "13px", marginBottom: "16px" }}>
          Enable this engine to generate random GCP Audit, Huawei CTS, and Microsoft Entra ID logs at regular intervals to demonstrate the dynamic charts.
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Polling Interval:</span>
            <select className="filter-input" style={{ minWidth: "80px" }} value={intervalSec} onChange={(e) => setIntervalSec(Number(e.target.value))}>
              <option value={5}>5 Sec</option>
              <option value={10}>10 Sec</option>
              <option value={30}>30 Sec</option>
              <option value={60}>60 Sec</option>
            </select>
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <button className="btn" style={{ backgroundColor: simulatorConfig?.active ? "#06b6d4" : "#10b981", color: "#fff" }} onClick={() => handleControlSimulator("start")}>
              <Play size={14} /> Start Simulator
            </button>
            <button className="btn btn-secondary" onClick={() => handleControlSimulator("pause")}>
              <Pause size={14} /> Pause
            </button>
            <button className="btn btn-danger" onClick={() => handleControlSimulator("stop")}>
              <StopCircle size={14} /> Stop
            </button>
          </div>
        </div>
      </div>

      {/* Scenarios and Manual Generation Split */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "24px" }}>
        {/* Scenarios Panel */}
        <div className="card">
          <h3 className="panel-title" style={{ marginBottom: "16px" }}>Demo Lifecycle Scenarios</h3>
          <p style={{ color: "var(--text-secondary)", fontSize: "12px", marginBottom: "20px" }}>
            Run these pre-built incident flows to demonstrate security alerts and scoring.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "12px" }}>
              <h5 style={{ fontWeight: "700", fontSize: "13px" }}>1. VM Stopped Incident Flow</h5>
              <p style={{ fontSize: "11px", color: "var(--text-secondary)", margin: "4px 0 10px" }}>
                Simulates GCP SAP VM node shutdown. Dispatches alert notifications and drops security score.
              </p>
              <button className="btn btn-secondary" style={{ width: "100%" }} onClick={() => handleRunScenario("vm_stopped_lifecycle")} disabled={loading}>
                <Zap size={12} /> Run VM Stopped
              </button>
            </div>

            <div style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "12px" }}>
              <h5 style={{ fontWeight: "700", fontSize: "13px" }}>2. Firewall Tampering Flow</h5>
              <p style={{ fontSize: "11px", color: "var(--text-secondary)", margin: "4px 0 10px" }}>
                Simulates an unauthorized hacker updating ports in Huawei database security group rules.
              </p>
              <button className="btn btn-secondary" style={{ width: "100%" }} onClick={() => handleRunScenario("security_group_modified")} disabled={loading}>
                <ShieldAlert size={12} /> Run Security Group Hack
              </button>
            </div>

            <div>
              <h5 style={{ fontWeight: "700", fontSize: "13px" }}>3. Disabled Audit Log Flow</h5>
              <p style={{ fontSize: "11px", color: "var(--text-secondary)", margin: "4px 0 10px" }}>
                Simulates deleting logging sink. Drops score by 20 points immediately as audit capability is disabled.
              </p>
              <button className="btn btn-secondary" style={{ width: "100%" }} onClick={() => handleRunScenario("audit_log_disabled")} disabled={loading}>
                <Cpu size={12} /> Run Audit Logs Disabled
              </button>
            </div>
          </div>
        </div>

        {/* Custom Event Log Form */}
        <div className="card">
          <h3 className="panel-title" style={{ marginBottom: "16px" }}>Manual Audit Log Injector</h3>
          <form onSubmit={handleGenerateManual} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            
            <div className="form-group">
              <label className="form-label">Cloud Provider</label>
              <select className="filter-input" style={{ width: "100%" }} value={formData.cloud_provider} onChange={(e) => handleProviderChange(e.target.value)}>
                <option value="GCP">Google Cloud Platform</option>
                <option value="Huawei Cloud">Huawei Cloud</option>
                <option value="Microsoft Entra ID">Microsoft Entra ID</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Event Action</label>
              <select className="filter-input" style={{ width: "100%" }} value={formData.event_type} onChange={(e) => handleEventTypeChange(e.target.value)}>
                {(RESOURCE_TYPE_EVENTS[formData.resource_type] || []).map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Resource ID</label>
              <select className="filter-input" style={{ width: "100%" }} value={formData.resource_id} onChange={(e) => handleResourceIdChange(e.target.value)}>
                {(PROVIDER_RESOURCES[formData.cloud_provider] || [])
                  .filter(r => r.type === formData.resource_type)
                  .map(r => (
                    <option key={r.id} value={r.id}>{r.id}</option>
                  ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Resource Display Name</label>
              <select className="filter-input" style={{ width: "100%" }} value={formData.resource_name} onChange={(e) => handleInputChange("resource_name", e.target.value)}>
                {(PROVIDER_RESOURCES[formData.cloud_provider] || [])
                  .filter(r => r.type === formData.resource_type)
                  .map(r => (
                    <option key={r.name} value={r.name}>{r.name}</option>
                  ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Resource Type</label>
              <select className="filter-input" style={{ width: "100%" }} value={formData.resource_type} onChange={(e) => handleResourceTypeChange(e.target.value)}>
                {Array.from(new Set((PROVIDER_RESOURCES[formData.cloud_provider] || []).map(r => r.type))).map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Region / Location</label>
              <select className="filter-input" style={{ width: "100%" }} value={formData.region} onChange={(e) => handleInputChange("region", e.target.value)}>
                {(PROVIDER_RESOURCES[formData.cloud_provider] || [])
                  .filter(r => r.type === formData.resource_type)
                  .map(r => (
                    <option key={r.region} value={r.region}>{r.region}</option>
                  ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">User Actor Email</label>
              <select className="filter-input" style={{ width: "100%" }} value={formData.actor} onChange={(e) => handleInputChange("actor", e.target.value)}>
                {(PROVIDER_ACTORS[formData.cloud_provider] || []).map(act => (
                  <option key={act} value={act}>{act}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Caller Source IP</label>
              <select className="filter-input" style={{ width: "100%" }} value={formData.source_ip} onChange={(e) => handleInputChange("source_ip", e.target.value)}>
                {(PROVIDER_IPS[formData.cloud_provider] || []).map(ip => (
                  <option key={ip} value={ip}>{ip}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ gridColumn: "span 2" }}>
              <label className="form-label">Log Trace Description</label>
              <input type="text" className="filter-input" style={{ width: "100%" }} value={formData.description} onChange={(e) => handleInputChange("description", e.target.value)} required />
            </div>

            <div style={{ gridColumn: "span 2", display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
              <button type="submit" className="btn" disabled={loading}>
                <Zap size={14} /> Inject Normalized Log
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
