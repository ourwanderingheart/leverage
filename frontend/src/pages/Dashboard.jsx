import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Loader2, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/app/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { api, errorMessage } from "@/lib/api";
import { STAGES, EPISTEMIC } from "@/lib/brand";
import { useAuth } from "@/context/AuthContext";

const formatDate = (iso) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

const Counts = ({ counts }) => (
  <div className="flex items-center gap-3 text-xs text-slate-400">
    {Object.entries(EPISTEMIC).map(([k, m]) => (
      <span key={k} className="inline-flex items-center gap-1.5" title={m.label}>
        <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />{counts[k]} {m.label.toLowerCase()}
      </span>
    ))}
  </div>
);

const DeleteButton = ({ analysis, onDeleted }) => (
  <AlertDialog>
    <AlertDialogTrigger asChild>
      <button className="rounded-md p-2 text-slate-500 opacity-100 transition-colors hover:bg-red-500/10 hover:text-red-300 md:opacity-0 md:group-hover:opacity-100" data-testid={`delete-analysis-${analysis.id}`} aria-label="Delete analysis">
        <Trash2 className="h-4 w-4" />
      </button>
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Delete “{analysis.title}”?</AlertDialogTitle>
        <AlertDialogDescription>This removes the analysis, its experiments, learning notes and Guide conversation. It cannot be undone.</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel data-testid="delete-cancel-btn">Keep it</AlertDialogCancel>
        <AlertDialogAction onClick={() => onDeleted(analysis.id)} className="bg-red-600 hover:bg-red-500" data-testid="delete-confirm-btn">Delete</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

const AnalysisRow = ({ a, onDeleted }) => {
  const stage = STAGES.find((s) => s.key === a.stage);
  return (
    <li className="group relative grid gap-3 border-b lwm-line py-6 transition-colors hover:bg-white/[0.015] md:grid-cols-[1fr_auto_auto] md:items-center md:gap-8 md:px-3" data-testid={`analysis-row-${a.id}`}>
      <Link to={`/analysis/${a.id}`} className="min-w-0" data-testid={`open-analysis-${a.id}`}>
        <h3 className="truncate font-display text-xl font-medium text-white transition-colors group-hover:text-sky-200">{a.title}</h3>
        <p className="mt-1 line-clamp-1 text-sm text-slate-400">{a.challenge}</p>
        <div className="mt-3"><Counts counts={a.counts} /></div>
      </Link>
      <div className="flex items-center gap-4 text-xs text-slate-400">
        <span className="rounded-full border border-sky-400/30 bg-sky-400/5 px-2.5 py-1 font-mono-ed uppercase tracking-wider text-sky-200">{stage?.label}</span>
        <span>{a.experiment_count} exp · {a.learning_count} notes</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-mono-ed text-xs text-slate-500">Updated {formatDate(a.updated_at)}</span>
        <DeleteButton analysis={a} onDeleted={onDeleted} />
        <ArrowRight className="hidden h-4 w-4 text-slate-600 transition-transform group-hover:translate-x-1 group-hover:text-sky-300 md:block" />
      </div>
    </li>
  );
};

const EmptyState = () => (
  <div className="border-y lwm-line py-20 text-center" data-testid="dashboard-empty">
    <p className="font-serif-ed text-3xl italic text-white">Start with one situation that matters.</p>
    <p className="mx-auto mt-3 max-w-md text-sm text-slate-400">Describe the challenge, where things stand, and where you'd like them to be. The Guide will help you slow down from there.</p>
    <Button asChild className="mt-8 rounded-full bg-blue-500 hover:bg-blue-400" data-testid="empty-new-analysis-btn">
      <Link to="/analysis/new"><Plus className="mr-1 h-4 w-4" />Start an analysis</Link>
    </Button>
  </div>
);

export default function Dashboard() {
  const { user } = useAuth();
  const [analyses, setAnalyses] = useState(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    api.get("/analyses").then(({ data }) => setAnalyses(data)).catch((e) => { toast.error(errorMessage(e)); setAnalyses([]); });
  }, []);

  const filtered = useMemo(
    () => (analyses || []).filter((a) => `${a.title} ${a.challenge}`.toLowerCase().includes(query.toLowerCase())),
    [analyses, query]
  );

  const remove = async (id) => {
    try {
      await api.delete(`/analyses/${id}`);
      setAnalyses((list) => list.filter((a) => a.id !== id));
      toast.success("Analysis deleted");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <div className="relative z-10 min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-5 py-14 sm:px-8 lg:py-20" data-testid="dashboard">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="lwm-eyebrow">Your analyses</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl" data-testid="dashboard-greeting">Hello, {user?.name?.split(" ")[0]}.</h1>
            <p className="mt-3 max-w-lg text-slate-400">Return to a situation and update your thinking, or start a new one.</p>
          </div>
          {analyses?.length > 0 && (
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search analyses" className="h-10 rounded-full bg-[#0C1222] pl-9" data-testid="dashboard-search-input" />
            </div>
          )}
        </div>
        <div className="mt-12">
          {analyses === null ? (
            <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-sky-300" /></div>
          ) : analyses.length === 0 ? (
            <EmptyState />
          ) : (
            <ul className="border-t lwm-line" data-testid="analyses-list">
              {filtered.map((a) => <AnalysisRow key={a.id} a={a} onDeleted={remove} />)}
              {filtered.length === 0 && <li className="py-10 text-center text-sm text-slate-500">No analyses match “{query}”.</li>}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
