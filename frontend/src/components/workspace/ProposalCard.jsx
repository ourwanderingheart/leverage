import { useState } from "react";
import { Check, Loader2, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EpistemicBadge } from "@/components/workspace/EpistemicBadge";
import { SECTION_META } from "@/lib/brand";
import { cn } from "@/lib/utils";

const KINDS = ["inferred", "unknown", "known"];
const TONE = { item: "border-violet-400/25 bg-violet-500/[0.06]", link: "border-sky-400/30 bg-sky-500/[0.06]", experiment: "border-cyan-400/30 bg-cyan-500/[0.06]" };
const HEADER = {
  item: (p) => `Proposed update · ${SECTION_META[p.section]?.title}`,
  link: () => "Proposed link · a hypothesis",
  experiment: () => "Proposed experiment · for Decide",
};
const RESOLVED = {
  item: (p) => `Added to ${SECTION_META[p.section]?.title} — you confirmed.`,
  link: (p) => `Link added to the map: ${p.from_text} → ${p.to_text}`,
  experiment: (p) => `Added to Decide as the experiment “${p.text}”.`,
};
const ACCEPT = { item: "Add to analysis", link: "Add link", experiment: "Add as experiment" };
const EXP_ROWS = [["If we try", "action"], ["Testing whether", "hypothesis"], ["Watching for", "signal"], ["Timeframe", "timeframe"]];

const LinkBody = ({ p }) => (
  <p className="mt-1.5 text-sm text-slate-100" data-testid={`proposal-link-${p.id}`}>
    {p.from_text}<span className="mx-1.5 inline-flex items-center gap-0.5 font-serif-ed italic text-sky-200">may influence →</span>{p.to_text}
  </p>
);

const ExperimentBody = ({ p }) => (
  <dl className="mt-2 space-y-1.5 text-xs" data-testid={`proposal-experiment-${p.id}`}>
    {EXP_ROWS.filter(([, k]) => p.experiment?.[k]).map(([label, k]) => (
      <div key={k}><dt className="text-slate-500">{label}</dt><dd className="mt-0.5 text-slate-200">{p.experiment[k]}</dd></div>
    ))}
  </dl>
);

export const ProposalCard = ({ proposal, onAccept, onDismiss }) => {
  const type = proposal.type || "item";
  const [text, setText] = useState(proposal.text);
  const [kind, setKind] = useState(proposal.epistemic);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  const run = async (fn) => {
    setBusy(true);
    await fn();
    setBusy(false);
  };

  if (proposal.status !== "pending")
    return (
      <div className="rounded-xl border lwm-line px-3 py-2 text-xs text-slate-500" data-testid={`proposal-${proposal.id}-resolved`}>
        {proposal.status === "accepted" ? <span className="text-emerald-300/80">{RESOLVED[type](proposal)}</span> : <span>Dismissed: “{proposal.text}”</span>}
      </div>
    );

  const body = type === "link" ? {} : { text: text.trim() };
  if (type !== "experiment") body.epistemic = kind;

  return (
    <div className={cn("rounded-xl border p-3", TONE[type])} data-testid={`proposal-${proposal.id}`} data-proposal-type={type}>
      <p className="font-mono-ed text-[10px] uppercase tracking-[0.16em] text-slate-300/70">{HEADER[type](proposal)}</p>
      {type === "link" ? <LinkBody p={proposal} /> : editing ? (
        <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} className="mt-2 bg-[#070A14] text-sm" data-testid={`proposal-text-input-${proposal.id}`} />
      ) : (
        <p className={cn("mt-1.5 text-sm text-slate-100", type === "experiment" && "font-display text-[15px] font-medium")}>{text}</p>
      )}
      {type === "experiment" && <ExperimentBody p={proposal} />}
      {proposal.rationale && <p className="mt-1.5 text-xs text-slate-400">{proposal.rationale}</p>}
      {type !== "experiment" && (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-slate-500">Label as</span>
          {KINDS.map((k) => (
            <button key={k} onClick={() => setKind(k)} className={cn("rounded-full transition-opacity", kind === k ? "opacity-100" : "opacity-40 hover:opacity-80")} data-testid={`proposal-kind-${k}-${proposal.id}`}>
              <EpistemicBadge kind={k} />
            </button>
          ))}
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" disabled={busy || (type !== "link" && !text.trim())} onClick={() => run(() => onAccept(proposal, body))} className="h-8 bg-blue-500 hover:bg-blue-400" data-testid={`proposal-accept-${proposal.id}`}>
          {busy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Check className="mr-1 h-3.5 w-3.5" />}{ACCEPT[type]}
        </Button>
        {type !== "link" && (
          <Button size="sm" variant="ghost" onClick={() => setEditing(!editing)} className="h-8" data-testid={`proposal-edit-${proposal.id}`}><Pencil className="mr-1 h-3.5 w-3.5" />{editing ? "Done" : "Refine"}</Button>
        )}
        <Button size="sm" variant="ghost" disabled={busy} onClick={() => run(() => onDismiss(proposal))} className="h-8 text-slate-400" data-testid={`proposal-dismiss-${proposal.id}`}><X className="mr-1 h-3.5 w-3.5" />Dismiss</Button>
      </div>
    </div>
  );
};
