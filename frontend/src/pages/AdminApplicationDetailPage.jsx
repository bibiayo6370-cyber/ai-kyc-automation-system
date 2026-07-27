import { useEffect, useState } from "react";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { Link, useParams } from "react-router";
import ApplicationDetailSkeleton from "@/components/admin/ApplicationDetailSkeleton";
import ApplicationDetailSummary from "@/components/admin/ApplicationDetailSummary";
import ApplicationStatusBadge from "@/components/admin/ApplicationStatusBadge";
import DocumentOcrDetails from "@/components/admin/DocumentOcrDetails";
import ApplicationAuditTimeline from "@/components/admin/ApplicationAuditTimeline";
import RiskAssessmentDetails from "@/components/admin/RiskAssessmentDetails";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { fetchAdministratorApplicationDetail } from "@/services/adminKycService";
import { formatDate } from "@/lib/formatters";

export default function AdminApplicationDetailPage() {
  const { applicationId } = useParams();
  const [detail, setDetail] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadApplicationDetail() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const data = await fetchAdministratorApplicationDetail({
          applicationId,
          signal: controller.signal
        });

        setDetail(data);
      } catch (error) {
        if (error.code !== "ERR_CANCELED") {
          setErrorMessage(
            error.response?.data?.message ??
            "Unable to retrieve the KYC application details."
          );
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    loadApplicationDetail();

    return () => controller.abort();
  }, [applicationId, reloadKey]);

  return (
    <section className="mx-auto max-w-7xl space-y-6">
      <Button
        asChild
        variant="outline"
        className="border-slate-700 bg-transparent text-slate-200 hover:bg-slate-800 hover:text-white"
      >
        <Link to="/admin/review-queue">
          <ArrowLeft className="size-4" />
          Back to review queue
        </Link>
      </Button>

      {errorMessage && (
        <Alert variant="destructive">
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>{errorMessage}</span>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-red-400/50 bg-transparent text-red-200 hover:bg-red-950 hover:text-white"
              onClick={() => setReloadKey((value) => value + 1)}
            >
              <RefreshCw className="size-4" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {isLoading && <ApplicationDetailSkeleton />}

      {!isLoading && !errorMessage && detail && (
        <>
          <div className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-900 p-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-medium text-emerald-400">
                Administrator application review
              </p>

              <h2 className="mt-2 text-3xl font-semibold tracking-tight">
                {detail.application.fullName}
              </h2>

              <p className="mt-2 break-all text-sm text-slate-500">
                Application ID: {detail.application.id}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Submitted: {formatDate(detail.application.submittedAt)}
              </p>
            </div>

            <ApplicationStatusBadge status={detail.application.applicationStatus} />
          </div>

          <ApplicationDetailSummary
            application={detail.application}
            customer={detail.customer}
          />

          <DocumentOcrDetails document={detail.document} />

          <RiskAssessmentDetails assessment={detail.riskAssessment} />

          <ApplicationAuditTimeline auditTrail={detail.auditTrail} />
        </>
      )}
    </section>
  );
}