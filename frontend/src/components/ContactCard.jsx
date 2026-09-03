import { useNavigate } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import TrustBadge from "./TrustBadge";
import VerifiedBadge from "./VerifiedBadge";

function maskId(id) {
  if (!id) return "—";
  if (id.length <= 6) return id;
  return id.slice(0, 3) + "••••" + id.slice(-3);
}

function getInitials(name) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function ContactCard({ contact }) {
  const navigate = useNavigate();
  const { accountId, upiId, displayName, isVerified, transferCount, trustLevel, lastTransferAt } =
    contact;

  return (
    <div className="store-utility-card" style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        {/* Left: Avatar & Info */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* Subtle Apple-style monochrome avatar chip */}
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              backgroundColor: "var(--color-canvas-parchment)",
              border: "1px solid var(--color-hairline)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 600,
              fontSize: 15,
              color: "var(--color-ink)",
              flexShrink: 0,
              letterSpacing: "-0.01em",
            }}
          >
            {getInitials(displayName)}
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 3 }}>
              <span style={{ fontWeight: 600, fontSize: 16, color: "var(--color-ink)", letterSpacing: "-0.015em" }}>
                {displayName}
              </span>
              <VerifiedBadge verified={isVerified} />
              {transferCount === 0 && (
                <span className="apple-chip chip-new">First-Time</span>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, color: "var(--color-body-muted)", fontFamily: "monospace" }}>
                {maskId(upiId || accountId)}
              </span>
              <TrustBadge level={trustLevel} />
              {transferCount > 0 && (
                <span style={{ fontSize: 12, color: "var(--color-ink-muted-48)" }}>
                  • {transferCount} prior transfer{transferCount > 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Apple Blue Pill Action */}
        <button
          className="button-primary"
          style={{ padding: "8px 18px", fontSize: 14 }}
          onClick={() => navigate(`/send/${accountId}`)}
          aria-label={`Transfer funds to ${displayName}`}
        >
          Send
          <ArrowUpRight size={14} />
        </button>
      </div>
    </div>
  );
}
