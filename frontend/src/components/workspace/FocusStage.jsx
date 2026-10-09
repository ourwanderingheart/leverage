import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ItemList } from "@/components/workspace/ItemList";
import { FramingDialog } from "@/components/workspace/FramingDialog";
import { EpistemicBadge } from "@/components/workspace/EpistemicBadge";
import { FRAMING_FIELDS } from "@/pages/NewAnalysis";

const FocusQuestion = ({ analysis, actions }) => {
  const [value, setValue] = useState(analysis.focus_question);
  useEffect(() => setValue(analysis.focus_question), [analysis.focus_question]);
  const dirty = value !== analysis.focus_question;
  return (
    <section className="rounded-2xl border border-sky-400/20 bg-gradient-to-br from-sky-500/[0.06] to-transparent p-5 sm:p-7" data-testid="focus-question-section">
      <p className="lwm-eyebrow">What are you trying to understand?</p>
      <Textarea value={value} onChange={(e) => setValue(e.target.value)} rows={3} maxLength={1500}
        placeholder="e.g. Why do people who seem engaged in week one disappear in week two?"
        className="mt-4 resize-none border-0 bg-transparent p-0 font-display text-xl leading-snug text-white shadow-none placeholder:text-slate-600 focus-visible:ring-0 sm:text-2xl"
        data-testid="focus-question-input" />
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500">A question, not a solution. You can rewrite it as your understanding shifts.</p>
        {dirty && <Button size="sm" onClick={() => actions.update({ focus_question: value }, "Focus saved")} className="bg-blue-500 hover:bg-blue-400" data-testid="focus-question-save-btn">Save</Button>}
      </div>
    </section>
  );
};

const Framing = ({ analysis, onEdit }) => (
  <section className="grid gap-px overflow-hidden rounded-2xl border lwm-line bg-[rgba(148,163,184,0.14)] md:grid-cols-3" data-testid="framing-section">
    {FRAMING_FIELDS.map((f) => (
      <div key={f.key} className="bg-[#0B1120] p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="font-mono-ed text-[11px] uppercase tracking-[0.16em] text-slate-500">{f.label.replace("The ", "")}</p>
          <EpistemicBadge kind="known" />
        </div>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-300" data-testid={`framing-${f.key}`}>{analysis[f.key] || <span className="text-slate-600">Not described yet.</span>}</p>
      </div>
    ))}
    <div className="bg-[#0B1120] px-5 pb-4 md:col-span-3">
      <Button variant="ghost" size="sm" onClick={onEdit} className="-ml-2 text-slate-400 hover:text-white" data-testid="framing-edit-btn"><Pencil className="mr-1.5 h-3.5 w-3.5" />Revise framing</Button>
    </div>
  </section>
);

export const FocusStage = ({ analysis, actions }) => {
  const [editing, setEditing] = useState(false);
  return (
    <div className="space-y-6" data-testid="stage-focus">
      <FocusQuestion analysis={analysis} actions={actions} />
      <Framing analysis={analysis} onEdit={() => setEditing(true)} />
      <div className="grid gap-6 xl:grid-cols-2">
        <ItemList section="in_scope" items={analysis.items} actions={actions} />
        <ItemList section="out_of_scope" items={analysis.items} actions={actions} />
      </div>
      <FramingDialog open={editing} onOpenChange={setEditing} analysis={analysis} actions={actions} />
    </div>
  );
};
