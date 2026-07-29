import { AlertTriangle, CheckCircle2, ListChecks, ShieldAlert } from "lucide-react";
import RiskBadge from "@/components/admin/RiskBadge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatLabel } from "@/lib/formatters";

function DetailItem({ label, value }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm text-slate-200">
        {value ?? "—"}
      </dd>
    </div>
  );
}

function formatBoolean(value) {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return "—";
}

function getSeverityClass(severity) {
  const classes = {
    critical: "border-red-500/30 bg-red-500/10 text-red-300",
    high: "border-orange-500/30 bg-orange-500/10 text-orange-300",
    medium: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    low: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
  };

  return classes[severity] ?? "border-slate-700 bg-slate-800 text-slate-300";
}

export default function RiskAssessmentDetails({ assessment }) {
  if (!assessment) {
    return (
      <Card className="border-dashed border-slate-700 bg-slate-900 text-slate-100">
        <CardContent className="flex flex-col items-center px-6 py-12 text-center">
          <ShieldAlert className="size-10 text-slate-500" />
          <h3 className="mt-4 font-semibold">No risk assessment available</h3>
          <p className="mt-2 text-sm text-slate-400">
            Automated risk assessment information has not been recorded.
          </p>
        </CardContent>
      </Card>
    );
  }

  const factors = assessment.riskFactors ?? [];
  const reasons = assessment.assessmentReasons ?? [];
  const watchlist = assessment.watchlistScreening ?? {};
  const snapshot = assessment.inputSnapshot ?? {};

  return (
    <div className="space-y-6">
      <Card className="border-slate-800 bg-slate-900 text-slate-100">
        <CardHeader>
          <div className="flex items-center gap-3">
            <ShieldAlert className="size-5 text-emerald-400" />
            <CardTitle>Internal risk assessment</CardTitle>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="flex flex-col gap-5 rounded-xl border border-slate-800 bg-slate-950 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-slate-400">Overall risk score</p>
              <p className="mt-1 text-4xl font-semibold text-slate-100">
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
              label="Manual review required"
              value={formatBoolean(assessment.reviewRequired)}
            />
            <DetailItem
              label="Rules version"
              value={assessment.rulesVersion}
            />
            <DetailItem
              label="Assessed"
              value={formatDate(assessment.assessedAt)}
            />
            <DetailItem
              label="Assessment created"
              value={formatDate(assessment.createdAt)}
            />
            <DetailItem
              label="Last updated"
              value={formatDate(assessment.updatedAt)}
            />
            <DetailItem
              label="Assessment ID"
              value={assessment.id}
            />
          </dl>

          {assessment.assessmentError && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
              {assessment.assessmentError}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-slate-800 bg-slate-900 text-slate-100">
          <CardHeader>
            <div className="flex items-center gap-3">
              <AlertTriangle className="size-5 text-amber-400" />
              <CardTitle>Risk factors</CardTitle>
            </div>
          </CardHeader>

          <CardContent>
            {factors.length === 0 ? (
              <p className="text-sm text-slate-400">
                No individual risk factors were recorded.
              </p>
            ) : (
              <div className="space-y-4">
                {factors.map((factor, index) => (
                  <div
                    key={`${factor.code}-${index}`}
                    className="rounded-lg border border-slate-800 bg-slate-950 p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className={getSeverityClass(factor.severity)}
                      >
                        {formatLabel(factor.severity)}
                      </Badge>

                      <Badge
                        variant="outline"
                        className="border-slate-700 bg-slate-800 text-slate-300"
                      >
                        {formatLabel(factor.category)}
                      </Badge>

                      {factor.isOverride && (
                        <Badge
                          variant="outline"
                          className="border-red-500/30 bg-red-500/10 text-red-300"
                        >
                          Override
                        </Badge>
                      )}
                    </div>

                    <p className="mt-3 font-medium text-slate-100">
                      {formatLabel(factor.code)}
                    </p>

                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      {factor.description}
                    </p>

                    <p className="mt-3 text-sm text-slate-300">
                      Score impact: {factor.scoreImpact ?? 0}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900 text-slate-100">
          <CardHeader>
            <div className="flex items-center gap-3">
              <ListChecks className="size-5 text-emerald-400" />
              <CardTitle>Assessment reasons</CardTitle>
            </div>
          </CardHeader>

          <CardContent>
            {reasons.length === 0 ? (
              <p className="text-sm text-slate-400">
                No assessment reasons were recorded.
              </p>
            ) : (
              <ul className="space-y-3">
                {reasons.map((reason, index) => (
                  <li
                    key={`${reason}-${index}`}
                    className="flex gap-3 rounded-lg border border-slate-800 bg-slate-950 p-4"
                  >
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-400" />
                    <span className="text-sm leading-6 text-slate-300">
                      {reason}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-slate-800 bg-slate-900 text-slate-100">
          <CardHeader>
            <CardTitle>Simulated watchlist screening</CardTitle>
          </CardHeader>

          <CardContent>
            <dl className="grid gap-5 sm:grid-cols-2">
              <DetailItem
                label="Screening status"
                value={formatLabel(watchlist.status)}
              />
              <DetailItem
                label="Reference ID"
                value={watchlist.referenceId}
              />
              <DetailItem
                label="Matched name"
                value={watchlist.matchedName}
              />
              <DetailItem
                label="Simulated screening"
                value={formatBoolean(watchlist.simulated)}
              />
              <DetailItem
                label="Screened"
                value={formatDate(watchlist.screenedAt)}
              />
            </dl>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900 text-slate-100">
          <CardHeader>
            <CardTitle>Assessment input snapshot</CardTitle>
          </CardHeader>

          <CardContent>
            <dl className="grid gap-5 sm:grid-cols-2">
              <DetailItem
                label="Document type"
                value={formatLabel(snapshot.documentType)}
              />
              <DetailItem
                label="OCR status"
                value={formatLabel(snapshot.ocrStatus)}
              />
              <DetailItem
                label="Extracted text present"
                value={formatBoolean(snapshot.extractedTextPresent)}
              />
              <DetailItem
                label="OCR confidence"
                value={
                  typeof snapshot.ocrConfidence === "number"
                    ? `${snapshot.ocrConfidence}%`
                    : "—"
                }
              />
              <DetailItem
                label="Verification status"
                value={formatLabel(snapshot.verificationStatus)}
              />
              <DetailItem
                label="Name match score"
                value={
                  typeof snapshot.nameMatchScore === "number"
                    ? `${snapshot.nameMatchScore}%`
                    : "—"
                }
              />
              <DetailItem
                label="Duplicate document detected"
                value={formatBoolean(snapshot.duplicateDocumentDetected)}
              />
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}