import React, { useState } from "react";
import { Activity, AlertOctagon } from "lucide-react";
import type { RegionalHealthItem, InstanceMapNode } from "../types";
import darkWorldMap from "../assets/dark_world_map.jpg";

interface MapProps {
  regionalData?: RegionalHealthItem[];
  instanceNodes?: InstanceMapNode[];
  title?: string;
}

export default function RegionalDeploymentMap({ regionalData = [], instanceNodes = [], title = "LIVE MULTI-CLOUD INSTANCE MAP" }: MapProps) {
  const [selectedNode, setSelectedNode] = useState<InstanceMapNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<InstanceMapNode | null>(null);

  // Fallback instance nodes matching backend database workloads if loading
  const nodesToRender: InstanceMapNode[] = instanceNodes.length > 0 ? instanceNodes : [
    { id: "inst-sap-99", name: "vm-sap-prod", cloud_provider: "GCP", resource_type: "VM", region: "asia-south1-a", status: "ACTIVE", health: "HEALTHY", latitude: 19.0760, longitude: 72.8777 },
    { id: "inst-web-101", name: "vm-web-dev", cloud_provider: "GCP", resource_type: "VM", region: "asia-east1-b", status: "ACTIVE", health: "HEALTHY", latitude: 25.0330, longitude: 121.5654 },
    { id: "sg-89472", name: "sg-gcp-web-prod", cloud_provider: "GCP", resource_type: "Security Group", region: "asia-south1-a", status: "ACTIVE", health: "HEALTHY", latitude: 22.8760, longitude: 76.8777 },
    { id: "vpc-87291", name: "vpc-gcp-production", cloud_provider: "GCP", resource_type: "VPC", region: "us-central1", status: "ACTIVE", health: "HEALTHY", latitude: 41.8781, longitude: -87.6298 },
    { id: "ecs-billing-01", name: "ecs-billing-app", cloud_provider: "Huawei Cloud", resource_type: "ECS", region: "ap-southeast-3", status: "ACTIVE", health: "HEALTHY", latitude: -6.2088, longitude: 106.8456 },
    { id: "ecs-router-02", name: "ecs-sap-router", cloud_provider: "Huawei Cloud", resource_type: "ECS", region: "ap-southeast-3", status: "STOPPED", health: "UNHEALTHY", latitude: -3.5088, longitude: 109.8456, active_alert: "Production ECS Instance Stopped Unscheduled" },
    { id: "backup-db-prod", name: "hw-backup-db", cloud_provider: "Huawei Cloud", resource_type: "Backup", region: "cn-north-4", status: "ACTIVE", health: "HEALTHY", latitude: 39.9042, longitude: 116.4074 },
    { id: "app-entra-783921", name: "WiSys Azure Sync Integration App", cloud_provider: "Microsoft Entra ID", resource_type: "Application", region: "global", status: "ACTIVE", health: "HEALTHY", latitude: 24.7136, longitude: 46.6753 }
  ];

  // Precise projection mapping lat/lng to 800x450 canvas matching dark_world_map.jpg
  const projectCoords = (lat: number, lng: number) => {
    const x = 415 + (lng * (350 / 180));
    const y = 225 - (lat * (175 / 80));
    const clampedX = Math.max(30, Math.min(770, x));
    const clampedY = Math.max(30, Math.min(420, y));
    return { x: clampedX, y: clampedY };
  };

  const activeNode = hoveredNode || selectedNode;
  const healthyCount = nodesToRender.filter(n => n.health === "HEALTHY").length;
  const unhealthyCount = nodesToRender.filter(n => n.health === "UNHEALTHY").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%" }}>
      <div className="card-header" style={{ marginBottom: "2px" }}>
        <span className="card-title" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Activity size={14} style={{ color: "#00F0FF" }} />
          {title}
        </span>
        <div style={{ display: "flex", gap: "12px", fontSize: "10.5px", fontWeight: "700" }}>
          <span style={{ color: "#10B981", display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#10B981", display: "inline-block", boxShadow: "0 0 8px #10B981" }}></span> Healthy Instance ({healthyCount})
          </span>
          <span style={{ color: "#FF4D4D", display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#FF4D4D", display: "inline-block", boxShadow: "0 0 8px #FF4D4D" }}></span> Unhealthy Instance ({unhealthyCount})
          </span>
        </div>
      </div>

      {/* Real Dark World Map Background Image Container */}
      <div style={{ position: "relative", width: "100%", height: "240px", backgroundColor: "#060A12", borderRadius: "6px", border: "1px solid var(--border-color)", overflow: "hidden" }}>
        {/* Real World Map Image */}
        <img 
          src={darkWorldMap} 
          alt="Real Dark World Map" 
          style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.85 }} 
        />

        {/* Overlay SVG Canvas for Telemetry Arcs, Instance Dots, and Labels */}
        <svg width="100%" height="100%" viewBox="0 0 800 450" preserveAspectRatio="none" style={{ position: "absolute", top: 0, left: 0 }}>
          {/* Telemetry Arc Lines between instances and Riyadh HQ */}
          {nodesToRender.map((node, idx) => {
            const hqPos = projectCoords(24.7136, 46.6753); // Riyadh HQ
            const pos = projectCoords(node.latitude, node.longitude);
            const isUnhealthy = node.health === "UNHEALTHY";

            return (
              <path
                key={`arc-${idx}`}
                d={`M ${pos.x} ${pos.y} Q ${(pos.x + hqPos.x) / 2} ${(pos.y + hqPos.y) / 2 - 40} ${hqPos.x} ${hqPos.y}`}
                fill="none"
                stroke={isUnhealthy ? "#FF4D4D" : "rgba(0, 240, 255, 0.5)"}
                strokeWidth={isUnhealthy ? "2.2" : "1.2"}
                strokeDasharray={isUnhealthy ? "5,3" : "none"}
              />
            );
          })}

          {/* Instance Node Dots & Instance Name Text Labels */}
          {nodesToRender.map((node, idx) => {
            const pos = projectCoords(node.latitude, node.longitude);
            const isUnhealthy = node.health === "UNHEALTHY";
            const color = isUnhealthy ? "#FF4D4D" : "#10B981";
            const isSelected = selectedNode?.id === node.id;

            return (
              <g
                key={`instance-${idx}`}
                style={{ cursor: "pointer" }}
                onMouseEnter={() => setHoveredNode(node)}
                onMouseLeave={() => setHoveredNode(null)}
                onClick={() => setSelectedNode(node)}
              >
                {/* Glowing Pulse Aura */}
                <circle cx={pos.x} cy={pos.y} r={isUnhealthy ? "11" : "8"} fill={color} opacity="0.4">
                  <animate attributeName="r" values={isUnhealthy ? "7;14;7" : "6;10;6"} dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.6;0.2;0.6" dur="2s" repeatCount="indefinite" />
                </circle>

                {/* Main Instance Dot */}
                <circle cx={pos.x} cy={pos.y} r="5" fill={color} stroke="#FFFFFF" strokeWidth={isSelected ? "2" : "1.2"} />

                {/* Instance Name Label written directly beside the dot */}
                <text
                  x={pos.x + 9}
                  y={pos.y + 4}
                  fill={isUnhealthy ? "#FF4D4D" : "#FFFFFF"}
                  fontSize="11"
                  fontWeight="800"
                  fontFamily="JetBrains Mono, monospace"
                  style={{ textShadow: "0 0 8px #000, 0 0 4px #000, 0 0 2px #000" }}
                >
                  {node.name}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover / Click Detail Popover */}
        {activeNode && (
          <div
            style={{
              position: "absolute",
              bottom: "10px",
              left: "10px",
              backgroundColor: "rgba(9, 13, 24, 0.95)",
              border: `1px solid ${activeNode.health === "UNHEALTHY" ? "#FF4D4D" : "#10B981"}`,
              borderRadius: "6px",
              padding: "10px 14px",
              maxWidth: "300px",
              boxShadow: "0 0 20px rgba(0, 0, 0, 0.9)",
              zIndex: 20
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
              <span style={{ fontWeight: "800", fontSize: "12.5px", color: "#FFF", fontFamily: "var(--font-mono)" }}>{activeNode.name}</span>
              <span className={`badge ${activeNode.health === "UNHEALTHY" ? "badge-critical" : "badge-ok"}`} style={{ fontSize: "9px" }}>
                {activeNode.health}
              </span>
            </div>
            
            <div style={{ fontSize: "10.5px", color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: "2px" }}>
              <div>Tenant: <strong style={{ color: "#00F0FF" }}>{activeNode.cloud_provider}</strong> | Region: <strong>{activeNode.region}</strong></div>
              <div>Type: <strong>{activeNode.resource_type}</strong> | State: <strong>{activeNode.status}</strong></div>
              {activeNode.active_alert && (
                <div style={{ color: "#FF4D4D", marginTop: "4px", fontWeight: "700", display: "flex", alignItems: "center", gap: "4px" }}>
                  <AlertOctagon size={12} /> Alert: {activeNode.active_alert}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Instance Workload Summary Bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "6px" }}>
        {nodesToRender.slice(0, 6).map((node) => (
          <div 
            key={node.id}
            style={{
              backgroundColor: "var(--bg-card-alt)",
              border: `1px solid ${node.health === "UNHEALTHY" ? "rgba(255, 77, 77, 0.4)" : "var(--border-color)"}`,
              borderRadius: "5px",
              padding: "6px 8px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              cursor: "pointer"
            }}
            onClick={() => setSelectedNode(node)}
          >
            <div>
              <div style={{ fontSize: "11px", fontWeight: "700", color: "#FFF", fontFamily: "var(--font-mono)" }}>{node.name}</div>
              <div style={{ fontSize: "9px", color: "var(--text-secondary)" }}>
                {node.cloud_provider} ({node.region})
              </div>
            </div>
            <span className={`badge ${node.health === "UNHEALTHY" ? "badge-critical" : "badge-ok"}`} style={{ fontSize: "8.5px" }}>
              {node.health}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
