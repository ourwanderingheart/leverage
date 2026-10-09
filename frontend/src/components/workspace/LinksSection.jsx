import { useState } from "react";
import { ArrowRight, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EpistemicBadge } from "@/components/workspace/EpistemicBadge";
import { KindToggle } from "@/components/workspace/ItemList";
import { MAP_SECTIONS } from "@/components/workspace/SystemMap";

const ItemSelect = ({ value, onChange, options, placeholder, testId }) => (
  <Select value={value} onValueChange={onChange}>
    <SelectTrigger className="h-9 min-w-0 flex-1 bg-[#070A14] text-sm" data-testid={testId}><SelectValue placeholder={placeholder} /></SelectTrigger>
    <SelectContent>
      {options.map((i) => <SelectItem key={i.id} value={i.id}>{i.text.length > 60 ? `${i.text.slice(0, 59)}…` : i.text}</SelectItem>)}
    </SelectContent>
  </Select>
);

const LinkForm = ({ options, actions }) => {
  const [form, setForm] = useState({ from_id: "", to_id: "", note: "", epistemic: "unknown" });
  const [busy, setBusy] = useState(false);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v, ...(k === "from_id" && v === f.to_id ? { to_id: "" } : {}) }));
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    if (await actions.addLink(form, "Link added as a hypothesis")) setForm({ from_id: "", to_id: "", note: "", epistemic: "unknown" });
    setBusy(false);
  };
  return (
    <form onSubmit={submit} className="mt-4 space-y-2" data-testid="link-form">
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <ItemSelect value={form.from_id} onChange={set("from_id")} options={options} placeholder="Choose A" testId="link-from-select" />
        <span className="shrink-0 px-1 font-serif-ed text-base italic text-sky-200">may influence</span>
        <ItemSelect value={form.to_id} onChange={set("to_id")} options={options.filter((i) => i.id !== form.from_id)} placeholder="Choose B" testId="link-to-select" />
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input value={form.note} onChange={(e) => set("note")(e.target.value)} maxLength={300} placeholder="How? (optional) e.g. by delaying handoffs" className="h-9 flex-1 bg-[#070A14] text-sm" data-testid="link-note-input" />
        <div className="flex items-center gap-2">
          <KindToggle value={form.epistemic} onChange={set("epistemic")} section="link" labels={{ known: "Observed", unknown: "To check" }} />
          <Button type="submit" size="sm" variant="secondary" disabled={busy || !form.from_id || !form.to_id} className="h-9" data-testid="link-add-btn">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}<span className="ml-1">Link</span>
          </Button>
        </div>
      </div>
    </form>
  );
};

export const LinksSection = ({ analysis, actions }) => {
  const options = analysis.items.filter((i) => MAP_SECTIONS.includes(i.section));
  const names = Object.fromEntries(analysis.items.map((i) => [i.id, i.text]));
  const links = analysis.links || [];
  return (
    <section className="rounded-2xl border border-sky-400/15 bg-[#0B1120]/70 p-5 sm:p-6" data-testid="links-section">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-display text-lg font-medium text-white">Relationship links</h3>
        <span className="font-mono-ed text-xs text-slate-500" data-testid="links-count">{links.length}</span>
      </div>
      <p className="mt-1 text-sm text-slate-500">Connect two map items as “A may influence B”. Every link is drawn as a dashed hypothesis — a possibility, not a proven cause.</p>
      <ul className="mt-3 divide-y lwm-line">
        {links.map((l) => (
          <li key={l.id} className="group flex items-start gap-3 py-3" data-testid={`link-${l.id}`}>
            <EpistemicBadge kind={l.epistemic} className="mt-0.5" />
            <div className="min-w-0 flex-1 text-sm text-slate-200">
              <span>{names[l.from_id]}</span>
              <span className="mx-2 inline-flex items-center gap-1 font-serif-ed italic text-sky-200">may influence <ArrowRight className="h-3 w-3" /></span>
              <span>{names[l.to_id]}</span>
              {l.note && <p className="mt-0.5 text-xs text-slate-500">{l.note}</p>}
              {l.source === "guide" && <p className="mt-0.5 text-[11px] text-violet-300/80">Proposed by the Guide · confirmed by you</p>}
            </div>
            <button onClick={() => actions.deleteLink(l.id)} className="rounded p-1 text-slate-500 hover:bg-red-500/10 hover:text-red-300 md:opacity-0 md:group-hover:opacity-100" data-testid={`link-delete-${l.id}`} aria-label="Remove link">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>
      {options.length < 2 ? (
        <p className="mt-3 text-sm text-slate-500" data-testid="links-need-items">Add at least two items to the map (stakeholders, patterns, loops, assumptions, relationships or scope) to link them.</p>
      ) : (
        <LinkForm options={options} actions={actions} />
      )}
    </section>
  );
};
