import { METHOD, IMAGES } from "@/lib/brand";

export const MethodList = () => (
  <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20" data-testid="leverage8-method">
    <div className="lg:sticky lg:top-28 lg:self-start">
      <p className="lwm-eyebrow">The Leverage 8 Method</p>
      <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Eight movements of better thinking.</h2>
      <p className="mt-5 max-w-md text-base leading-relaxed text-slate-400">
        Not a checklist. You will move back and forth as your understanding changes. The product keeps the journey simple — Focus, See, Decide, Learn — while the method works underneath.
      </p>
      <div className="relative mt-10 aspect-square w-full max-w-sm">
        <div className="absolute inset-8 rounded-full bg-blue-500/10 blur-3xl" />
        <img src={IMAGES.ribbon} alt="Evolved Ribbon 8 — the Leverage 8 Method symbol" className="lwm-screen relative h-full w-full object-cover" />
      </div>
    </div>
    <ol className="divide-y lwm-line border-y lwm-line">
      {METHOD.map((m, i) => (
        <li key={m.name} data-testid={`method-step-${i + 1}`} className="group grid grid-cols-[3.5rem_1fr] gap-4 py-6 transition-colors hover:bg-white/[0.02] sm:grid-cols-[4.5rem_1fr_auto] sm:items-baseline">
          <span className="font-display text-4xl font-light text-transparent [-webkit-text-stroke:1px_rgba(125,211,252,0.7)] transition-colors group-hover:text-sky-300/90">{m.code}</span>
          <div>
            <h3 className="text-lg font-medium text-white">{m.name}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{m.text}</p>
          </div>
          <span className="col-start-2 font-mono-ed text-[11px] uppercase tracking-[0.16em] text-slate-500 sm:col-start-3">{m.stage}</span>
        </li>
      ))}
    </ol>
  </div>
);
