import { useState } from "react";
import { FlaskConical, NotebookPen, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ItemList } from "@/components/workspace/ItemList";
import { ExperimentDialog } from "@/components/workspace/ExperimentDialog";

const STATUS = { planned: "Planned", running: "Running", done: "Done" };

const ExperimentRow = ({ exp, leverage, actions, onEdit, onLearn }) => (
  <li className="py-5" data-testid={`experiment-${exp.id}`}>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h4 className="font-display text-lg font-medium text-white" data-testid={`experiment-title-${exp.id}`}>{exp.title}</h4>
        {leverage && <p className="mt-0.5 text-xs text-slate-500">Explores: {leverage.text}</p>}
      </div>
      <div className="flex items-center gap-1">
        <Select value={exp.status} onValueChange={(v) => actions.updateExperiment(exp.id, { status: v })}>
          <SelectTrigger className="h-8 w-[110px] bg-[#070A14] text-xs" data-testid={`experiment-status-${exp.id}`}><SelectValue /></SelectTrigger>
          <SelectContent>{Object.entries(STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
        </Select>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit} data-testid={`experiment-edit-${exp.id}`} aria-label="Edit"><Pencil className="h-3.5 w-3.5" /></Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-red-300" onClick={() => actions.deleteExperiment(exp.id)} data-testid={`experiment-delete-${exp.id}`} aria-label="Delete"><Trash2 className="h-3.5 w-3.5" /></Button>
      </div>
    </div>
    <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
      {[["If we try", exp.action], ["Testing whether", exp.hypothesis], ["Watching for", exp.signal]].map(([k, v]) => (
        <div key={k}><dt className="font-mono-ed text-[10px] uppercase tracking-[0.16em] text-slate-500">{k}</dt><dd className="mt-1 text-slate-300">{v || "—"}</dd></div>
      ))}
    </dl>
    <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
      {exp.timeframe && <span>{exp.timeframe}</span>}
      <button onClick={onLearn} className="inline-flex items-center gap-1 text-sky-300 hover:text-sky-200" data-testid={`experiment-learn-${exp.id}`}><NotebookPen className="h-3.5 w-3.5" />Record what happened</button>
    </div>
  </li>
);

export const DecideStage = ({ analysis, actions, onLearn }) => {
  const [dialog, setDialog] = useState({ open: false, experiment: null });
  const leverageItems = analysis.items.filter((i) => i.section === "leverage");
  return (
    <div className="space-y-6" data-testid="stage-decide">
      <p className="max-w-2xl text-sm leading-relaxed text-slate-400">Leverage here is a set of possibilities, not a ranking. Each one is a place where change <em>may</em> have influence — the way to find out is to try something small.</p>
      <ItemList section="leverage" items={analysis.items} actions={actions} />
      <section className="rounded-2xl border lwm-line bg-[#0B1120]/70 p-5 sm:p-6" data-testid="experiments-section">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 font-display text-lg font-medium text-white"><FlaskConical className="h-4 w-4 text-cyan-300" />Small experiments</h3>
            <p className="mt-1 text-sm text-slate-500">Testable moves you can learn from, whatever happens.</p>
          </div>
          <Button onClick={() => setDialog({ open: true, experiment: null })} className="rounded-full bg-blue-500 hover:bg-blue-400" size="sm" data-testid="add-experiment-btn"><Plus className="mr-1 h-4 w-4" />Design an experiment</Button>
        </div>
        <ul className="mt-2 divide-y lwm-line">
          {analysis.experiments.map((exp) => (
            <ExperimentRow key={exp.id} exp={exp} actions={actions} leverage={leverageItems.find((l) => l.id === exp.leverage_item_id)}
              onEdit={() => setDialog({ open: true, experiment: exp })} onLearn={() => onLearn(exp.id)} />
          ))}
          {analysis.experiments.length === 0 && <li className="py-6 text-sm text-slate-500" data-testid="experiments-empty">No experiments yet. What is one small thing you could try in the next two weeks?</li>}
        </ul>
      </section>
      <ExperimentDialog open={dialog.open} experiment={dialog.experiment} onOpenChange={(open) => setDialog({ ...dialog, open })} leverageItems={leverageItems} actions={actions} />
    </div>
  );
};
