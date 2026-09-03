import { CheckCircle2 } from "lucide-react";

export default function VerifiedBadge({ verified }) {
  if (!verified) return null;
  return (
    <span className="apple-chip chip-verified" title="Identity verified against official KYC records">
      <CheckCircle2 size={12} />
      Verified
    </span>
  );
}
