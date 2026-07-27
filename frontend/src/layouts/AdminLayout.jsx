import { useState } from "react";
import { Outlet } from "react-router";
import AdminHeader from "@/components/navigation/AdminHeader";
import AdminSidebar from "@/components/navigation/AdminSidebar";

export default function AdminLayout() {
  const [isMobileNavigationOpen, setIsMobileNavigationOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <AdminSidebar
        isMobileOpen={isMobileNavigationOpen}
        onClose={() => setIsMobileNavigationOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <AdminHeader
          onOpenNavigation={() => setIsMobileNavigationOpen(true)}
        />

        <main className="flex-1 overflow-x-hidden px-4 py-6 md:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}