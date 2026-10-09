import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SystemMap } from "@/components/workspace/SystemMap";
import { EpistemicBadge } from "@/components/workspace/EpistemicBadge";
import { api, errorMessage } from "@/lib/api";

const day = (iso) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

const diffMaps = (before, after) => {
  const b = Object.fromEntries(before.items.map((i) => [i.id, i]));
  const a = Object.fromEntries(after.items.map((i) => [i.id, i]));
  const bl = new Set(before.links.map((l) => l.id));
  const al = new Set(after.links.map((l) => l.id));
  const names = { ...Object.fromEntries(before.items.map((i) => [i.id, i.text])), ...Object.fromEntries(after.items.map((i) => [i.id, i.text])) };
  return {
    added: after.items.filter((i) => !b[i.id]),
    removed: before.items.filter((i) => !a[i.id]),
    relabelled: after.items.filter((i) => b[i.id] && b[i.id].epistemic !== i.epistemic).map((i) => ({ item: i, from: b[i.id].epistemic })),
    revised: after.items.filter((i) => b[i.id] && b[i.id].text !== i.text).map((i) => ({ item: i, before: b[i.id].text })),
    linksAdded: after.links.filter((l) => !bl.has(l.id)).map((l) => `${names[l.from_id]} → ${names[l.to_id]}`),
    linksRemoved: before.links.filter((l) => !al.has(l.id)).map((l) => `${names[l.from_id]} → ${names[l.to_id]}`),
  };
};

const Row = ({ label, children, testId }) => (
  <div className="grid gap-2 border-b lwm-line py-3 sm:grid-cols-[9rem_1fr]" data-testid={testId}>
    <dt className="font-mono-ed text-[10px] uppercase tracking-[0.16em] text-slate-500">{label}</dt>
    <dd className="space-y-1.5 text-sm text-slate-200">{children}</dd>
  </div>
);

const DiffList = ({ diff }) => {
  const total = Object.values(diff).reduce((n, list) => n + list.length, 0);
  if (!total) return <p className="text-sm text-slate-500" data-testid="compare-no-changes">The picture hasn't changed since this loop yet.</p>;
  return (
    <dl data-testid="compare-diff">
      {diff.added.length > 0 && <Row label={`Added · ${diff.added.length}`} testId="compare-added">{diff.added.map((i) => <p key={i.id} className="flex items-start gap-2"><EpistemicBadge kind={i.epistemic} />{i.text}</p>)}</Row>}
      {diff.relabelled.length > 0 && <Row label={`Relabelled · ${diff.relabelled.length}`} testId="compare-relabelled">{diff.relabelled.map(({ item, from }) => (
        <p key={item.id} className="flex flex-wrap items-center gap-1.5"><EpistemicBadge kind={from} /><span className="text-slate-500">→</span><EpistemicBadge kind={item.epistemic} />{item.text}</p>
      ))}</Row>}
      {diff.revised.length > 0 && <Row label={`Revised · ${diff.revised.length}`} testId="compare-revised">{diff.revised.map(({ item, before }) => (
        <p key={item.id}><span className="text-slate-500 line-through">{before}</span> → {item.text}</p>
      ))}</Row>}
      {diff.removed.length > 0 && <Row label={`Removed · ${diff.removed.length}`} testId="compare-removed">{diff.removed.map((i) => <p key={i.id} className="text-slate-400 line-through">{i.text}</p>)}</Row>}
      {diff.linksAdded.length > 0 && <Row label={`Links added · ${diff.linksAdded.length}`} testId="compare-links-added">{diff.linksAdded.map((t) => <p key={t}>{t}</p>)}</Row>}
      {diff.linksRemoved.length > 0 && <Row label={`Links removed · ${diff.linksRemoved.length}`} testId="compare-links-removed">{diff.linksRemoved.map((t) => <p key={t} className="text-slate-400 line-through">{t}</p>)}</Row>}
    </dl>
  );
};

export const BeforeAfterDialog = ({ open, onOpenChange, analysis, learningId }) => {
  const [snaps, setSnaps] = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (!open) return;
    api.get(`/analyses/${analysis.id}/snapshots`).then(({ data }) => {
      setSnaps(data);
      const wanted = data.find((s) => s.learning_id === learningId);
      setSelected((wanted || data[data.length - 1])?.learning_id || null);
    }).catch((e) => toast.error(errorMessage(e)));
  }, [open, analysis.id, learningId]);

  const loops = useMemo(() => analysis.learnings.map((le, i) => ({ ...le, n: i + 1 })), [analysis.learnings]);
  const idx = snaps ? snaps.findIndex((s) => s.learning_id === selected) : -1;
  const before = idx >= 0 ? snaps[idx] : null;
  const next = idx >= 0 ? snaps[idx + 1] : null;
  const after = next || { items: analysis.items, links: analysis.links || [], created_at: null };
  const loopN = (id) => loops.find((l) => l.id === id)?.n;
  const diff = before ? diffMaps(before, after) : null;
  const highlight = diff ? new Set([...diff.added.map((i) => i.id), ...diff.relabelled.map((r) => r.item.id), ...diff.revised.map((r) => r.item.id),
    ...after.links.filter((l) => !before.links.some((x) => x.id === l.id)).map((l) => l.id)]) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-6xl" data-testid="compare-dialog">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Before / after a learning loop</DialogTitle>
          <DialogDescription>The system picture as it stood when you recorded a loop, next to how it looks afterwards. Both are working hypotheses.</DialogDescription>
        </DialogHeader>
        {!snaps ? (
          <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-sky-300" /></div>
        ) : snaps.length === 0 || !before ? (
          <p className="py-10 text-center text-sm text-slate-400" data-testid="compare-empty">Snapshots are captured whenever you record a learning loop. Record one in Learn, then come back to compare.</p>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-slate-400">Learning loop</span>
              <Select value={selected || ""} onValueChange={setSelected}>
                <SelectTrigger className="w-full bg-[#070A14] sm:w-96" data-testid="compare-loop-select"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {snaps.map((s) => {
                    const le = loops.find((l) => l.id === s.learning_id);
                    return <SelectItem key={s.learning_id} value={s.learning_id}>Loop {le?.n} · {day(s.created_at)} — {le?.tried.slice(0, 50)}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <SystemMap analysis={{ title: analysis.title, ...before }} prefix="before" testId="compare-map-before" caption={`Before · when loop ${loopN(before.learning_id)} was recorded`} />
              <SystemMap analysis={{ title: analysis.title, ...after }} prefix="after" testId="compare-map-after" highlightIds={highlight}
                caption={next ? `After · just before loop ${loopN(next.learning_id)}` : "After · now"} />
            </div>
            <p className="text-xs text-slate-500"><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full border border-cyan-300 align-middle" />Ringed nodes and bolder links are new or changed since the loop.</p>
            <DiffList diff={diff} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
