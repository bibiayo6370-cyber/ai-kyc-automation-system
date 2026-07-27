import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ReviewQueuePagination({
  pagination,
  isLoading,
  onPageChange
}) {
  const { page = 1, limit = 10, totalItems = 0, totalPages = 0 } = pagination;
  const displayTotalPages = Math.max(totalPages, 1);
  const firstItem = totalItems === 0 ? 0 : (page - 1) * limit + 1;
  const lastItem = Math.min(page * limit, totalItems);

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-900 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-slate-400" aria-live="polite">
        Showing {firstItem}–{lastItem} of {totalItems} applications
      </p>

      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-slate-700 bg-transparent text-slate-200 hover:bg-slate-800 hover:text-white"
          disabled={isLoading || page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="size-4" />
          Previous
        </Button>

        <p className="min-w-24 text-center text-sm text-slate-300">
          Page {page} of {displayTotalPages}
        </p>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-slate-700 bg-transparent text-slate-200 hover:bg-slate-800 hover:text-white"
          disabled={isLoading || totalPages === 0 || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}