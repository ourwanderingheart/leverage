import { EPISTEMIC } from "@/lib/brand";
import { cn } from "@/lib/utils";

export const EpistemicBadge = ({ kind, long = false, className, testId }) => {
  const meta = EPISTEMIC[kind];
  return (
    <span data-testid={testId} className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium", meta.cls, className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
      {meta.label}
      {long && <span className="opacity-70">· {meta.long}</span>}
    </span>
  );
};
