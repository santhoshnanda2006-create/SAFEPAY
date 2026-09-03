import { Link, useLocation, useNavigate } from "react-router-dom";
import { Shield, ShieldAlert, Clock, ArrowUpRight, Plus, Search, User } from "lucide-react";

export default function Navbar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  return (
    <header>
      {/* ── Global Nav (44px pure black Apple header) ── */}
      <nav className="global-nav">
        <div className="global-nav-container">
          <Link to="/" className="global-nav-brand">
            <Shield size={16} color="#2997ff" />
            <span>SafePay</span>
          </Link>

          <div className="global-nav-links">
            <Link to="/" className={`global-nav-link ${pathname === "/" ? "active" : ""}`}>
              Contacts
            </Link>
            <Link to="/history" className={`global-nav-link ${pathname === "/history" ? "active" : ""}`}>
              Transactions
            </Link>
            <span className="global-nav-link" style={{ opacity: 0.5, cursor: "default" }}>
              Security Engine
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", fontFamily: "monospace" }}>
              ₹2,45,000.00
            </span>
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: "50%",
                backgroundColor: "rgba(255,255,255,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
              }}
            >
              <User size={13} />
            </div>
          </div>
        </div>
      </nav>

      {/* ── Sub-Nav (52px frosted glass parchment with hairline divider) ── */}
      <div className="sub-nav-frosted">
        <div className="sub-nav-container">
          <Link to="/" className="sub-nav-title">
            Adaptive Fraud Shield
          </Link>

          <div className="sub-nav-actions">
            <Link
              to="/"
              style={{
                fontSize: 14,
                color: pathname === "/" ? "var(--color-ink)" : "var(--color-body-muted)",
                textDecoration: "none",
                fontWeight: pathname === "/" ? 600 : 400,
                marginRight: 8,
              }}
            >
              Payees
            </Link>
            <Link
              to="/history"
              style={{
                fontSize: 14,
                color: pathname === "/history" ? "var(--color-ink)" : "var(--color-body-muted)",
                textDecoration: "none",
                fontWeight: pathname === "/history" ? 600 : 400,
                marginRight: 16,
              }}
            >
              Audit Trail
            </Link>
            <button
              className="button-primary"
              style={{ padding: "7px 18px", fontSize: 13 }}
              onClick={() => navigate("/send")}
            >
              <Plus size={14} />
              Send Money
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
