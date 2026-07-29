import { ClipboardCheck, ShieldCheck, UserCheck } from "lucide-react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const summaryItems = [
  {
    title: "KYC Review Queue",
    description: "Applications awaiting Administrator review.",
    icon: ClipboardCheck
  },
  {
    title: "Secure Decisions",
    description: "Approve, reject or retain applications under review.",
    icon: ShieldCheck
  },
  {
    title: "Customer Verification",
    description: "Review identity information and automated risk results.",
    icon: UserCheck
  }
];

export default function AdminDashboardPage() {
  return (
    <section className="mx-auto max-w-7xl space-y-8">
      <div>
        <p className="text-sm font-medium text-emerald-400">
          Administrator overview
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-100">
          KYC Review Workspace
        </h2>
        <p className="mt-3 max-w-3xl text-slate-400">
          Review submitted customer applications, assess automated risk results
          and record controlled compliance decisions.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {summaryItems.map(({ title, description, icon: Icon }) => (
          <Card
            key={title}
            className="border-slate-800 bg-slate-900 text-slate-100"
          >
            <CardHeader>
              <div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                <Icon className="size-6" />
              </div>

              <CardTitle>{title}</CardTitle>
              <CardDescription className="text-slate-400">
                {description}
              </CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card className="border-slate-800 bg-slate-900 text-slate-100">
        <CardHeader>
          <CardTitle>Administrator review queue</CardTitle>
          <CardDescription className="text-slate-400">
            The application queue will display high-, medium- and low-risk KYC
            submissions in priority order.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Button asChild>
            <Link to="/admin/review-queue">Open review queue</Link>
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}