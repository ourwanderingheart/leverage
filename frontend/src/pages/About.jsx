import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { MethodList } from "@/components/site/MethodList";
import { Differences } from "@/components/site/Differences";
import { Button } from "@/components/ui/button";
import { IMAGES } from "@/lib/brand";
import { useAuth } from "@/context/AuthContext";

const Philosophy = () => (
  <section className="relative border-y lwm-line bg-[#0A0F1D]" data-testid="about-philosophy">
    <div className="mx-auto grid max-w-7xl gap-14 px-5 py-24 sm:px-8 lg:grid-cols-[1.1fr_1fr] lg:py-32">
      <div>
        <p className="lwm-eyebrow">Our philosophy</p>
        <p className="mt-8 font-serif-ed text-5xl leading-[1.05] text-white sm:text-6xl lg:text-7xl" data-testid="philosophy-statement">
          Human thinks.<br /><span className="italic text-sky-300">AI structures.</span><br />Human decides.
        </p>
      </div>
      <div className="space-y-6 self-end text-base leading-relaxed text-slate-300">
        <p>AI is good at organizing information. It can surface patterns, point at assumptions, suggest relationships worth checking, and make the edges of what we know easier to see.</p>
        <p>But interpretation, values, priorities and decisions belong to you. You know the people, the history and the stakes. So the Guide proposes; you confirm. Its hypotheses are labelled as hypotheses. Gaps are named as gaps.</p>
        <blockquote className="border-l-2 border-cyan-400/60 pl-5 font-serif-ed text-2xl italic leading-snug text-white" data-testid="philosophy-quote">
          “The goal is not to remove uncertainty. It is to make uncertainty easier to reason with.”
        </blockquote>
      </div>
    </div>
  </section>
);

export default function About() {
  const { user } = useAuth();
  return (
    <div className="relative z-10 min-h-screen">
      <SiteHeader />
      <main>
        <section className="relative overflow-hidden" data-testid="about-hero">
          <img src={IMAGES.emergingPath} alt="An emerging path" className="lwm-screen absolute inset-0 h-full w-full object-cover object-right opacity-70" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#070A14] via-[#070A14]/80 to-[#070A14]/20" />
          <div className="relative mx-auto max-w-7xl px-5 py-28 sm:px-8 lg:py-36">
            <p className="lwm-eyebrow lwm-rise">About</p>
            <h1 className="lwm-rise lwm-d1 mt-6 max-w-3xl text-4xl font-semibold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl">Complex problems deserve slower, clearer thinking.</h1>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-10 px-5 py-24 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:py-32" data-testid="about-why">
          <div>
            <p className="lwm-eyebrow">Why it exists</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white">Fast answers rarely fit tangled situations.</h2>
          </div>
          <div className="max-w-2xl space-y-6 text-base leading-relaxed text-slate-300 sm:text-lg">
            <p>Most of the challenges that matter — a team that keeps stalling, a service people quietly stop using, a change that never quite lands — are not puzzles with one answer. They are systems: people, incentives, habits and history pulling on each other over time.</p>
            <p>AI tools are increasingly eager to hand out answers. That can feel helpful, and it can also flatten a complex situation into false certainty. Leverage What Matters exists to do the opposite: to help you see more of the system, notice your own assumptions, and find small places where change may genuinely have influence.</p>
          </div>
        </section>

        <Philosophy />

        <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:py-32"><MethodList /></section>
        <section className="mx-auto max-w-7xl px-5 pb-24 sm:px-8"><Differences /></section>

        <section className="mx-auto max-w-7xl px-5 pb-28 sm:px-8">
          <div className="flex flex-col items-start justify-between gap-6 border-t lwm-line pt-12 md:flex-row md:items-center">
            <p className="font-serif-ed text-3xl italic text-white">See the system. Find what matters.</p>
            <Button asChild size="lg" className="rounded-full bg-blue-500 px-7 hover:bg-blue-400" data-testid="about-cta-btn">
              <Link to={user ? "/analysis/new" : "/signup"}>Start thinking <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
