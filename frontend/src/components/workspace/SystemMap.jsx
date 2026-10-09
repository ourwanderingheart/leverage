import { EPISTEMIC } from "@/lib/brand";

const CX = 400;
const CY = 235;
const INNER = ["stakeholders", "patterns", "loops", "in_scope", "assumptions", "relationships"];
export const MAP_SECTIONS = [...INNER, "out_of_scope"];
const COLORS = { known: "#34D399", inferred: "#A78BFA", unknown: "#FBBF24" };
const clip = (t, n = 26) => (t.length > n ? `${t.slice(0, n - 1)}…` : t);

const linkPath = (a, b) => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const [ux, uy] = [dx / len, dy / len];
  const [sx, sy, ex, ey] = [a.x + ux * 12, a.y + uy * 12, b.x - ux * 15, b.y - uy * 15];
  return `M${sx},${sy} Q${(sx + ex) / 2 - uy * len * 0.18},${(sy + ey) / 2 + ux * len * 0.18} ${ex},${ey}`;
};

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
  const pos = Object.fromEntries([...inner, ...outer].map((n) => [n.item.id, n]));
  const links = (analysis.links || []).filter((l) => pos[l.from_id] && pos[l.to_id]);
  return (
    <section className="overflow-hidden rounded-2xl border lwm-line bg-[#080D1A]" data-testid="system-map">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b lwm-line px-5 py-3">
        <p className="font-mono-ed text-[11px] uppercase tracking-[0.16em] text-slate-400">System picture · working hypothesis, not truth</p>
        <div className="flex flex-wrap gap-3 text-[11px] text-slate-400">
          {Object.entries(EPISTEMIC).map(([k, m]) => (
            <span key={k} className="inline-flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${m.dot}`} />{m.label}</span>
          ))}
          <span className="inline-flex items-center gap-1.5"><span className="w-4 border-t border-dashed border-slate-500" />Not yet checked</span>
          <span className="inline-flex items-center gap-1.5 text-sky-200/80">⇢ may influence (hypothesis)</span>
        </div>
      </div>
      <svg viewBox="0 0 800 470" className="h-auto w-full" role="img" aria-label="System map">
        <defs>
          <radialGradient id="core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
          </radialGradient>
          {Object.entries(COLORS).map(([k, c]) => (
            <marker key={k} id={`arrow-${k}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill={c} />
            </marker>
          ))}
        </defs>
        <ellipse cx={CX} cy={CY} rx="275" ry="185" fill="none" stroke="#38BDF8" strokeOpacity="0.28" strokeDasharray="3 6" />
        <text x={CX} y={CY - 192} textAnchor="middle" className="fill-sky-300/60" style={{ fontSize: 10, letterSpacing: 2, fontFamily: "JetBrains Mono" }}>CURRENT SCOPE</text>
        {inner.map(({ item, x, y }) => (
          <line key={`l-${item.id}`} x1={CX} y1={CY} x2={x} y2={y} stroke={COLORS[item.epistemic]} strokeOpacity={links.length ? "0.15" : "0.35"} strokeDasharray={item.epistemic === "known" ? "0" : "4 5"} />
        ))}
        {outer.map(({ item, x, y }) => (
          <line key={`o-${item.id}`} x1={x} y1={y} x2={CX + (x - CX) * 0.82} y2={CY + (y - CY) * 0.82} stroke="#94A3B8" strokeOpacity="0.4" strokeDasharray="2 5" />
        ))}
        <circle cx={CX} cy={CY} r="70" fill="url(#core)" />
        <circle cx={CX} cy={CY} r="9" fill="#E0F2FE" />
        <text x={CX} y={CY + 30} textAnchor="middle" className="fill-white" style={{ fontSize: 13, fontWeight: 600, fontFamily: "Outfit" }}>{clip(analysis.title, 30)}</text>
        {inner.map((n) => <Node key={n.item.id} {...n} />)}
        {outer.map((n) => <Node key={n.item.id} {...n} />)}
        {links.map((l) => (
          <path key={l.id} d={linkPath(pos[l.from_id], pos[l.to_id])} fill="none" stroke={COLORS[l.epistemic]} strokeWidth="1.6" strokeOpacity="0.9"
            strokeDasharray="6 5" markerEnd={`url(#arrow-${l.epistemic})`} data-testid={`map-link-${l.id}`}>
            <title>{`${pos[l.from_id].item.text} may influence ${pos[l.to_id].item.text}${l.note ? ` — ${l.note}` : ""}`}</title>
          </path>
        ))}
        {empty && (
          <text x={CX} y={CY + 70} textAnchor="middle" className="fill-slate-500" style={{ fontSize: 12 }}>Add stakeholders, patterns, loops or scope items to grow the picture.</text>
        )}
      </svg>
    </section>
  );
};
