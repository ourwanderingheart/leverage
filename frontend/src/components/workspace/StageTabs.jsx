import { STAGES } from "@/lib/brand";
import { cn } from "@/lib/utils";

export const StageTabs = ({ stage, onChange }) => (
  <nav className="flex gap-1 overflow-x-auto rounded-full border lwm-line bg-[#0B1120] p-1" data-testid="stage-tabs">
    {STAGES.map((s, i) => (
      <button key={s.key} onClick={() => onChange(s.key)} data-testid={`stage-tab-${s.key}`}
        className={cn("group flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm transition-colors sm:px-5",
          stage === s.key ? "bg-white/10 text-white shadow-[inset_0_-1px_0_rgba(34,211,238,0.6)]" : "text-slate-400 hover:text-white")}>
        <span className="font-mono-ed text-[10px] text-slate-500">{i + 1}</span>
        {s.label}
        <span className="hidden font-mono-ed text-[10px] tracking-wider text-slate-500 xl:inline">{s.letters}</span>
      </button>
    ))}
  </nav>
);
