import { Eye } from "lucide-react";
import { Link } from "react-router";
import RiskBadge from "@/components/admin/RiskBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function formatLabel(value) {
  if (!value) return "—";

  return String(value)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatRiskScore(value) {
  return typeof value === "number" ? `${value}/100` : "—";
}

export default function ReviewQueueTable({ queue }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
      <Table>
        <TableHeader>
          <TableRow className="border-slate-800 hover:bg-transparent">
            <TableHead className="min-w-64 text-slate-400">
              Customer
            </TableHead>
            <TableHead className="min-w-44 text-slate-400">
              Submitted
            </TableHead>
            <TableHead className="text-slate-400">Risk</TableHead>
            <TableHead className="text-slate-400">Score</TableHead>
            <TableHead className="min-w-36 text-slate-400">
              Recommendation
            </TableHead>
            <TableHead className="text-slate-400">Status</TableHead>
            <TableHead className="text-right text-slate-400">
              Action
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {queue.map((item) => (
            <TableRow
              key={item.applicationId}
              className="border-slate-800 hover:bg-slate-800/40"
            >
              <TableCell>
                <p className="font-medium text-slate-100">
                  {item.submittedName}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {item.customer?.email ?? "No email available"}
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  Ref: {String(item.applicationId).slice(-8).toUpperCase()}
                </p>
              </TableCell>

              <TableCell className="text-sm text-slate-300">
                {formatDate(item.submittedAt)}
              </TableCell>

              <TableCell>
                <RiskBadge riskLevel={item.riskAssessment?.riskLevel} />
              </TableCell>

              <TableCell className="font-medium text-slate-100">
                {formatRiskScore(item.riskAssessment?.riskScore)}
              </TableCell>

              <TableCell className="text-sm text-slate-300">
                {formatLabel(item.riskAssessment?.recommendation)}
              </TableCell>

              <TableCell>
                <Badge
                  variant="outline"
                  className="border-sky-500/30 bg-sky-500/10 text-sky-300"
                >
                  {formatLabel(item.applicationStatus)}
                </Badge>
              </TableCell>

              <TableCell className="text-right">
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="border-slate-700 bg-transparent text-slate-200 hover:bg-slate-800 hover:text-white"
                >
                  <Link to={`/admin/applications/${item.applicationId}`}>
                    <Eye className="size-4" />
                    View
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}