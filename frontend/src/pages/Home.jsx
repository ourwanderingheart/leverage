import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { MethodList } from "@/components/site/MethodList";
import { Differences } from "@/components/site/Differences";
import { Button } from "@/components/ui/button";
import { IMAGES, STAGES } from "@/lib/brand";
import { useAuth } from "@/context/AuthContext";

export const useHashScroll = () => {
  const { hash } = useLocation();
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: "smooth" });
  }, [hash]);
};

const Hero = ({ startHref }) => (
  <section className="relative overflow-hidden" data-testid="home-hero">
    <img src={IMAGES.emergingPath} alt="An emerging path of light through complexity" className="lwm-screen pointer-events-none absolute inset-y-0 right-0 h-full w-full object-cover object-right opacity-90 md:w-[78%]" />
    <div className="absolute inset-0 bg-gradient-to-r from-[#070A14] via-[#070A14]/85 to-transparent" />
    <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#070A14] to-transparent" />
    <div className="relative mx-auto max-w-7xl px-5 pb-28 pt-24 sm:px-8 sm:pt-32 lg:pb-40 lg:pt-40">
      <p className="lwm-eyebrow lwm-rise">AI-guided thinking for complex problems</p>
      <h1 className="lwm-rise lwm-d1 mt-6 max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
        <span className="lwm-gradient-text">See the system.</span><br />
        <span className="text-white">Find what matters.</span>
      </h1>
      <p className="lwm-rise lwm-d2 mt-7 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
        A calm place to slow down with a hard situation — to surface patterns and assumptions, notice where change may have influence, try something small, and learn from what happens.
      </p>
      <div className="lwm-rise lwm-d3 mt-10 flex flex-wrap items-center gap-4">
        <Button asChild size="lg" className="rounded-full bg-blue-500 px-7 text-base hover:bg-blue-400" data-testid="hero-start-btn">
          <Link to={startHref}>Start thinking <ArrowRight className="ml-2 h-4 w-4" /></Link>
        </Button>
        <Link to="/about" data-testid="hero-philosophy-link" className="group inline-flex items-center gap-1.5 text-sm text-slate-300 hover:text-white">
          Read our philosophy <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  </section>
);

const HowItWorks = () => (
  <section id="how" className="relative mx-auto max-w-7xl scroll-mt-20 px-5 py-24 sm:px-8 lg:py-32" data-testid="how-it-works">
    <p className="lwm-eyebrow">How it works</p>
    <h2 className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">Four movements. Back and forth as you learn.</h2>
    <ol className="relative mt-16 grid gap-10 md:grid-cols-4 md:gap-6">
      <div className="absolute left-0 right-0 top-[1.1rem] hidden h-px bg-gradient-to-r from-blue-500/60 via-cyan-400/50 to-violet-500/50 md:block" />
      {STAGES.map((s, i) => (
        <li key={s.key} className="relative" data-testid={`how-step-${s.key}`}>
          <span className="relative z-10 flex h-9 w-9 items-center justify-center rounded-full border border-sky-400/40 bg-[#070A14] font-mono-ed text-xs text-sky-300">{i + 1}</span>
          <h3 className="mt-6 font-display text-2xl font-medium text-white">{s.label}</h3>
          <p className="mt-1 font-mono-ed text-[11px] tracking-[0.2em] text-slate-500">{s.letters}</p>
          <p className="mt-3 max-w-[16rem] text-sm leading-relaxed text-slate-400">{s.text}</p>
        </li>
      ))}
    </ol>
  </section>
);

const ROLES = [
  { who: "Human thinks.", text: "You bring the situation, the context and the lived detail no model can see." },
  { who: "AI structures.", text: "The Guide organizes what you share, surfaces patterns and assumptions, and makes uncertainty visible." },
  { who: "Human decides.", text: "Interpretation, values, priorities and decisions stay with you. Nothing changes without your confirmation." },
];

const Roles = () => (
  <section className="relative border-y lwm-line bg-[#0A0F1D]" data-testid="roles-section">
    <div className="mx-auto grid max-w-7xl gap-px px-5 sm:px-8 md:grid-cols-3">
      {ROLES.map((r, i) => (
        <div key={r.who} className="py-14 md:px-8 md:first:pl-0 md:[&:not(:first-child)]:border-l lwm-line" data-testid={`role-${i + 1}`}>
          <p className={`font-serif-ed text-4xl italic sm:text-5xl ${i === 1 ? "text-sky-300" : "text-white"}`}>{r.who}</p>
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-slate-400">{r.text}</p>
        </div>
      ))}
    </div>
  </section>
);

const SystemsVisual = () => (
  <section className="relative mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:py-32">
    <div className="grid items-center gap-12 md:grid-cols-2">
      <div className="relative mx-auto aspect-square w-full max-w-md">
        <img src={IMAGES.focusedSystem} alt="A focused system with a clear boundary" className="lwm-screen h-full w-full rounded-full object-cover" />
      </div>
      <div>
        <p className="lwm-eyebrow">A working picture</p>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Draw a boundary. Look closely inside it. Notice what presses in from outside.</h2>
        <p className="mt-6 max-w-lg text-base leading-relaxed text-slate-400">
          Your system map grows from what you know, what the Guide wonders, and what nobody knows yet. It is always a hypothesis — useful because it can be revised.
        </p>
      </div>
    </div>
  </section>
);

const FinalCta = ({ startHref }) => (
  <section className="relative mx-auto max-w-7xl px-5 pb-28 sm:px-8" data-testid="home-cta">
    <div className="relative overflow-hidden rounded-3xl border lwm-line bg-[#0C1222] px-8 py-16 sm:px-14 sm:py-20">
      <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-violet-500/15 blur-3xl" />
      <div className="absolute -bottom-24 left-1/3 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
      <p className="lwm-eyebrow relative">Begin</p>
      <h2 className="relative mt-4 max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">Bring one complex challenge. Leave with a clearer picture and a small next step.</h2>
      <Button asChild size="lg" className="relative mt-10 rounded-full bg-white px-7 text-slate-900 hover:bg-sky-100" data-testid="cta-start-btn">
        <Link to={startHref}>Start your first analysis <ArrowRight className="ml-2 h-4 w-4" /></Link>
      </Button>
    </div>
  </section>
);

export default function Home() {
  const { user } = useAuth();
  useHashScroll();
  const startHref = user ? "/analysis/new" : "/signup";
  return (
    <div className="relative z-10 min-h-screen">
      <SiteHeader />
      <main>
        <Hero startHref={startHref} />
        <HowItWorks />
        <Roles />
        <section id="method" className="mx-auto max-w-7xl scroll-mt-20 px-5 py-24 sm:px-8 lg:py-32"><MethodList /></section>
        <SystemsVisual />
        <section id="different" className="mx-auto max-w-7xl scroll-mt-20 px-5 py-24 sm:px-8 lg:py-28"><Differences /></section>
        <FinalCta startHref={startHref} />
      </main>
      <SiteFooter />
    </div>
  );
}
