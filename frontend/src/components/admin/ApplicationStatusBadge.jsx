import { Badge } from "@/components/ui/badge";
import { formatLabel } from "@/lib/formatters";

const STATUS_STYLES = {
  pending: "border-slate-600 bg-slate-700/30 text-slate-300",
  under_review: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  approved: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  rejected: "border-red-500/30 bg-red-500/10 text-red-300"
};

export default function ApplicationStatusBadge({ status }) {
  return (
    <Badge
      variant="outline"
      className={STATUS_STYLES[status] ?? STATUS_STYLES.pending}
    >
      {formatLabel(status)}
    </Badge>
  );
}