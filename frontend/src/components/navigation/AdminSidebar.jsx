import { ClipboardCheck, LayoutDashboard, ShieldCheck, X } from "lucide-react";
import { NavLink } from "react-router";
import { Button } from "@/components/ui/button";

const navigationItems = [
  {
    label: "Overview",
    path: "/admin",
    icon: LayoutDashboard,
    end: true
  },
  {
    label: "Review Queue",
    path: "/admin/review-queue",
    icon: ClipboardCheck
  }
];

function getNavigationClass({ isActive }) {
  const baseClass =
    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors";

  return isActive
    ? `${baseClass} bg-emerald-500/10 text-emerald-400`
    : `${baseClass} text-slate-400 hover:bg-slate-800 hover:text-slate-100`;
}

export default function AdminSidebar({ isMobileOpen, onClose }) {
  return (
    <>
      {isMobileOpen && (
        <button
          type="button"
          aria-label="Close Administrator navigation"
          className="fixed inset-0 z-40 bg-slate-950/80 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-800 bg-slate-900 transition-transform md:static md:z-auto md:translate-x-0 ${isMobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        <div className="flex h-20 items-center justify-between border-b border-slate-800 px-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
              <ShieldCheck className="size-6" />
            </div>

            <div>
              <p className="font-semibold text-slate-100">AI-KYC System</p>
              <p className="text-xs text-slate-500">Administrator Portal</p>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-slate-300 hover:bg-slate-800 hover:text-white md:hidden"
            aria-label="Close navigation"
            onClick={onClose}
          >
            <X className="size-5" />
          </Button>
        </div>

        <nav className="flex-1 space-y-2 px-4 py-6" aria-label="Administrator navigation">
          {navigationItems.map(({ label, path, icon: Icon, end }) => (
            <NavLink
              key={path}
              to={path}
              end={end}
              className={getNavigationClass}
              onClick={onClose}
            >
              <Icon className="size-5" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-800 px-5 py-4">
          <p className="text-xs text-slate-500">
            Secure KYC review environment
          </p>
        </div>
      </aside>
    </>
  );
}