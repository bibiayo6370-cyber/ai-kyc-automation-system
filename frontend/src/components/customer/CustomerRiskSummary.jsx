import { Info, ShieldCheck } from "lucide-react";
import RiskBadge from "@/components/admin/RiskBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatLabel } from "@/lib/formatters";

function DetailItem({ label, value }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-slate-200">{value ?? "—"}</dd>
    </div>
  );
}

export default function CustomerRiskSummary({ assessment }) {
  if (!assessment) {
    return (
      <Card className="border-dashed border-slate-700 bg-slate-900 text-slate-100">
        <CardContent className="flex flex-col items-center px-6 py-12 text-center">
          <ShieldCheck className="size-10 text-slate-500" />
          <h3 className="mt-4 font-semibold">Assessment not yet available</h3>
          <p className="mt-2 max-w-md text-sm text-slate-400">
            A risk summary will appear after your document has been processed.
          </p>
        </CardContent>
      </Card>
    );
  }

  const reasons = assessment.assessmentReasons ?? [];

  return (
    <Card className="border-slate-800 bg-slate-900 text-slate-100">
      <CardHeader>
        <div className="flex items-center gap-3">
          <ShieldCheck className="size-5 text-emerald-400" />
          <CardTitle>Application risk summary</CardTitle>
        </div>

        <p className="text-sm text-slate-400">
          This summary contains only information approved for customer display.
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="flex flex-col gap-5 rounded-xl border border-slate-800 bg-slate-950 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-slate-400">Risk score</p>
            <p className="mt-1 text-4xl font-semibold">
              {typeof assessment.riskScore === "number"
                ? `${assessment.riskScore}/100`
                : "—"}
            </p>
          </div>

          <RiskBadge riskLevel={assessment.riskLevel} />
        </div>

        <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <DetailItem
            label="Assessment status"
            value={formatLabel(assessment.assessmentStatus)}
          />
          <DetailItem
            label="Recommendation"
            value={formatLabel(assessment.recommendation)}
          />
          <DetailItem
            label="Additional review"
            value={assessment.reviewRequired ? "Required" : "Not required"}
          />
          <DetailItem
            label="Assessed"
            value={formatDate(assessment.assessedAt)}
          />
        </dl>

        {reasons.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-slate-200">
              Assessment notes
            </h3>

            <ul className="mt-3 space-y-3">
              {reasons.map((reason, index) => (
                <li
                  key={`${reason}-${index}`}
                  className="flex gap-3 rounded-lg border border-slate-800 bg-slate-950 p-4"
                >
                  <Info className="mt-0.5 size-5 shrink-0 text-sky-400" />
                  <span className="text-sm leading-6 text-slate-300">
                    {reason}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}