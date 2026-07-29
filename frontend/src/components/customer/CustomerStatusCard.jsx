import { CheckCircle2, Clock3, FileClock, ShieldX } from "lucide-react";
import ApplicationStatusBadge from "@/components/admin/ApplicationStatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/formatters";

const STATUS_CONFIG = {
  pending: {
    title: "Application pending",
    icon: FileClock,
    iconClass: "bg-slate-500/10 text-slate-300"
  },
  under_review: {
    title: "Application under review",
    icon: Clock3,
    iconClass: "bg-sky-500/10 text-sky-300"
  },
  approved: {
    title: "Application approved",
    icon: CheckCircle2,
    iconClass: "bg-emerald-500/10 text-emerald-300"
  },
  rejected: {
    title: "Application rejected",
    icon: ShieldX,
    iconClass: "bg-red-500/10 text-red-300"
  }
};

export default function CustomerStatusCard({ status }) {
  const config = STATUS_CONFIG[status.applicationStatus] ?? STATUS_CONFIG.pending;
  const Icon = config.icon;

  return (
    <Card className="border-slate-800 bg-slate-900 text-slate-100">
      <CardHeader>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${config.iconClass}`}>
              <Icon className="size-6" />
            </div>

            <div>
              <CardTitle className="text-2xl">{config.title}</CardTitle>
              <p className="mt-2 text-slate-400">{status.statusMessage}</p>
            </div>
          </div>

          <ApplicationStatusBadge status={status.applicationStatus} />
        </div>
      </CardHeader>

      <CardContent>
        <dl className="grid gap-5 rounded-xl border border-slate-800 bg-slate-950 p-5 sm:grid-cols-3">
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">
              Application reference
            </dt>
            <dd className="mt-1 break-all text-sm text-slate-200">
              {status.applicationId}
            </dd>
          </div>

          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">
              Submitted
            </dt>
            <dd className="mt-1 text-sm text-slate-200">
              {formatDate(status.submittedAt)}
            </dd>
          </div>

          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">
              Last updated
            </dt>
            <dd className="mt-1 text-sm text-slate-200">
              {formatDate(status.updatedAt)}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}