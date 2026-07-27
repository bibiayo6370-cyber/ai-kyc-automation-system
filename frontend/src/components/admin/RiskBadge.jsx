import { Badge } from "@/components/ui/badge";

const RISK_STYLES = {
  high: "border-red-500/30 bg-red-500/10 text-red-300",
  medium: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  low: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
};

export default function RiskBadge({ riskLevel }) {
  const normalizedRiskLevel = String(riskLevel ?? "").toLowerCase();
  const label = normalizedRiskLevel
    ? `${normalizedRiskLevel.charAt(0).toUpperCase()}${normalizedRiskLevel.slice(1)}`
    : "Unknown";

  return (
    <Badge
      variant="outline"
      className={
        RISK_STYLES[normalizedRiskLevel] ??
        "border-slate-700 bg-slate-800 text-slate-300"
      }
    >
      {label}
    </Badge>
  );
}