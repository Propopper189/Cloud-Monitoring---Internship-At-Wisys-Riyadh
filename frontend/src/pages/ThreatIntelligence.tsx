import React, { useState, useEffect } from "react";
import { Globe, Activity, ShieldAlert } from "lucide-react";
import RegionalDeploymentMap from "../components/RegionalDeploymentMap";
import { fetchRegionalHealth } from "../services/api";
import type { RegionalHealthItem } from "../types";

export default function ThreatIntelligence() {
  const [regionalHealth, setRegionalHealth] = useState<RegionalHealthItem[]>([]);

  const loadData = async () => {
    try {
      const data = await fetchRegionalHealth();
      setRegionalHealth(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <div style={{ marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: "18px", fontWeight: "800", color: "#FFF" }}>Multi-Cloud Regional Deployment & Health Map</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "12px" }}>Real-time telemetry map monitoring deployment regions, availability zones, and workload integrity</p>
        </div>
        <div className="status-badge status-badge-green">
          <Activity size={12} /> TELEMETRY STREAM ONLINE
        </div>
      </div>

      <div className="card" style={{ marginBottom: "16px" }}>
        <RegionalDeploymentMap regionalData={regionalHealth} title="GLOBAL DEPLOYMENT & AZ HEALTH MAP" />
      </div>
    </div>
  );
}
