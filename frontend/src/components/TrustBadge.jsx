import { ShieldCheck, Star, UserPlus } from "lucide-react";

const CONFIG = {
  TRUSTED: { className: "chip-trusted", icon: Star, label: "Trusted" },
  REGULAR: { className: "chip-regular", icon: ShieldCheck, label: "Regular" },
  NEW:     { className: "chip-new",     icon: UserPlus,    label: "New Payee" },
};

export default function TrustBadge({ level }) {
  const cfg = CONFIG[level] || CONFIG.REGULAR;
  const Icon = cfg.icon;
  return (
    <span className={`apple-chip ${cfg.className}`}>
      <Icon size={12} />
      {cfg.label}
    </span>
  );
}
