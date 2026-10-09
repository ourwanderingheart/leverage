import { DIFFERENCES } from "@/lib/brand";
import { EpistemicBadge } from "@/components/workspace/EpistemicBadge";

export const Differences = () => (
  <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr] lg:gap-20" data-testid="differences-section">
    <div>
      <p className="lwm-eyebrow">What makes it different</p>
      <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Built to keep you thinking, not to think for you.</h2>
      <div className="mt-8 flex flex-wrap gap-2">
        <EpistemicBadge kind="known" long />
        <EpistemicBadge kind="inferred" long />
        <EpistemicBadge kind="unknown" long />
      </div>
    </div>
    <dl className="space-y-0 border-t lwm-line">
      {DIFFERENCES.map((d, i) => (
        <div key={d.title} className="grid gap-2 border-b lwm-line py-6 sm:grid-cols-[2.5rem_14rem_1fr] sm:gap-6" data-testid={`difference-${i + 1}`}>
          <span className="font-mono-ed text-xs text-slate-500">0{i + 1}</span>
          <dt className="font-display text-lg font-medium text-white">{d.title}</dt>
          <dd className="text-sm leading-relaxed text-slate-400">{d.text}</dd>
        </div>
      ))}
    </dl>
  </div>
);
