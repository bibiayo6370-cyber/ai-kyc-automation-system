import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import useAuth from "@/hooks/useAuth";

export default function CustomerDashboardPage() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100">
      <Card className="mx-auto max-w-2xl border-slate-800 bg-slate-900 text-slate-100">
        <CardHeader>
          <CardTitle>Customer route access verified</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
            <p className="font-medium">{user.fullName}</p>
            <p className="text-sm text-slate-400">{user.email}</p>
            <p className="mt-2 text-sm text-emerald-400">Role: {user.role}</p>
          </div>

          <Button onClick={handleLogout}>Sign out</Button>
        </CardContent>
      </Card>
    </main>
  );
}