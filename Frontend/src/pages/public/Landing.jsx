import React from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Search, ShieldCheck, Zap, Users, Send } from "lucide-react";
import { usePublicNgos } from "../../hooks/api/usePublic";

const STEPS = [
  {
    icon: Send,
    title: "Submit",
    body: "Describe what happened. No login required, and your report gets a private tracking link.",
  },
  {
    icon: Zap,
    title: "AI Triage",
    body: "Spam screening, duplicate detection, and category/severity classification run automatically.",
  },
  {
    icon: ShieldCheck,
    title: "NGO Response",
    body: "Verified NGOs are matched and dispatched, then volunteers are assigned to the case.",
  },
];

export default function Landing() {
  const { data: ngos } = usePublicNgos();
  const verifiedCount = ngos?.length || 0;
  const resolvedCount = ngos?.reduce((sum, n) => sum + (n.resolvedCasesCount || 0), 0) || 0;
  const avgSla = ngos?.length
    ? Math.round(ngos.reduce((sum, n) => sum + (n.responseSlaMinutes || 60), 0) / ngos.length)
    : null;

  return (
    <div className="flex-1 flex flex-col">
      <section className="px-6 pt-20 pb-16 text-center max-w-3xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mb-5">
          Emergency triage &amp; <span className="gradient-text">coordination</span>, in minutes.
        </h1>
        <p className="text-text-secondary text-base max-w-xl mx-auto mb-8">
          Submit critical relief requests anonymously. AI classification and spam detection route
          validated emergency tickets automatically to verified NGOs and available volunteers.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/report"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold bg-gradient-to-br from-primary to-orange-500 text-white shadow-lg hover:-translate-y-0.5 transition-transform"
          >
            <AlertTriangle size={16} /> Report an Emergency
          </Link>
          <Link
            to="/track"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold bg-white/5 border border-border hover:border-border-hover transition-colors"
          >
            <Search size={16} /> Track a Report
          </Link>
        </div>
      </section>

      <section className="px-6 pb-16 max-w-5xl mx-auto w-full">
        <div className="grid sm:grid-cols-3 gap-5">
          {STEPS.map((s, i) => (
            <div key={s.title} className="glass p-6">
              <div className="h-10 w-10 rounded-xl bg-white/5 border border-border flex items-center justify-center mb-4 text-accent">
                <s.icon size={18} />
              </div>
              <div className="text-xs font-bold text-text-dim mb-1">STEP {i + 1}</div>
              <h3 className="font-semibold text-base mb-1.5">{s.title}</h3>
              <p className="text-sm text-text-secondary leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 pb-24 max-w-5xl mx-auto w-full">
        <div className="glass p-8 grid sm:grid-cols-3 gap-6 text-center">
          <div>
            <div className="font-display text-3xl font-extrabold text-primary">{verifiedCount}</div>
            <div className="text-xs text-text-dim uppercase tracking-wide font-semibold mt-1">
              Verified NGOs
            </div>
          </div>
          <div>
            <div className="font-display text-3xl font-extrabold text-accent">
              {avgSla ? `${avgSla}m` : "—"}
            </div>
            <div className="text-xs text-text-dim uppercase tracking-wide font-semibold mt-1">
              Avg Response SLA
            </div>
          </div>
          <div>
            <div className="font-display text-3xl font-extrabold text-success">{resolvedCount}</div>
            <div className="text-xs text-text-dim uppercase tracking-wide font-semibold mt-1">
              Cases Resolved
            </div>
          </div>
        </div>
        <div className="text-center mt-6">
          <Link to="/ngos" className="inline-flex items-center gap-1.5 text-sm text-accent font-semibold hover:underline">
            <Users size={14} /> Browse the verified NGO network
          </Link>
        </div>
      </section>
    </div>
  );
}
