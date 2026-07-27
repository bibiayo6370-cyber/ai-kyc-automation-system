import { LogOut, Menu, UserRound } from "lucide-react";
import { useNavigate } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import useAuth from "@/hooks/useAuth";

export default function AdminHeader({ onOpenNavigation }) {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <header className="flex min-h-20 items-center justify-between gap-4 border-b border-slate-800 bg-slate-900 px-4 md:px-6">
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="border-slate-700 bg-transparent text-slate-200 hover:bg-slate-800 hover:text-white md:hidden"
          aria-label="Open Administrator navigation"
          onClick={onOpenNavigation}
        >
          <Menu className="size-5" />
        </Button>

        <div>
          <h1 className="font-semibold text-slate-100">
            Administrator Workspace
          </h1>
          <p className="text-sm text-slate-500">
            Review and manage KYC applications
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium text-slate-100">{user.fullName}</p>
          <p className="text-xs text-slate-500">{user.email}</p>
        </div>

        <div className="hidden size-10 items-center justify-center rounded-full bg-slate-800 text-slate-300 sm:flex">
          <UserRound className="size-5" />
        </div>

        <Badge className="hidden bg-emerald-500/10 text-emerald-400 sm:inline-flex">
          Administrator
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
    </header>
  );
}