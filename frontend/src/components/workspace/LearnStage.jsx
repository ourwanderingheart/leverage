import { useEffect, useState } from "react";
import { ArrowRight, Columns2, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const FIELDS = [
  { key: "tried", label: "What did you try?", required: true },
  { key: "happened", label: "What happened?" },
  { key: "surprised", label: "What surprised you?" },
  { key: "changed", label: "What changed in your understanding?" },
  { key: "revise", label: "What do you want to revise in the system picture?" },
];
const EMPTY = { tried: "", happened: "", surprised: "", changed: "", revise: "" };

const LearningForm = ({ analysis, actions, experimentId }) => {
  const [form, setForm] = useState(EMPTY);
  const [exp, setExp] = useState(experimentId || "none");
  const [busy, setBusy] = useState(false);
  useEffect(() => setExp(experimentId || "none"), [experimentId]);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    if (await actions.addLearning({ ...form, experiment_id: exp === "none" ? null : exp }, "Learning recorded")) setForm(EMPTY);
    setBusy(false);
  };

  return (
    <form onSubmit={save} className="space-y-4 rounded-2xl border lwm-line bg-[#0B1120]/70 p-5 sm:p-6" data-testid="learning-form">
      <h3 className="font-display text-lg font-medium text-white">Record a learning loop</h3>
      <div className="space-y-1.5">
        <Label>Related experiment</Label>
        <Select value={exp} onValueChange={setExp}>
          <SelectTrigger className="bg-[#070A14]" data-testid="learning-experiment-select"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Not tied to an experiment</SelectItem>
            {analysis.experiments.map((x) => <SelectItem key={x.id} value={x.id}>{x.title}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {FIELDS.map((f, i) => (
          <div key={f.key} className={`space-y-1.5 ${i === 0 || i === 4 ? "md:col-span-2" : ""}`}>
            <Label htmlFor={`le-${f.key}`}>{f.label}</Label>
            <Textarea id={`le-${f.key}`} rows={2} required={f.required} value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} className="bg-[#070A14]" data-testid={`learning-${f.key}-input`} />
          </div>
        ))}
      </div>
      <Button type="submit" disabled={busy} className="rounded-full bg-blue-500 hover:bg-blue-400" data-testid="learning-save-btn">{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save learning</Button>
    </form>
  );
};

const LearningEntry = ({ entry, experiment, actions, onRevise, onCompare }) => (
  <li className="relative border-l border-sky-400/25 pb-8 pl-6" data-testid={`learning-${entry.id}`}>
    <span className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-cyan-300" />
    <div className="flex items-start justify-between gap-3">
      <p className="font-mono-ed text-xs text-slate-500">{new Date(entry.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}{experiment && ` · ${experiment.title}`}</p>
      <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-red-300" onClick={() => actions.deleteLearning(entry.id)} data-testid={`learning-delete-${entry.id}`} aria-label="Delete"><Trash2 className="h-3.5 w-3.5" /></Button>
    </div>
    <dl className="mt-2 space-y-2 text-sm">
      {FIELDS.filter((f) => entry[f.key]).map((f) => (
        <div key={f.key}><dt className="text-slate-500">{f.label}</dt><dd className="mt-0.5 text-slate-200">{entry[f.key]}</dd></div>
      ))}
    </dl>
    <div className="mt-3 flex flex-wrap gap-4">
      {entry.revise && (
        <button onClick={onRevise} className="inline-flex items-center gap-1 text-xs text-sky-300 hover:text-sky-200" data-testid={`learning-revise-${entry.id}`}>Revise the system picture in See <ArrowRight className="h-3 w-3" /></button>
      )}
      <button onClick={() => onCompare(entry.id)} className="inline-flex items-center gap-1 text-xs text-sky-300 hover:text-sky-200" data-testid={`learning-compare-${entry.id}`}><Columns2 className="h-3 w-3" />Compare map before / after</button>
    </div>
  </li>
);

export const LearnStage = ({ analysis, actions, experimentId, onRevise, onCompare }) => (
  <div className="space-y-8" data-testid="stage-learn">
    <LearningForm analysis={analysis} actions={actions} experimentId={experimentId} />
    <section data-testid="learning-timeline">
      <h3 className="mb-5 font-display text-lg font-medium text-white">Learning over time</h3>
      {analysis.learnings.length === 0 ? (
        <p className="text-sm text-slate-500">Nothing recorded yet. Learning loops start when something is tried.</p>
      ) : (
        <ol>
          {[...analysis.learnings].reverse().map((entry) => (
            <LearningEntry key={entry.id} entry={entry} actions={actions} onRevise={onRevise} onCompare={onCompare} experiment={analysis.experiments.find((x) => x.id === entry.experiment_id)} />
          ))}
        </ol>
      )}
    </section>
  </div>
);
