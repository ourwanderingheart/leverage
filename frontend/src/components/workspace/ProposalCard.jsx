import { useState } from "react";
import { Check, Loader2, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EpistemicBadge } from "@/components/workspace/EpistemicBadge";
import { SECTION_META } from "@/lib/brand";
import { cn } from "@/lib/utils";

const KINDS = ["inferred", "unknown", "known"];

export const ProposalCard = ({ proposal, onAccept, onDismiss }) => {
  const [text, setText] = useState(proposal.text);
  const [kind, setKind] = useState(proposal.epistemic);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const section = SECTION_META[proposal.section]?.title;

  const run = async (fn) => {
    setBusy(true);
    await fn();
    setBusy(false);
  };

  if (proposal.status !== "pending")
    return (
      <div className="rounded-xl border lwm-line px-3 py-2 text-xs text-slate-500" data-testid={`proposal-${proposal.id}-resolved`}>
        {proposal.status === "accepted" ? <span className="text-emerald-300/80">Added to {section} — you confirmed.</span> : <span>Dismissed: “{proposal.text}”</span>}
      </div>
    );

  return (
    <div className="rounded-xl border border-violet-400/25 bg-violet-500/[0.06] p-3" data-testid={`proposal-${proposal.id}`}>
      <p className="font-mono-ed text-[10px] uppercase tracking-[0.16em] text-violet-200/70">Proposed update · {section}</p>
      {editing ? (
        <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} className="mt-2 bg-[#070A14] text-sm" data-testid={`proposal-text-input-${proposal.id}`} />
      ) : (
        <p className="mt-1.5 text-sm text-slate-100">{text}</p>
      )}
      {proposal.rationale && <p className="mt-1 text-xs text-slate-400">{proposal.rationale}</p>}
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] text-slate-500">Label as</span>
        {KINDS.map((k) => (
          <button key={k} onClick={() => setKind(k)} className={cn("rounded-full transition-opacity", kind === k ? "opacity-100" : "opacity-40 hover:opacity-80")} data-testid={`proposal-kind-${k}-${proposal.id}`}>
            <EpistemicBadge kind={k} />
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" disabled={busy || !text.trim()} onClick={() => run(() => onAccept(proposal, { text: text.trim(), epistemic: kind }))} className="h-8 bg-blue-500 hover:bg-blue-400" data-testid={`proposal-accept-${proposal.id}`}>
          {busy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Check className="mr-1 h-3.5 w-3.5" />}Add to analysis
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setEditing(!editing)} className="h-8" data-testid={`proposal-edit-${proposal.id}`}><Pencil className="mr-1 h-3.5 w-3.5" />{editing ? "Done" : "Refine"}</Button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={() => run(() => onDismiss(proposal))} className="h-8 text-slate-400" data-testid={`proposal-dismiss-${proposal.id}`}><X className="mr-1 h-3.5 w-3.5" />Dismiss</Button>
      </div>
    </div>
  );
};
