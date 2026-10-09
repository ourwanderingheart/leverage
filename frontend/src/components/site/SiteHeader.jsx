import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Menu, X, ArrowRight } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

const LINKS = [
  { to: "/#how", label: "How it works", id: "how" },
  { to: "/#method", label: "Leverage 8", id: "method" },
  { to: "/#different", label: "Why different", id: "different" },
  { to: "/about", label: "About", id: "about" },
];

const AuthCtas = ({ user, onNavigate }) =>
  user ? (
    <Button asChild className="rounded-full bg-blue-500 px-5 hover:bg-blue-400" data-testid="nav-dashboard-btn">
      <Link to="/dashboard" onClick={onNavigate}>Your analyses <ArrowRight className="ml-1 h-4 w-4" /></Link>
    </Button>
  ) : (
    <>
      <Link to="/signin" onClick={onNavigate} data-testid="nav-signin-link" className="text-sm text-slate-300 transition-colors hover:text-white">Sign in</Link>
      <Button asChild className="rounded-full bg-blue-500 px-5 hover:bg-blue-400" data-testid="nav-get-started-btn">
        <Link to="/signup" onClick={onNavigate}>Get started</Link>
      </Button>
    </>
  );

export const SiteHeader = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  return (
    <header className="lwm-glass sticky top-0 z-40 border-b lwm-line">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
        <Logo />
        <nav className="hidden items-center gap-8 md:flex">
          {LINKS.map((l) => (
            <NavLink key={l.id} to={l.to} data-testid={`nav-${l.id}-link`} className="text-sm text-slate-400 transition-colors hover:text-white">{l.label}</NavLink>
          ))}
        </nav>
        <div className="hidden items-center gap-5 md:flex"><AuthCtas user={user} /></div>
        <button className="rounded-md p-2 text-slate-200 md:hidden" onClick={() => setOpen(!open)} data-testid="nav-mobile-toggle" aria-label="Toggle menu">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <div className="border-t lwm-line px-5 pb-6 pt-4 md:hidden" data-testid="nav-mobile-menu">
          <div className="flex flex-col gap-4">
            {LINKS.map((l) => (
              <Link key={l.id} to={l.to} onClick={() => setOpen(false)} data-testid={`nav-mobile-${l.id}-link`} className="text-base text-slate-200">{l.label}</Link>
            ))}
            <div className="mt-2 flex items-center gap-5"><AuthCtas user={user} onNavigate={() => setOpen(false)} /></div>
          </div>
        </div>
      )}
    </header>
  );
};
