import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/app/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { api, errorMessage } from "@/lib/api";

export const FRAMING_FIELDS = [
  { key: "challenge", label: "The challenge", hint: "In your own words, what feels difficult or stuck?", placeholder: "Our new onboarding keeps losing people in the second week, and we're not sure why.", required: true },
  { key: "current_situation", label: "The current situation", hint: "What is happening now? What have you noticed?", placeholder: "About half of new members stop logging in after day 10. Support tickets mention confusion about…" },
  { key: "desired_situation", label: "The desired situation", hint: "What would better look like? Describe it, not the solution.", placeholder: "New members feel confident enough to keep coming back on their own." },
];

export default function NewAnalysis() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: "", challenge: "", current_situation: "", desired_situation: "" });
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post("/analyses", form);
      navigate(`/analysis/${data.id}`, { replace: true });
    } catch (err) {
      toast.error(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <div className="relative z-10 min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-5 py-12 sm:px-8 lg:py-16">
        <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white" data-testid="new-back-link"><ArrowLeft className="h-4 w-4" />Analyses</Link>
        <p className="lwm-eyebrow mt-10">New analysis · Locate the challenge</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl">What are you working through?</h1>
        <p className="mt-4 max-w-xl text-slate-400">Everything you write here is treated as <span className="text-emerald-300">Known</span> — information you provided. No solutions needed yet.</p>
        <form onSubmit={submit} className="mt-12 space-y-10" data-testid="new-analysis-form">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-base text-white">A short name</Label>
            <Input id="title" required maxLength={140} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Second-week onboarding drop-off" className="h-12 bg-[#0C1222] text-base" data-testid="new-title-input" />
          </div>
          {FRAMING_FIELDS.map((f) => (
            <div key={f.key} className="space-y-2">
              <Label htmlFor={f.key} className="text-base text-white">{f.label}</Label>
              <p className="text-sm text-slate-500">{f.hint}</p>
              <Textarea id={f.key} required={f.required} rows={4} value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} placeholder={f.placeholder} className="bg-[#0C1222] text-base leading-relaxed" data-testid={`new-${f.key}-input`} />
            </div>
          ))}
          <div className="flex items-center gap-4 border-t lwm-line pt-8">
            <Button type="submit" size="lg" disabled={busy} className="rounded-full bg-blue-500 px-7 hover:bg-blue-400" data-testid="new-analysis-submit-btn">
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Begin with Focus
            </Button>
            <Link to="/dashboard" className="text-sm text-slate-400 hover:text-white" data-testid="new-cancel-link">Cancel</Link>
          </div>
        </form>
      </main>
    </div>
  );
}
