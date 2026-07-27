import { Activity, Bot, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatLabel } from "@/lib/formatters";

function getActorName(item) {
  if (item.actor?.fullName) return item.actor.fullName;
  if (item.actorRole === "system") return "Automated system";

  return formatLabel(item.actorRole);
}

export default function ApplicationAuditTimeline({ auditTrail = [] }) {
  return (
    <Card className="border-slate-800 bg-slate-900 text-slate-100">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Activity className="size-5 text-emerald-400" />
          <CardTitle>Application audit timeline</CardTitle>
        </div>
      </CardHeader>

      <CardContent>
        {auditTrail.length === 0 ? (
          <p className="text-sm text-slate-400">
            No audit events have been recorded for this application.
          </p>
        ) : (
          <ol className="relative space-y-6 border-l border-slate-700 pl-7">
            {auditTrail.map((item) => {
              const ActorIcon =
                item.actorRole === "system" ? Bot : UserRound;

              return (
                <li key={item.id} className="relative">
                  <div className="absolute -left-10 flex size-6 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-emerald-400">
                    <ActorIcon className="size-3.5" />
                  </div>

                  <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-medium text-slate-100">
                          {formatLabel(item.action)}
                        </p>

                        <p className="mt-1 text-sm text-slate-400">
                          {getActorName(item)}
                        </p>

                        {item.actor?.email && (
                          <p className="mt-1 text-xs text-slate-500">
                            {item.actor.email}
                          </p>
                        )}
                      </div>

                      <Badge
                        variant="outline"
                        className="w-fit border-slate-700 bg-slate-800 text-slate-300"
                      >
                        {formatLabel(item.actorRole)}
                      </Badge>
                    </div>

                    {(item.previousStatus || item.newStatus) && (
                      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                        <span className="text-slate-400">
                          {formatLabel(item.previousStatus)}
                        </span>
                        <span className="text-slate-600">→</span>
                        <span className="font-medium text-slate-200">
                          {formatLabel(item.newStatus)}
                        </span>
                      </div>
                    )}

                    {item.reviewComments && (
                      <div className="mt-4 rounded-lg border border-slate-800 bg-slate-900 p-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                          Review comments
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-300">
                          {item.reviewComments}
                        </p>
                      </div>
                    )}

                    <p className="mt-4 text-xs text-slate-500">
                      {formatDate(item.createdAt)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}