import { Link, NavLink, useNavigate } from "react-router-dom";
import { LogOut, Plus } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/AuthContext";

const navCls = ({ isActive }) => `text-sm transition-colors ${isActive ? "text-white" : "text-slate-400 hover:text-white"}`;

export const AppHeader = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const signOut = async () => {
    await logout();
    navigate("/", { replace: true });
  };
  return (
    <header className="lwm-glass sticky top-0 z-40 h-16 border-b lwm-line">
      <div className="flex h-full items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Logo to="/dashboard" />
          <nav className="hidden items-center gap-6 md:flex">
            <NavLink to="/dashboard" className={navCls} data-testid="app-nav-analyses">Analyses</NavLink>
            <NavLink to="/about" className={navCls} data-testid="app-nav-about">About the method</NavLink>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild size="sm" className="rounded-full bg-blue-500 hover:bg-blue-400" data-testid="app-new-analysis-btn">
            <Link to="/analysis/new"><Plus className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">New analysis</span></Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-slate-700 bg-slate-800 text-sm font-medium text-slate-100" data-testid="user-menu-trigger">
                {user?.picture ? <img src={user.picture} alt="" className="h-full w-full object-cover" /> : (user?.name?.[0] || "?").toUpperCase()}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel>
                <p className="truncate text-sm text-white" data-testid="user-menu-name">{user?.name}</p>
                <p className="truncate text-xs font-normal text-slate-400">{user?.email}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/dashboard")} data-testid="user-menu-analyses" className="md:hidden">Analyses</DropdownMenuItem>
              <DropdownMenuItem onClick={signOut} data-testid="user-menu-signout"><LogOut className="mr-2 h-4 w-4" />Sign out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
