import { useEffect, useRef, useState } from "react";
import { ArrowUp, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { GuideMessageView } from "@/components/workspace/GuideMessage";
import { api, errorMessage, streamGuide } from "@/lib/api";
import { STAGES } from "@/lib/brand";

const OPENERS = {
  focus: "I'd like help getting clear on what I'm actually trying to understand.",
  see: "Help me look at the patterns and the system around this.",
  decide: "Where might change have influence here, and what could I test?",
  learn: "Help me make sense of what happened when I tried something.",
};

export const GuidePanel = ({ analysisId, stage, onAnalysisChange, onClose }) => {
  const [messages, setMessages] = useState(null);
  const [draft, setDraft] = useState("");
  const [streaming, setStreaming] = useState(null);
  const endRef = useRef(null);

  useEffect(() => {
    api.get(`/analyses/${analysisId}/guide/messages`).then(({ data }) => setMessages(data)).catch((e) => { toast.error(errorMessage(e)); setMessages([]); });
  }, [analysisId]);

  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), [messages, streaming]);

  const send = async (content) => {
    if (!content.trim() || streaming !== null) return;
    setDraft("");
    setStreaming("");
    try {
      await streamGuide(analysisId, { content: content.trim(), stage }, (ev) => {
        if (ev.type === "user") setMessages((m) => [...m, ev.message]);
        if (ev.type === "delta") setStreaming((s) => (s ?? "") + ev.content);
        if (ev.type === "done") setMessages((m) => [...m, ev.message]);
        if (ev.type === "error") toast.error("The Guide couldn't respond just now. Please try again.");
      });
    } catch (e) {
      toast.error(e.message);
    } finally {
      setStreaming(null);
    }
  };

  const replaceMessage = (msg) => setMessages((list) => list.map((m) => (m.id === msg.id ? msg : m)));
  const accept = async (proposal, body) => {
    try {
      const { data } = await api.post(`/analyses/${analysisId}/guide/proposals/${proposal.id}/accept`, body);
      onAnalysisChange(data.analysis);
      replaceMessage(data.message);
      toast.success("Added to your analysis");
    } catch (e) { toast.error(errorMessage(e)); }
  };
  const dismiss = async (proposal) => {
    try {
      const { data } = await api.post(`/analyses/${analysisId}/guide/proposals/${proposal.id}/dismiss`);
      replaceMessage(data);
    } catch (e) { toast.error(errorMessage(e)); }
  };

  const stageLabel = STAGES.find((s) => s.key === stage)?.label;

  return (
    <div className="flex h-full flex-col" data-testid="guide-panel">
      <div className="flex items-start justify-between gap-3 border-b lwm-line px-5 py-4">
        <div>
          <p className="font-display text-lg font-medium text-white">Guide</p>
          <p className="text-xs text-slate-500">One question at a time. Never edits without you.</p>
        </div>
        {onClose && <Button variant="ghost" size="icon" onClick={onClose} className="lg:hidden" data-testid="guide-close-btn" aria-label="Close guide"><X className="h-4 w-4" /></Button>}
      </div>
      <div className="lwm-scroll flex-1 space-y-6 overflow-y-auto px-5 py-5" data-testid="guide-messages">
        {messages === null && <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-sky-300" /></div>}
        {messages?.length === 0 && streaming === null && (
          <div className="space-y-4 py-4" data-testid="guide-empty">
            <p className="font-serif-ed text-2xl italic leading-snug text-white">Shall we slow down and look at this together?</p>
            <p className="text-sm text-slate-400">I'll reflect back what you've told me, say what I'm wondering, name what we don't know yet — and ask one question.</p>
            <Button onClick={() => send(OPENERS[stage])} className="rounded-full bg-blue-500 hover:bg-blue-400" data-testid="guide-start-btn">Start with the Guide</Button>
          </div>
        )}
        {messages?.map((m) => <GuideMessageView key={m.id} message={m} onAccept={accept} onDismiss={dismiss} />)}
        {streaming !== null && <GuideMessageView message={{ role: "assistant", content: streaming }} streaming />}
        <div ref={endRef} />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); send(draft); }} className="border-t lwm-line p-4">
        <div className="relative">
          <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={2} maxLength={4000}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(draft); } }}
            placeholder={`Reply to the Guide… (${stageLabel})`} className="resize-none bg-[#070A14] pr-12 text-sm" data-testid="guide-input" />
          <Button type="submit" size="icon" disabled={!draft.trim() || streaming !== null} className="absolute bottom-2 right-2 h-8 w-8 rounded-full bg-blue-500 hover:bg-blue-400" data-testid="guide-send-btn" aria-label="Send">
            {streaming !== null ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
          </Button>
        </div>
      </form>
    </div>
  );
};
