import { Navigate, Outlet, useLocation } from "react-router";
import useAuth from "@/hooks/useAuth";

export default function ProtectedRoute({ allowedRoles = [] }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-950 text-slate-100">
        <p className="text-sm text-slate-400">
          Validating your session...
        </p>
      </main>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}