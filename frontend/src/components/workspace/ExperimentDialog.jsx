import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const EMPTY = { title: "", action: "", hypothesis: "", signal: "", timeframe: "", leverage_item_id: "none" };
const FIELDS = [
  { key: "action", label: "If we try…", placeholder: "Move the weekly check-in to the first ten minutes of Monday stand-up." },
  { key: "hypothesis", label: "We're testing whether…", placeholder: "Earlier visibility may reduce last-minute surprises." },
  { key: "signal", label: "We'll watch for…", placeholder: "Number of blockers raised before Wednesday." },
];

export const ExperimentDialog = ({ open, onOpenChange, experiment, leverageItems, actions }) => {
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) setForm(experiment ? { ...EMPTY, ...experiment, leverage_item_id: experiment.leverage_item_id || "none" } : EMPTY);
  }, [open, experiment]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    const body = {
      title: form.title, action: form.action, hypothesis: form.hypothesis, signal: form.signal, timeframe: form.timeframe,
      leverage_item_id: form.leverage_item_id === "none" ? null : form.leverage_item_id,
    };
    const ok = experiment ? await actions.updateExperiment(experiment.id, body, "Experiment updated") : await actions.addExperiment(body, "Experiment added");
    setBusy(false);
    if (ok) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl" data-testid="experiment-dialog">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{experiment ? "Edit experiment" : "Design a small experiment"}</DialogTitle>
          <DialogDescription>Small, safe to try, and able to teach you something either way.</DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ex-title">Name</Label>
            <Input id="ex-title" required value={form.title} onChange={set("title")} className="bg-[#070A14]" data-testid="experiment-title-input" />
          </div>
          {FIELDS.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <Label htmlFor={`ex-${f.key}`}>{f.label}</Label>
              <Textarea id={`ex-${f.key}`} rows={2} value={form[f.key]} onChange={set(f.key)} placeholder={f.placeholder} className="bg-[#070A14]" data-testid={`experiment-${f.key}-input`} />
            </div>
          ))}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ex-time">Timeframe</Label>
              <Input id="ex-time" value={form.timeframe} onChange={set("timeframe")} placeholder="Two weeks" className="bg-[#070A14]" data-testid="experiment-timeframe-input" />
            </div>
            <div className="space-y-1.5">
              <Label>Possible leverage it explores</Label>
              <Select value={form.leverage_item_id} onValueChange={(v) => setForm({ ...form, leverage_item_id: v })}>
                <SelectTrigger className="bg-[#070A14]" data-testid="experiment-leverage-select"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not linked</SelectItem>
                  {leverageItems.map((l) => <SelectItem key={l.id} value={l.id}>{l.text.slice(0, 60)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={busy} className="bg-blue-500 hover:bg-blue-400" data-testid="experiment-save-btn">{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save experiment</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
