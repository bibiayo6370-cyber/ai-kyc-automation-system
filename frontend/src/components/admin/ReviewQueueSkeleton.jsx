import { Skeleton } from "@/components/ui/skeleton";

const SKELETON_ROWS = [1, 2, 3, 4, 5];

export default function ReviewQueueSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
      <div className="space-y-3 p-5">
        {SKELETON_ROWS.map((row) => (
          <div
            key={row}
            className="grid gap-3 rounded-lg border border-slate-800 p-4 md:grid-cols-7"
          >
            <Skeleton className="h-10 md:col-span-2" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        ))}
      </div>
    </div>
  );
}