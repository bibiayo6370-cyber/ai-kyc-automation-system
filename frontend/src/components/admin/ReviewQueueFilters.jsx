import { Filter } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ReviewQueueFilters({
  riskLevel,
  limit,
  isLoading,
  onRiskLevelChange,
  onLimitChange
}) {
  return (
    <div className="grid gap-4 rounded-xl border border-slate-800 bg-slate-900 p-5 sm:grid-cols-2 lg:max-w-2xl">
      <div className="space-y-2">
        <Label htmlFor="risk-level-filter" className="flex items-center gap-2 text-slate-300">
          <Filter className="size-4" />
          Risk level
        </Label>

        <Select
          value={riskLevel || "all"}
          disabled={isLoading}
          onValueChange={onRiskLevelChange}
        >
          <SelectTrigger
            id="risk-level-filter"
            className="w-full border-slate-700 bg-slate-950 text-slate-100"
          >
            <SelectValue placeholder="All risk levels" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="all">All risk levels</SelectItem>
            <SelectItem value="high">High risk</SelectItem>
            <SelectItem value="medium">Medium risk</SelectItem>
            <SelectItem value="low">Low risk</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="queue-page-size" className="text-slate-300">
          Applications per page
        </Label>

        <Select
          value={String(limit)}
          disabled={isLoading}
          onValueChange={onLimitChange}
        >
          <SelectTrigger
            id="queue-page-size"
            className="w-full border-slate-700 bg-slate-950 text-slate-100"
          >
            <SelectValue />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="2">2 applications</SelectItem>
            <SelectItem value="5">5 applications</SelectItem>
            <SelectItem value="10">10 applications</SelectItem>
            <SelectItem value="20">20 applications</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}