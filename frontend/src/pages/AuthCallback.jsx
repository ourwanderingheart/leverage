import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function AuthCallback() {
  const location = useLocation();
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;
    const sessionId = new URLSearchParams(location.hash.slice(1)).get("session_id");
    api.post("/auth/google/session", { session_id: sessionId })
      .then(({ data }) => {
        setUser(data);
        navigate("/dashboard", { replace: true, state: { user: data } });
      })
      .catch(() => {
        setUser(false);
        navigate("/signin", { replace: true });
      });
  }, [location.hash, navigate, setUser]);

  return <div className="min-h-screen bg-[#070A14]" data-testid="auth-callback" />;
}
