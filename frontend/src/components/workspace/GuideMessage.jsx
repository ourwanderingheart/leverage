import { ProposalCard } from "@/components/workspace/ProposalCard";
import { cn } from "@/lib/utils";

const LABELS = {
  told: { label: "You told me", dot: "bg-emerald-400", text: "text-emerald-300" },
  wondering: { label: "I'm wondering", dot: "bg-violet-400", text: "text-violet-300" },
  unknown: { label: "We don't know yet", dot: "bg-amber-400", text: "text-amber-300" },
};
const MARKER = /(YOU TOLD ME|I['’]M WONDERING|WE DON['’]T KNOW YET|QUESTION)\s*:/gi;
const keyFor = (m) => {
  const u = m.toUpperCase();
  if (u.startsWith("YOU")) return "told";
  if (u.startsWith("I")) return "wondering";
  if (u.startsWith("WE")) return "unknown";
  return "question";
};

export function parseGuide(raw) {
  const text = raw.split("<<<")[0];
  const matches = [...text.matchAll(MARKER)];
  if (!matches.length) return [{ kind: "plain", text: text.trim() }];
  const blocks = [{ kind: "plain", text: text.slice(0, matches[0].index).trim() }];
  matches.forEach((m, i) => {
    const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
    blocks.push({ kind: keyFor(m[1]), text: text.slice(m.index + m[0].length, end).trim() });
  });
  return blocks.filter((b) => b.text);
}

const Block = ({ block }) => {
  if (block.kind === "plain") return <p className="text-sm leading-relaxed text-slate-300">{block.text}</p>;
  if (block.kind === "question")
    return (
      <div className="lwm-question-glow rounded-xl border border-cyan-400/30 bg-cyan-400/[0.05] p-3.5" data-testid="guide-question">
        <p className="font-mono-ed text-[10px] uppercase tracking-[0.18em] text-cyan-300">One question</p>
        <p className="mt-1.5 font-display text-[15px] leading-snug text-white">{block.text}</p>
      </div>
    );
  const meta = LABELS[block.kind];
  return (
    <div data-testid={`guide-block-${block.kind}`}>
      <p className={cn("flex items-center gap-1.5 text-[11px] font-medium", meta.text)}><span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />{meta.label}</p>
      <p className="mt-1 text-sm leading-relaxed text-slate-300">{block.text}</p>
    </div>
  );
};

export const GuideMessageView = ({ message, streaming, onAccept, onDismiss }) => {
  if (message.role === "user")
    return (
      <div className="ml-auto max-w-[88%] rounded-2xl rounded-br-sm bg-blue-500/15 px-3.5 py-2.5 text-sm text-slate-100" data-testid="guide-user-message">
        {message.content}
      </div>
    );
  return (
    <div className="space-y-3.5" data-testid="guide-assistant-message">
      {parseGuide(message.content).map((b, i) => <Block key={i} block={b} />)}
      {streaming && <p className="lwm-typing text-lg leading-none text-slate-500"><span>·</span><span>·</span><span>·</span></p>}
      {(message.proposals || []).map((p) => <ProposalCard key={p.id} proposal={p} onAccept={onAccept} onDismiss={onDismiss} />)}
    </div>
  );
};
