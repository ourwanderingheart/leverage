import { useEffect, useState } from "react";
import { FileText, FlaskConical, Flag, Link2, Loader2, Minus, NotebookPen, Pencil, Plus, Sparkles, Tag, Target, Unlink } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { EpistemicBadge } from "@/components/workspace/EpistemicBadge";
import { api, errorMessage } from "@/lib/api";

const ICONS = {
  created: Flag, framing: FileText, focus: Target, item_added: Plus, guide_confirmed: Sparkles, item_revised: Pencil,
  item_relabelled: Tag, item_removed: Minus, link_added: Link2, link_removed: Unlink, experiment_added: FlaskConical,
  experiment_status: FlaskConical, experiment_revised: FlaskConical, experiment_removed: Minus,
};
const fmt = (iso, withTime) => new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", ...(withTime ? { hour: "numeric", minute: "2-digit" } : { year: "numeric" }) });

const groupByLoop = (events) => {
  const groups = [{ loop: null, events: [] }];
  events.forEach((ev) => (ev.kind === "learning" ? groups.push({ loop: ev, events: [] }) : groups[groups.length - 1].events.push(ev)));
  return groups;
};

const EventRow = ({ ev }) => {
  const Icon = ICONS[ev.kind] || Pencil;
  const d = ev.detail || {};
  return (
    <li className="flex gap-3 py-2.5" data-testid={`timeline-event-${ev.kind}`}>
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border lwm-line bg-[#0C1222]"><Icon className="h-3 w-3 text-slate-300" /></span>
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug text-slate-200">{ev.summary}</p>
        {ev.kind === "item_relabelled" && (
          <div className="mt-1.5 flex items-center gap-1.5"><EpistemicBadge kind={d.from} /><span className="text-xs text-slate-500">→</span><EpistemicBadge kind={d.to} /></div>
        )}
        {ev.kind === "item_revised" && (
          <p className="mt-1 text-xs text-slate-500"><span className="line-through">{d.before}</span> → <span className="text-slate-300">{d.after}</span></p>
        )}
        {ev.kind === "focus" && d.after && <p className="mt-1 font-serif-ed text-base italic text-slate-300">“{d.after}”</p>}
        <p className="mt-0.5 font-mono-ed text-[10px] text-slate-600">{fmt(ev.created_at, true)}</p>
      </div>
    </li>
  );
};

const LoopHeader = ({ loop, index, count }) => (
  <div className="rounded-xl border border-cyan-400/25 bg-cyan-400/[0.04] p-4" data-testid={`timeline-loop-${index}`}>
    <div className="flex items-center justify-between gap-2">
      <p className="flex items-center gap-1.5 font-mono-ed text-[10px] uppercase tracking-[0.16em] text-cyan-300"><NotebookPen className="h-3 w-3" />Learning loop {index}{loop.detail?.removed ? " · note removed" : ""}</p>
      <span className="font-mono-ed text-[10px] text-slate-500">{fmt(loop.created_at)}</span>
    </div>
    {loop.detail?.experiment && <p className="mt-1 text-xs text-slate-400">Experiment: {loop.detail.experiment}</p>}
    <p className="mt-2 text-sm text-slate-200"><span className="text-slate-500">Tried: </span>{loop.detail?.tried}</p>
    {loop.detail?.changed && <p className="mt-1 text-sm text-slate-200"><span className="text-slate-500">Understanding shifted: </span>{loop.detail.changed}</p>}
    {loop.detail?.revise && <p className="mt-1 text-sm text-slate-200"><span className="text-slate-500">Wanted to revise: </span>{loop.detail.revise}</p>}
    <p className="mt-3 text-xs text-sky-200/80">{count === 0 ? "No changes to the picture since this loop yet." : `${count} change${count === 1 ? "" : "s"} to the picture after this loop`}</p>
  </div>
);

export const TimelineSheet = ({ open, onOpenChange, analysisId, version }) => {
  const [events, setEvents] = useState(null);
  useEffect(() => {
    if (!open) return;
    api.get(`/analyses/${analysisId}/timeline`).then(({ data }) => setEvents(data)).catch((e) => toast.error(errorMessage(e)));
  }, [open, analysisId, version]);

  const groups = events ? groupByLoop(events) : [];
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto border-l lwm-line bg-[#0A0F1D] sm:max-w-lg" data-testid="timeline-sheet">
        <SheetHeader className="text-left">
          <SheetTitle className="font-display text-2xl text-white">Thinking timeline</SheetTitle>
          <SheetDescription>How this analysis has changed — what was added, relabelled or revised, grouped by learning loop.</SheetDescription>
        </SheetHeader>
        {!events ? (
          <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-sky-300" /></div>
        ) : (
          <div className="mt-8 space-y-8">
            {[...groups].reverse().map((g, ri) => {
              const index = groups.length - 1 - ri;
              return (
                <section key={g.loop?.id || "initial"} data-testid={`timeline-group-${index}`}>
                  {g.loop ? <LoopHeader loop={g.loop} index={index} count={g.events.length} /> : (
                    <p className="font-mono-ed text-[10px] uppercase tracking-[0.16em] text-slate-500">Initial picture · before any learning loop</p>
                  )}
                  <ol className="mt-2 border-l lwm-line pl-3">
                    {g.events.map((ev) => <EventRow key={ev.id} ev={ev} />)}
                  </ol>
                </section>
              );
            })}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
