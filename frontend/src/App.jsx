import { ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";

export default function App() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100">
      <section className="mx-auto max-w-3xl">
        <Card className="border-slate-800 bg-slate-900 text-slate-100 shadow-2xl">
          <CardHeader className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400">
                <ShieldCheck className="size-8" />
              </div>

              <div>
                <Badge variant="secondary">Sprint 5</Badge>
                <CardTitle className="mt-2 text-3xl">
                  AI-Driven KYC Automation System
                </CardTitle>
              </div>
            </div>

            <CardDescription className="text-base text-slate-400">
              React, Tailwind CSS, shadcn/ui and the frontend development
              environment are ready.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
              <p className="font-medium text-emerald-400">
                Frontend foundation initialized successfully
              </p>
              <p className="mt-2 text-sm text-slate-400">
                Next: authentication, protected routes and the Administrator
                review queue.
              </p>
            </div>
          </CardContent>

          <CardFooter>
            <Button>Continue to Administrator Review Queue</Button>
          </CardFooter>
        </Card>
      </section>
    </main>
  );
}