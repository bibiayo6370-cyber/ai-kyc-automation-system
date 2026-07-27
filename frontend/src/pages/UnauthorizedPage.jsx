import { ShieldX } from "lucide-react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import useAuth from "@/hooks/useAuth";

export default function UnauthorizedPage() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const destination = user?.role === "admin" ? "/admin" : "/customer";

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-4 text-slate-100">
      <Card className="w-full max-w-lg border-slate-800 bg-slate-900 text-slate-100">
        <CardHeader>
          <ShieldX className="mb-4 size-10 text-red-400" />
          <CardTitle>Access denied</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <p className="text-slate-400">
            Your account does not have permission to access this page.
          </p>

          {user && <p className="text-sm">Authenticated role: {user.role}</p>}

          <div className="flex flex-wrap gap-3">
            <Button onClick={() => navigate(destination, { replace: true })}>
              Return to dashboard
            </Button>

            <Button
              variant="outline"
              className="border-slate-600 bg-transparent text-slate-200 hover:border-slate-500 hover:bg-slate-100 hover:text-black"
              onClick={handleLogout}
            >
              Sign out
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}