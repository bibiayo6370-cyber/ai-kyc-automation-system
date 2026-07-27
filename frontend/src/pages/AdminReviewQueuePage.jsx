import { useEffect, useState } from "react";
import { ClipboardCheck, RefreshCw } from "lucide-react";
import ReviewQueueFilters from "@/components/admin/ReviewQueueFilters";
import ReviewQueuePagination from "@/components/admin/ReviewQueuePagination";
import ReviewQueueSkeleton from "@/components/admin/ReviewQueueSkeleton";
import ReviewQueueTable from "@/components/admin/ReviewQueueTable";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { fetchAdministratorReviewQueue } from "@/services/adminKycService";

const INITIAL_PAGINATION = {
  page: 1,
  limit: 10,
  totalItems: 0,
  totalPages: 0
};

export default function AdminReviewQueuePage() {
  const [queue, setQueue] = useState([]);
  const [riskLevel, setRiskLevel] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState(INITIAL_PAGINATION);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadQueue() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const data = await fetchAdministratorReviewQueue({
          page,
          limit,
          riskLevel,
          signal: controller.signal
        });

        setQueue(data.queue ?? []);
        setPagination(data.pagination ?? {
          ...INITIAL_PAGINATION,
          page,
          limit
        });
      } catch (error) {
        if (error.code !== "ERR_CANCELED") {
          setErrorMessage(
            error.response?.data?.message ??
            "Unable to retrieve the Administrator review queue."
          );
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    loadQueue();

    return () => controller.abort();
  }, [page, limit, riskLevel, reloadKey]);

  function handleRiskLevelChange(value) {
    setRiskLevel(value === "all" ? "" : value);
    setPage(1);
  }

  function handleLimitChange(value) {
    setLimit(Number(value));
    setPage(1);
  }

  return (
    <section className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-emerald-400">
            Administrator review
          </p>

          <h2 className="mt-2 text-3xl font-semibold tracking-tight">
            KYC Review Queue
          </h2>

          <p className="mt-3 max-w-3xl text-slate-400">
            Applications are prioritized by risk level and then by the oldest
            completed assessment.
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
          Refresh queue
        </Button>
      </div>

      <Card className="border-slate-800 bg-slate-900 text-slate-100">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <p className="text-sm text-slate-400">
              Applications awaiting review
            </p>

            <p className="mt-1 text-3xl font-semibold" aria-live="polite">
              {pagination.totalItems}
            </p>
          </div>

          <p className="text-sm text-slate-500">
            Priority: High → Medium → Low
          </p>
        </CardContent>
      </Card>

      <ReviewQueueFilters
        riskLevel={riskLevel}
        limit={limit}
        isLoading={isLoading}
        onRiskLevelChange={handleRiskLevelChange}
        onLimitChange={handleLimitChange}
      />

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

      {isLoading && <ReviewQueueSkeleton />}

      {!isLoading && !errorMessage && queue.length === 0 && (
        <Card className="border-dashed border-slate-700 bg-slate-900 text-slate-100">
          <CardContent className="flex flex-col items-center px-6 py-14 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
              <ClipboardCheck className="size-6" />
            </div>

            <h3 className="mt-4 text-lg font-semibold">
              No applications awaiting review
            </h3>

            <p className="mt-2 max-w-md text-sm text-slate-400">
              {riskLevel
                ? `No ${riskLevel}-risk applications currently require review.`
                : "New applications will appear here after automated risk assessment moves them under review."}
            </p>
          </CardContent>
        </Card>
      )}

      {!isLoading && !errorMessage && queue.length > 0 && (
        <>
          <ReviewQueueTable queue={queue} />

          <ReviewQueuePagination
            pagination={pagination}
            isLoading={isLoading}
            onPageChange={setPage}
          />
        </>
      )}
    </section>
  );
}