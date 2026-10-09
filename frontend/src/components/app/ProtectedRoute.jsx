import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export const ProtectedRoute = () => {
  const { user } = useAuth();
  const location = useLocation();
  if (user === null)
    return (
      <div className="flex min-h-screen items-center justify-center" data-testid="auth-loading">
        <Loader2 className="h-6 w-6 animate-spin text-sky-300" />
      </div>
    );
  if (user === false) return <Navigate to="/signin" replace state={{ from: location.pathname }} />;
  return <Outlet />;
};
