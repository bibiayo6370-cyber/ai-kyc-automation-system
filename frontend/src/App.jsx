import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import RouteLoadingFallback from "@/components/common/RouteLoadingFallback";
import useAuth from "@/hooks/useAuth";

const AdminLayout = lazy(() => import("@/layouts/AdminLayout"));
const CustomerLayout = lazy(() => import("@/layouts/CustomerLayout"));
const AdminDashboardPage = lazy(() => import("@/pages/AdminDashboardPage"));
const AdminReviewQueuePage = lazy(() => import("@/pages/AdminReviewQueuePage"));
const AdminApplicationDetailPage = lazy(() => import("@/pages/AdminApplicationDetailPage"));
const CustomerDashboardPage = lazy(() => import("@/pages/CustomerDashboardPage"));
const CustomerApplicationCreatePage = lazy(() => import("@/pages/CustomerApplicationCreatePage"));
const LoginPage = lazy(() => import("@/pages/LoginPage"));
const UnauthorizedPage = lazy(() => import("@/pages/UnauthorizedPage"));

export function RoleRedirect() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) return <RouteLoadingFallback />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return <Navigate to={user.role === "admin" ? "/admin" : "/customer"} replace />;
}

export default function App() {
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <Routes>
        <Route path="/" element={<RoleRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboardPage />} />
            <Route path="review-queue" element={<AdminReviewQueuePage />} />
            <Route path="applications/:applicationId" element={<AdminApplicationDetailPage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={["customer"]} />}>
          <Route path="/customer" element={<CustomerLayout />}>
            <Route index element={<CustomerDashboardPage />} />
            <Route path="applications/new" element={<CustomerApplicationCreatePage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}