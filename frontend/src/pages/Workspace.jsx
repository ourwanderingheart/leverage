import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/app/AppHeader";
import { Button } from "@/components/ui/button";
import { StageTabs } from "@/components/workspace/StageTabs";
import { FocusStage } from "@/components/workspace/FocusStage";
import { SeeStage } from "@/components/workspace/SeeStage";
import { DecideStage } from "@/components/workspace/DecideStage";
import { LearnStage } from "@/components/workspace/LearnStage";
import { GuidePanel } from "@/components/workspace/GuidePanel";
import { api, errorMessage } from "@/lib/api";
import { STAGES } from "@/lib/brand";
import { cn } from "@/lib/utils";

const useAnalysisActions = (id, setAnalysis) => {
  const mutate = useCallback(async (request, success) => {
    try {
      const { data } = await request();
      setAnalysis(data);
      if (success) toast.success(success);
      return true;
    } catch (e) {
      toast.error(errorMessage(e));
      return false;
    }
  }, [setAnalysis]);
  return useMemo(() => {
    const base = `/analyses/${id}`;
    return {
      update: (body, msg) => mutate(() => api.patch(base, body), msg),
      addItem: (body) => mutate(() => api.post(`${base}/items`, body)),
      updateItem: (itemId, body) => mutate(() => api.patch(`${base}/items/${itemId}`, body)),
      deleteItem: (itemId) => mutate(() => api.delete(`${base}/items/${itemId}`), "Removed"),
      addExperiment: (body, msg) => mutate(() => api.post(`${base}/experiments`, body), msg),
      updateExperiment: (expId, body, msg) => mutate(() => api.patch(`${base}/experiments/${expId}`, body), msg),
      deleteExperiment: (expId) => mutate(() => api.delete(`${base}/experiments/${expId}`), "Experiment removed"),
      addLearning: (body, msg) => mutate(() => api.post(`${base}/learnings`, body), msg),
      deleteLearning: (leId) => mutate(() => api.delete(`${base}/learnings/${leId}`), "Learning removed"),
    };
  }, [id, mutate]);
};

export default function Workspace() {
  const { id } = useParams();
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState("");
  const [stage, setStage] = useState("focus");
  const [learnExp, setLearnExp] = useState(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const actions = useAnalysisActions(id, setAnalysis);

  useEffect(() => {
    api.get(`/analyses/${id}`).then(({ data }) => { setAnalysis(data); setStage(data.stage); }).catch((e) => setError(errorMessage(e)));
  }, [id]);

  const goStage = (key) => {
    setStage(key);
    api.patch(`/analyses/${id}`, { stage: key }).catch(() => {});
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (error)
    return (
      <div className="relative z-10 min-h-screen"><AppHeader />
        <div className="mx-auto max-w-xl px-6 py-24 text-center" data-testid="workspace-error">
          <p className="font-serif-ed text-3xl italic text-white">{error}</p>
          <Link to="/dashboard" className="mt-6 inline-block text-sky-300">Back to your analyses</Link>
        </div>
      </div>
    );
  if (!analysis) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-sky-300" /></div>;

  const current = STAGES.find((s) => s.key === stage);

  return (
    <div className="relative z-10 min-h-screen">
      <AppHeader />
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_400px] xl:grid-cols-[minmax(0,1fr)_440px]">
        <main className="min-w-0 px-4 pb-28 pt-8 sm:px-8 lg:pb-16" data-testid="workspace">
          <div className="mx-auto max-w-5xl">
            <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white" data-testid="workspace-back-link"><ArrowLeft className="h-4 w-4" />Analyses</Link>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl" data-testid="workspace-title">{analysis.title}</h1>
            <div className="mt-6"><StageTabs stage={stage} onChange={goStage} /></div>
            <div className="mb-6 mt-6">
              <p className="lwm-eyebrow">{current.label} · {current.letters}</p>
              <p className="mt-2 text-slate-400" data-testid="stage-description">{current.text}</p>
            </div>
            {stage === "focus" && <FocusStage analysis={analysis} actions={actions} />}
            {stage === "see" && <SeeStage analysis={analysis} actions={actions} />}
            {stage === "decide" && <DecideStage analysis={analysis} actions={actions} onLearn={(expId) => { setLearnExp(expId); goStage("learn"); }} />}
            {stage === "learn" && <LearnStage analysis={analysis} actions={actions} experimentId={learnExp} onRevise={() => goStage("see")} />}
          </div>
        </main>
        <aside className={cn("bg-[#0A0F1D] lg:sticky lg:top-16 lg:flex lg:h-[calc(100vh-4rem)] lg:border-l lwm-line",
          guideOpen ? "fixed inset-0 z-50 flex" : "hidden")} data-testid="guide-aside">
          <div className="h-full w-full"><GuidePanel analysisId={id} stage={stage} onAnalysisChange={setAnalysis} onClose={() => setGuideOpen(false)} /></div>
        </aside>
      </div>
      {!guideOpen && (
        <Button onClick={() => setGuideOpen(true)} className="fixed bottom-5 right-5 z-40 h-12 rounded-full bg-blue-500 px-5 shadow-lg shadow-blue-500/25 hover:bg-blue-400 lg:hidden" data-testid="guide-open-btn">
          <MessageCircle className="mr-2 h-4 w-4" />Guide
        </Button>
      )}
    </div>
  );
}
