import { ArrowLeft, FileSearch } from "lucide-react";
import { Link, useParams } from "react-router";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";

export default function AdminApplicationDetailPlaceholderPage() {
  const { applicationId } = useParams();

  return (
    <section className="mx-auto max-w-4xl space-y-6">
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

      <Card className="border-slate-800 bg-slate-900 text-slate-100">
        <CardHeader>
          <FileSearch className="mb-3 size-10 text-emerald-400" />
          <CardTitle>Application review page</CardTitle>
          <CardDescription className="text-slate-400">
            Detailed KYC review integration will be completed in S5.12A.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <p className="text-sm text-slate-400">
            Application ID: {applicationId}
          </p>
        </CardContent>
      </Card>
    </section>
  );
}