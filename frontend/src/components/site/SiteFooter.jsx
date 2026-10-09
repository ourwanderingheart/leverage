import { Link } from "react-router-dom";
import { Logo } from "@/components/brand/Logo";

export const SiteFooter = () => (
  <footer className="relative z-10 border-t lwm-line">
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-12 sm:px-8 md:flex-row md:items-end md:justify-between">
      <div className="space-y-3">
        <Logo testId="footer-logo" />
        <p className="font-serif-ed text-xl italic text-slate-400">See the system. Find what matters.</p>
      </div>
      <div className="flex flex-wrap gap-6 text-sm text-slate-400">
        <Link to="/about" data-testid="footer-about-link" className="hover:text-white">About</Link>
        <Link to="/#method" data-testid="footer-method-link" className="hover:text-white">Leverage 8 Method</Link>
        <Link to="/signin" data-testid="footer-signin-link" className="hover:text-white">Sign in</Link>
        <Link to="/signup" data-testid="footer-signup-link" className="hover:text-white">Create account</Link>
      </div>
      <p className="font-mono-ed text-xs text-slate-500">© {new Date().getFullYear()} Leverage What Matters</p>
    </div>
  </footer>
);
