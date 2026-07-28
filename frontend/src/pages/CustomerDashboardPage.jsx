import { useEffect, useState } from "react";
import { FilePlus2, RefreshCw } from "lucide-react";
import CustomerDecisionDetails from "@/components/customer/CustomerDecisionDetails";
import CustomerRiskSummary from "@/components/customer/CustomerRiskSummary";
import CustomerStatusCard from "@/components/customer/CustomerStatusCard";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchCustomerApplicationStatus, fetchMyKycApplication } from "@/services/customerKycService";

export default function CustomerDashboardPage() {
  const [status, setStatus] = useState(null);
  const [hasApplication, setHasApplication] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCustomerStatus() {
      setIsLoading(true);
      setErrorMessage("");
      setHasApplication(true);

      try {
        const applicationResponse = await fetchMyKycApplication({
          signal: controller.signal
        });

        const applicationId = applicationResponse.application?._id;

        if (!applicationId) {
          throw new Error("The KYC application ID was not returned");
        }

        const statusResponse = await fetchCustomerApplicationStatus({
          applicationId,
          signal: controller.signal
        });

        setStatus(statusResponse.status);
      } catch (error) {
        if (error.code === "ERR_CANCELED") return;

        if (error.response?.status === 404) {
          setHasApplication(false);
          setStatus(null);
        } else {
          setErrorMessage(
            error.response?.data?.message ??
            error.message ??
            "Unable to retrieve your KYC application status."
          );
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    loadCustomerStatus();

    return () => controller.abort();
  }, [reloadKey]);

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-emerald-400">
            Customer application
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            KYC Application Status
          </h1>

          <p className="mt-3 max-w-3xl text-slate-400">
            Track the current progress and final outcome of your identity
            verification application.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          className="border-slate-700 bg-transparent text-slate-200 hover:bg-slate-800 hover:text-white"
          disabled={isLoading}
          onClick={() => setReloadKey((value) => value + 1)}
        >
          <RefreshCw className={`size-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh status
        </Button>
      </div>

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
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {isLoading && (
        <div className="space-y-6">
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-52 w-full" />
        </div>
      )}

      {!isLoading && !errorMessage && !hasApplication && (
        <Card className="border-dashed border-slate-700 bg-slate-900 text-slate-100">
          <CardContent className="flex flex-col items-center px-6 py-14 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-sky-500/10 text-sky-300">
              <FilePlus2 className="size-6" />
            </div>

            <h2 className="mt-4 text-lg font-semibold">
              No KYC application found
            </h2>

            <p className="mt-2 max-w-md text-sm text-slate-400">
              A submitted KYC application will appear here for tracking.
            </p>
          </CardContent>
        </Card>
      )}

      {!isLoading && !errorMessage && status && (
        <>
          <CustomerStatusCard status={status} />
          <CustomerRiskSummary assessment={status.riskAssessment} />
          <CustomerDecisionDetails decision={status.decision} />
        </>
      )}
    </section>
  );
}