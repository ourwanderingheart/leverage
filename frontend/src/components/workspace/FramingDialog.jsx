import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FRAMING_FIELDS } from "@/pages/NewAnalysis";

export const FramingDialog = ({ open, onOpenChange, analysis, actions }) => {
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) setForm({ challenge: analysis.challenge, current_situation: analysis.current_situation, desired_situation: analysis.desired_situation });
  }, [open, analysis]);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    if (await actions.update(form, "Framing updated")) onOpenChange(false);
    setBusy(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl" data-testid="framing-dialog">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Revise the framing</DialogTitle>
          <DialogDescription>Your understanding is allowed to change. Rewrite any of these as it does.</DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="space-y-5">
          {FRAMING_FIELDS.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <Label htmlFor={`fr-${f.key}`}>{f.label}</Label>
              <Textarea id={`fr-${f.key}`} rows={3} required={f.required} value={form[f.key] || ""} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} className="bg-[#070A14]" data-testid={`framing-${f.key}-input`} />
            </div>
          ))}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={busy} className="bg-blue-500 hover:bg-blue-400" data-testid="framing-save-btn">{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save framing</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
