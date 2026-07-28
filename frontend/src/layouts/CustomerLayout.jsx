import { LogOut, ShieldCheck, UserRound } from "lucide-react";
import { Outlet, useNavigate } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import useAuth from "@/hooks/useAuth";

export default function CustomerLayout() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900">
        <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-4 px-4 md:px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
              <ShieldCheck className="size-6" />
            </div>

            <div>
              <p className="font-semibold">AI-KYC System</p>
              <p className="text-xs text-slate-500">Customer Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium">{user.fullName}</p>
              <p className="text-xs text-slate-500">{user.email}</p>
            </div>

            <div className="hidden size-10 items-center justify-center rounded-full bg-slate-800 text-slate-300 sm:flex">
              <UserRound className="size-5" />
            </div>

            <Badge className="hidden bg-sky-500/10 text-sky-300 sm:inline-flex">
              Customer
            </Badge>

            <Button
              type="button"
              variant="outline"
              className="border-slate-700 bg-transparent text-slate-200 hover:bg-slate-800 hover:text-white"
              onClick={handleLogout}
            >
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <Outlet />
      </main>
    </div>
  );
}