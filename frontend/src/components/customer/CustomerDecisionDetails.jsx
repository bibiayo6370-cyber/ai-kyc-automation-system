import { CheckCircle2, Clock3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/formatters";

export default function CustomerDecisionDetails({ decision }) {
  if (!decision?.isFinal) {
    return (
      <Card className="border-slate-800 bg-slate-900 text-slate-100">
        <CardContent className="flex items-start gap-4 p-6">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-sky-500/10 text-sky-300">
            <Clock3 className="size-5" />
          </div>

          <div>
            <p className="font-medium">Final decision pending</p>
            <p className="mt-1 text-sm text-slate-400">
              You will see the final outcome here when the review is complete.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-800 bg-slate-900 text-slate-100">
      <CardHeader>
        <div className="flex items-center gap-3">
          <CheckCircle2 className="size-5 text-emerald-400" />
          <CardTitle>Final decision details</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Decision date
          </p>
          <p className="mt-1 text-sm text-slate-200">
            {formatDate(decision.reviewDate)}
          </p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Review comments
          </p>

          <p className="mt-2 whitespace-pre-wrap rounded-lg border border-slate-800 bg-slate-950 p-4 text-sm leading-6 text-slate-300">
            {decision.reviewComments || "No additional review comments were provided."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}