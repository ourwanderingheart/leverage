import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, startGoogleLogin } from "@/context/AuthContext";
import { errorMessage } from "@/lib/api";
import { IMAGES } from "@/lib/brand";

const COPY = {
  signin: { title: "Welcome back.", sub: "Pick up your thinking where you left it.", cta: "Sign in", alt: "New here?", altLink: "/signup", altText: "Create an account" },
  signup: { title: "Create your account.", sub: "Your analyses stay private to you.", cta: "Create account", alt: "Already have an account?", altLink: "/signin", altText: "Sign in" },
};

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
    <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.2 14.6 2.2 12 2.2 6.6 2.2 2.2 6.6 2.2 12s4.4 9.8 9.8 9.8c5.7 0 9.4-4 9.4-9.6 0-.6-.1-1.1-.2-1.6H12z" />
  </svg>
);

export default function AuthPage({ mode }) {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const c = COPY[mode];
  const dest = location.state?.from || "/dashboard";

  if (user) return <Navigate to={dest} replace />;

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "signin") await login(form.email, form.password);
      else await register(form.name, form.email, form.password);
      navigate(dest, { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative z-10 grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Logo />
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
          <h1 className="font-display text-4xl font-semibold tracking-tight text-white">{c.title}</h1>
          <p className="mt-3 text-sm text-slate-400">{c.sub}</p>
          <Button type="button" variant="outline" onClick={startGoogleLogin} className="mt-8 h-11 w-full rounded-full border-slate-700 bg-transparent text-slate-100 hover:bg-white/5 hover:text-white" data-testid="google-auth-btn">
            <GoogleIcon /> <span className="ml-2">Continue with Google</span>
          </Button>
          <div className="my-6 flex items-center gap-3 text-xs text-slate-500"><span className="h-px flex-1 bg-slate-800" />or with email<span className="h-px flex-1 bg-slate-800" /></div>
          <form onSubmit={submit} className="space-y-4" data-testid={`${mode}-form`}>
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Name</Label>
                <Input id="name" required value={form.name} onChange={set("name")} className="h-11 bg-[#0C1222]" data-testid="auth-name-input" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required autoComplete="email" value={form.email} onChange={set("email")} className="h-11 bg-[#0C1222]" data-testid="auth-email-input" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required minLength={mode === "signup" ? 8 : undefined} autoComplete={mode === "signup" ? "new-password" : "current-password"} value={form.password} onChange={set("password")} className="h-11 bg-[#0C1222]" data-testid="auth-password-input" />
              {mode === "signup" && <p className="text-xs text-slate-500">At least 8 characters.</p>}
            </div>
            {error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200" data-testid="auth-error">{error}</p>}
            <Button type="submit" disabled={busy} className="h-11 w-full rounded-full bg-blue-500 text-base hover:bg-blue-400" data-testid="auth-submit-btn">
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{c.cta}
            </Button>
          </form>
          <p className="mt-6 text-sm text-slate-400">
            {c.alt} <Link to={c.altLink} state={location.state} className="text-sky-300 hover:text-sky-200" data-testid="auth-alt-link">{c.altText}</Link>
          </p>
        </div>
      </div>
      <div className="relative hidden overflow-hidden border-l lwm-line bg-[#060912] lg:block">
        <img src={IMAGES.ribbon} alt="Evolved Ribbon 8" className="lwm-screen absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#060912] to-transparent p-12 pt-32">
          <p className="font-serif-ed text-4xl leading-tight text-white">Human thinks.<br /><span className="italic text-sky-300">AI structures.</span><br />Human decides.</p>
        </div>
      </div>
    </div>
  );
}
