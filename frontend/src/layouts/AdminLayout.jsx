import { useEffect, useState } from "react";
import { Outlet } from "react-router";
import AdminHeader from "@/components/navigation/AdminHeader";
import AdminSidebar from "@/components/navigation/AdminSidebar";

export default function AdminLayout() {
  const [isMobileNavigationOpen, setIsMobileNavigationOpen] = useState(false);

  useEffect(() => {
    if (!isMobileNavigationOpen) return undefined;

    const previousOverflow = document.body.style.overflow;

    function handleKeyDown(event) {
      if (event.key === "Escape") setIsMobileNavigationOpen(false);
    }

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMobileNavigationOpen]);

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <a href="#main-content" className="fixed left-4 top-4 z-[100] -translate-y-24 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-transform focus:translate-y-0">Skip to main content</a>

      <AdminSidebar isMobileOpen={isMobileNavigationOpen} onClose={() => setIsMobileNavigationOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <AdminHeader isNavigationOpen={isMobileNavigationOpen} onOpenNavigation={() => setIsMobileNavigationOpen(true)} />

        <main id="main-content" tabIndex="-1" className="flex-1 overflow-x-hidden px-4 py-6 focus:outline-none md:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}