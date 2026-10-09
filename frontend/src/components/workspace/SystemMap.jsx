import { EPISTEMIC } from "@/lib/brand";

const CX = 400;
const CY = 235;
const INNER = ["stakeholders", "patterns", "loops", "in_scope", "assumptions", "relationships"];
const COLORS = { known: "#34D399", inferred: "#A78BFA", unknown: "#FBBF24" };
const clip = (t, n = 26) => (t.length > n ? `${t.slice(0, n - 1)}…` : t);

const ring = (list, rx, ry, offset = -Math.PI / 2) =>
  list.map((item, i) => {
    const angle = offset + (i / Math.max(list.length, 1)) * Math.PI * 2;
    return { item, x: CX + rx * Math.cos(angle), y: CY + ry * Math.sin(angle) };
  });

const Node = ({ x, y, item }) => {
  const anchor = Math.abs(x - CX) < 30 ? "middle" : x > CX ? "start" : "end";
  const dx = anchor === "middle" ? 0 : anchor === "start" ? 12 : -12;
  return (
    <g data-testid={`map-node-${item.id}`}>
      <title>{`${item.text} (${EPISTEMIC[item.epistemic].label})`}</title>
      <circle cx={x} cy={y} r="11" fill={COLORS[item.epistemic]} opacity="0.12" />
      <circle cx={x} cy={y} r="5" fill={COLORS[item.epistemic]} />
      <text x={x + dx} y={anchor === "middle" ? y - 16 : y + 4} textAnchor={anchor} className="fill-slate-300" style={{ fontSize: 12, fontFamily: "Plus Jakarta Sans" }}>{clip(item.text)}</text>
    </g>
  );
};

export const SystemMap = ({ analysis }) => {
  const inner = ring(analysis.items.filter((i) => INNER.includes(i.section)).slice(0, 12), 205, 140);
  const outer = ring(analysis.items.filter((i) => i.section === "out_of_scope").slice(0, 6), 330, 205, -Math.PI / 3);
  const empty = inner.length + outer.length === 0;
  return (
    <section className="overflow-hidden rounded-2xl border lwm-line bg-[#080D1A]" data-testid="system-map">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b lwm-line px-5 py-3">
        <p className="font-mono-ed text-[11px] uppercase tracking-[0.16em] text-slate-400">System picture · working hypothesis, not truth</p>
        <div className="flex flex-wrap gap-3 text-[11px] text-slate-400">
          {Object.entries(EPISTEMIC).map(([k, m]) => (
            <span key={k} className="inline-flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${m.dot}`} />{m.label}</span>
          ))}
          <span className="inline-flex items-center gap-1.5"><span className="w-4 border-t border-dashed border-slate-500" />Not yet checked</span>
        </div>
      </div>
      <svg viewBox="0 0 800 470" className="h-auto w-full" role="img" aria-label="System map">
        <defs>
          <radialGradient id="core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx={CX} cy={CY} rx="275" ry="185" fill="none" stroke="#38BDF8" strokeOpacity="0.28" strokeDasharray="3 6" />
        <text x={CX} y={CY - 192} textAnchor="middle" className="fill-sky-300/60" style={{ fontSize: 10, letterSpacing: 2, fontFamily: "JetBrains Mono" }}>CURRENT SCOPE</text>
        {inner.map(({ item, x, y }) => (
          <line key={`l-${item.id}`} x1={CX} y1={CY} x2={x} y2={y} stroke={COLORS[item.epistemic]} strokeOpacity="0.35" strokeDasharray={item.epistemic === "known" ? "0" : "4 5"} />
        ))}
        {outer.map(({ item, x, y }) => (
          <line key={`o-${item.id}`} x1={x} y1={y} x2={CX + (x - CX) * 0.82} y2={CY + (y - CY) * 0.82} stroke="#94A3B8" strokeOpacity="0.4" strokeDasharray="2 5" />
        ))}
        <circle cx={CX} cy={CY} r="70" fill="url(#core)" />
        <circle cx={CX} cy={CY} r="9" fill="#E0F2FE" />
        <text x={CX} y={CY + 30} textAnchor="middle" className="fill-white" style={{ fontSize: 13, fontWeight: 600, fontFamily: "Outfit" }}>{clip(analysis.title, 30)}</text>
        {inner.map((n) => <Node key={n.item.id} {...n} />)}
        {outer.map((n) => <Node key={n.item.id} {...n} />)}
        {empty && (
          <text x={CX} y={CY + 70} textAnchor="middle" className="fill-slate-500" style={{ fontSize: 12 }}>Add stakeholders, patterns, loops or scope items to grow the picture.</text>
        )}
      </svg>
    </section>
  );
};
