import { Navigate, Route, Routes } from "react-router";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import useAuth from "@/hooks/useAuth";
import AdminLayout from "@/layouts/AdminLayout";
import AdminDashboardPage from "@/pages/AdminDashboardPage";
import AdminReviewQueuePage from "@/pages/AdminReviewQueuePage";
import CustomerDashboardPage from "@/pages/CustomerDashboardPage";
import LoginPage from "@/pages/LoginPage";
import UnauthorizedPage from "@/pages/UnauthorizedPage";
import AdminApplicationDetailPlaceholderPage from "@/pages/AdminApplicationDetailPlaceholderPage";

function RoleRedirect() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-950 text-slate-100">
        <p className="text-sm text-slate-400">Loading application...</p>
      </main>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return <Navigate to={user.role === "admin" ? "/admin" : "/customer"} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RoleRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboardPage />} />
          <Route path="review-queue" element={<AdminReviewQueuePage />} />
          <Route
            path="applications/:applicationId"
            element={<AdminApplicationDetailPlaceholderPage />}
          />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={["customer"]} />}>
        <Route path="/customer" element={<CustomerDashboardPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}