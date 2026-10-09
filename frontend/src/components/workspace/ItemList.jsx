import { useEffect, useState } from "react";
import { MoreHorizontal, Pencil, Sparkles, Trash2, CheckCircle2, HelpCircle, Plus, Loader2, SearchCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EpistemicBadge } from "@/components/workspace/EpistemicBadge";
import { SECTION_META } from "@/lib/brand";
import { cn } from "@/lib/utils";

const ItemRow = ({ item, actions }) => {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(item.text);
  useEffect(() => setText(item.text), [item.text]);
  const save = async (e) => {
    e.preventDefault();
    if (text.trim() && (await actions.updateItem(item.id, { text: text.trim() }))) setEditing(false);
  };
  return (
    <li className="group flex items-start gap-3 py-3" data-testid={`item-${item.id}`}>
      <EpistemicBadge kind={item.epistemic} className="mt-0.5" testId={`item-badge-${item.id}`} />
      <div className="min-w-0 flex-1">
        {editing ? (
          <form onSubmit={save} className="flex gap-2">
            <Input autoFocus value={text} onChange={(e) => setText(e.target.value)} className="h-8 bg-[#070A14]" data-testid={`item-edit-input-${item.id}`} />
            <Button size="sm" type="submit" className="h-8" data-testid={`item-edit-save-${item.id}`}>Save</Button>
            <Button size="sm" type="button" variant="ghost" className="h-8" onClick={() => setEditing(false)}>Cancel</Button>
          </form>
        ) : (
          <p className="text-sm leading-relaxed text-slate-200" data-testid={`item-text-${item.id}`}>{item.text}</p>
        )}
        {item.source === "guide" && (
          <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-violet-300/80"><Sparkles className="h-3 w-3" />Proposed by the Guide · confirmed by you{item.note ? ` — ${item.note}` : ""}</p>
        )}
        {item.epistemic !== "known" && actions.askGuide && !editing && (
          <button onClick={() => actions.askGuide(item)} className="mt-1.5 flex items-center gap-1 text-[11px] text-sky-300/90 transition-colors hover:text-sky-200" data-testid={`item-check-${item.id}`}>
            <SearchCheck className="h-3 w-3" />How could I check this?
          </button>
        )}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="rounded p-1 text-slate-500 hover:bg-white/5 hover:text-white md:opacity-0 md:group-hover:opacity-100 data-[state=open]:opacity-100" data-testid={`item-menu-${item.id}`} aria-label="Item actions">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditing(true)} data-testid={`item-edit-${item.id}`}><Pencil className="mr-2 h-3.5 w-3.5" />Edit</DropdownMenuItem>
          {item.epistemic !== "known" && (
            <DropdownMenuItem onClick={() => actions.updateItem(item.id, { epistemic: "known" })} data-testid={`item-mark-known-${item.id}`}><CheckCircle2 className="mr-2 h-3.5 w-3.5" />Mark as known (I've checked)</DropdownMenuItem>
          )}
          {item.epistemic !== "unknown" && (
            <DropdownMenuItem onClick={() => actions.updateItem(item.id, { epistemic: "unknown" })} data-testid={`item-mark-unknown-${item.id}`}><HelpCircle className="mr-2 h-3.5 w-3.5" />Mark as unknown (needs checking)</DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => actions.deleteItem(item.id)} className="text-red-300" data-testid={`item-delete-${item.id}`}><Trash2 className="mr-2 h-3.5 w-3.5" />Remove</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
};

export const KindToggle = ({ value, onChange, section, labels = { known: "Known", unknown: "To check" } }) => (
  <div className="flex shrink-0 rounded-full border lwm-line p-0.5 text-xs">
    {Object.entries(labels).map(([k, label]) => (
      <button key={k} type="button" onClick={() => onChange(k)} data-testid={`add-${section}-kind-${k}`}
        className={cn("rounded-full px-2.5 py-1 transition-colors", value === k ? (k === "known" ? "bg-emerald-500/15 text-emerald-200" : "bg-amber-500/15 text-amber-200") : "text-slate-400 hover:text-white")}>
        {label}
      </button>
    ))}
  </div>
);

export const ItemList = ({ section, items, actions }) => {
  const meta = SECTION_META[section];
  const [text, setText] = useState("");
  const [kind, setKind] = useState("known");
  const [busy, setBusy] = useState(false);
  const list = items.filter((i) => i.section === section);

  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    if (await actions.addItem({ section, text: text.trim(), epistemic: kind })) setText("");
    setBusy(false);
  };

  return (
    <section className="rounded-2xl border lwm-line bg-[#0B1120]/70 p-5 sm:p-6" data-testid={`section-${section}`}>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-display text-lg font-medium text-white">{meta.title}</h3>
        <span className="font-mono-ed text-xs text-slate-500" data-testid={`section-count-${section}`}>{list.length}</span>
      </div>
      <p className="mt-1 text-sm text-slate-500">{meta.hint}</p>
      <ul className="mt-3 divide-y lwm-line">
        {list.map((item) => <ItemRow key={item.id} item={item} actions={actions} />)}
      </ul>
      <form onSubmit={submit} className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center" data-testid={`add-${section}-form`}>
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder={meta.placeholder} maxLength={600} className="h-9 flex-1 bg-[#070A14] text-sm" data-testid={`add-${section}-input`} />
        <div className="flex items-center gap-2">
          <KindToggle value={kind} onChange={setKind} section={section} />
          <Button type="submit" size="sm" variant="secondary" disabled={busy || !text.trim()} className="h-9" data-testid={`add-${section}-btn`}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}<span className="ml-1">Add</span>
          </Button>
        </div>
      </form>
    </section>
  );
};
