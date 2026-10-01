import React from "react";
import { ShieldCheck, ShieldAlert, Shield, Info } from "lucide-react";
import type { SecurityScoreData } from "../types";

interface SecurityScoreProps {
  scoreData: SecurityScoreData | null;
}

export default function SecurityScore({ scoreData }: SecurityScoreProps) {
  if (!scoreData) {
    return <div style={{ color: "var(--text-secondary)" }}>Loading posture compliance scoring...</div>;
  }

  const getScoreRating = (val: number) => {
    if (val >= 90) return { label: "EXCELLENT", color: "var(--severity-ok)" };
    if (val >= 70) return { label: "WARNING", color: "var(--severity-warning)" };
    return { label: "CRITICAL DANGER", color: "var(--severity-critical)" };
  };

  const rating = getScoreRating(scoreData.score);

  return (
    <div>
      <div style={{ marginBottom: "20px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "700" }}>Infrastructure Security Score & Compliance</h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "13px" }}>Real-time evaluation of infrastructure safety policies based on CIS benchmarks</p>
      </div>

      {/* Main Score Card */}
      <div className="card" style={{ marginBottom: "24px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "32px", padding: "30px" }}>
        <div className="score-circle" style={{ borderColor: rating.color, width: "140px", height: "140px" }}>
          <span className="score-value" style={{ color: rating.color, fontSize: "42px" }}>{scoreData.score}</span>
          <span className="score-label">Compliance</span>
        </div>

        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: "18px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
            Security Posture State: <span style={{ color: rating.color }}>{rating.label}</span>
          </h3>
          <p style={{ color: "var(--text-secondary)", fontSize: "13px", marginTop: "8px", maxWidth: "600px" }}>
            This evaluation scans active alerting triggers, resource states, logging sink configurations, and identity modifications. 
            Points are deducted for open incidents (e.g. stopped virtual machine nodes, deleted network networks, or disabled logging tracers). Acknowledging incidents mitigates the deduction by 50%.
          </p>
        </div>
      </div>

      {/* Checklist Sections */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "16px" }}>
        
        {/* FAILED CHECKS */}
        {scoreData.failed_checks.length > 0 && (
          <div className="card" style={{ borderLeft: "4px solid var(--severity-critical)" }}>
            <h4 style={{ color: "var(--severity-critical)", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
              <ShieldAlert size={18} /> Failed Compliance Controls ({scoreData.failed_checks.length})
            </h4>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {scoreData.failed_checks.map(check => (
                <div key={check.id} style={{ backgroundColor: "rgba(239, 68, 68, 0.05)", border: "1px solid rgba(239, 68, 68, 0.15)", padding: "16px", borderRadius: "6px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <strong style={{ fontSize: "14px" }}>{check.name}</strong>
                    <span className="badge badge-critical">-{check.points_deducted} Points</span>
                  </div>
                  <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "8px" }}>{check.description}</p>
                  <div style={{ display: "flex", gap: "6px", alignItems: "flex-start", fontSize: "12px", color: "#fca5a5" }}>
                    <Info size={12} style={{ flexShrink: 0, marginTop: "2px" }} />
                    <span><strong>Reason:</strong> {check.explanation}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* WARNING CHECKS */}
        {scoreData.warning_checks.length > 0 && (
          <div className="card" style={{ borderLeft: "4px solid var(--severity-warning)" }}>
            <h4 style={{ color: "var(--severity-warning)", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
              <ShieldAlert size={18} /> Warning Compliance Controls ({scoreData.warning_checks.length})
            </h4>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {scoreData.warning_checks.map(check => (
                <div key={check.id} style={{ backgroundColor: "rgba(234, 179, 8, 0.05)", border: "1px solid rgba(234, 179, 8, 0.15)", padding: "16px", borderRadius: "6px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <strong style={{ fontSize: "14px" }}>{check.name}</strong>
                    <span className="badge badge-warning">-{check.points_deducted} Points (Mitigated)</span>
                  </div>
                  <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "8px" }}>{check.description}</p>
                  <div style={{ display: "flex", gap: "6px", alignItems: "flex-start", fontSize: "12px", color: "#fde047" }}>
                    <Info size={12} style={{ flexShrink: 0, marginTop: "2px" }} />
                    <span><strong>Reason:</strong> {check.explanation}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PASSED CHECKS */}
        <div className="card" style={{ borderLeft: "4px solid var(--severity-ok)" }}>
          <h4 style={{ color: "var(--severity-ok)", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
            <ShieldCheck size={18} /> Passed Compliance Controls ({scoreData.passed_checks.length})
          </h4>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            {scoreData.passed_checks.map(check => (
              <div key={check.id} style={{ backgroundColor: "rgba(16, 185, 129, 0.03)", border: "1px solid rgba(16, 185, 129, 0.1)", padding: "12px", borderRadius: "6px" }}>
                <strong style={{ fontSize: "13px" }}>{check.name}</strong>
                <p style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px" }}>{check.description}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
