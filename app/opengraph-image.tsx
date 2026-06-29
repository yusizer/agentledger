import { ImageResponse } from "next/og";

export const alt = "AgentLedger — tamper-evident attestation ledger for AI agents";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #0b0f1a 0%, #121829 100%)",
          padding: "72px",
          color: "#e5e7eb",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "#6366f1",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 30,
              fontWeight: 800,
              color: "white",
            }}
          >
            A
          </div>
          <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: -0.5, display: "flex" }}>
            Agent<span style={{ color: "#6366f1" }}>Ledger</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 64, fontWeight: 800, lineHeight: 1.05, maxWidth: 980, display: "flex" }}>
            Prove what your <span style={{ color: "#6366f1" }}>AI agents</span> did.
          </div>
          <div style={{ fontSize: 28, color: "#9aa6cc", maxWidth: 880 }}>
            Tamper-evident hash-chain of agent actions on Amazon Aurora DSQL. Verify trust, detect tamper in seconds.
          </div>
        </div>

        <div style={{ display: "flex", gap: 16, fontSize: 24, fontWeight: 600 }}>
          <span style={{ color: "#e5e7eb" }}>hash-chain receipts</span>
          <span style={{ color: "#4f46e5" }}>·</span>
          <span style={{ color: "#10b981" }}>Aurora DSQL OCC</span>
          <span style={{ color: "#4f46e5" }}>·</span>
          <span style={{ color: "#9aa6cc" }}>v0 + Vercel</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
