import { ClipboardCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminReviewQueuePage() {
  return (
    <section className="mx-auto max-w-7xl space-y-6">
      <div>
        <p className="text-sm font-medium text-emerald-400">
          Administrator review
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight">
          KYC Review Queue
        </h2>
        <p className="mt-3 text-slate-400">
          Applications requiring Administrator review will appear here.
        </p>
      </div>

      <Card className="border-slate-800 bg-slate-900 text-slate-100">
        <CardHeader>
          <div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
            <ClipboardCheck className="size-6" />
          </div>

          <CardTitle>Review queue integration pending</CardTitle>
          <CardDescription className="text-slate-400">
            The next task will connect this page to the Administrator review
            queue API.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <p className="text-sm text-slate-400">
            Endpoint: GET /api/v1/admin/kyc/review-queue
          </p>
        </CardContent>
      </Card>
    </section>
  );
}