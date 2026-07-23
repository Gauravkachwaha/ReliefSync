import React from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Search, ShieldCheck, Zap, Users, Send } from "lucide-react";
import { usePublicNgos } from "../../hooks/api/usePublic";

/* Decorative glowing node-network backdrop for the hero (mirrors the brand
   banner's world-map aesthetic). Pure SVG — no assets, no pointer events. */
function NetworkMap() {
  const nodes = [
    { x: 8, y: 30 }, { x: 16, y: 62 }, { x: 24, y: 22 }, { x: 30, y: 48 },
    { x: 42, y: 18 }, { x: 47, y: 70 }, { x: 58, y: 34 }, { x: 66, y: 58 },
    { x: 74, y: 20 }, { x: 82, y: 44 }, { x: 90, y: 66 }, { x: 94, y: 28 },
  ];
  const links = [
    [0, 2], [0, 1], [1, 3], [2, 4], [3, 6], [4, 6], [5, 7], [6, 8],
    [6, 9], [7, 9], [8, 11], [9, 10], [9, 11], [3, 5],
  ];
  return (
    <svg
      aria-hidden="true"
      className="absolute inset-0 h-full w-full pointer-events-none opacity-40"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <defs>
        <radialGradient id="hero-glow" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="hsl(16 58% 60% / 0.10)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>
      <rect width="100" height="100" fill="url(#hero-glow)" />
      {links.map(([a, b], i) => (
        <line
          key={i}
          x1={nodes[a].x} y1={nodes[a].y} x2={nodes[b].x} y2={nodes[b].y}
          stroke="hsl(16 50% 45% / 0.16)"
          strokeWidth="0.15"
        />
      ))}
      {nodes.map((n, i) => (
        <g key={i}>
          <circle cx={n.x} cy={n.y} r="1.4" fill="hsl(16 58% 60% / 0.15)">
            <animate
              attributeName="r"
              values="1.1;2;1.1"
              dur={`${3 + (i % 4)}s`}
              repeatCount="indefinite"
            />
          </circle>
          <circle cx={n.x} cy={n.y} r="0.4" fill="hsl(16 58% 52% / 0.9)" />
        </g>
      ))}
    </svg>
  );
}

const STEPS = [
  {
    icon: Send,
    title: "Tell us what happened",
    body: "Write it in your own words. You'll get a private link to follow your case — no account needed.",
  },
  {
    icon: Zap,
    title: "We sort it instantly",
    body: "Your report is checked, prioritized, and matched to the right kind of help — in seconds, not days.",
  },
  {
    icon: ShieldCheck,
    title: "Real people respond",
    body: "A verified NGO takes your case and trained volunteers head your way.",
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
      <section className="relative overflow-hidden px-6 pt-20 pb-24 text-center">
        {/* Glowing network-map backdrop */}
        <NetworkMap />
        <div className="relative max-w-3xl mx-auto">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.35em] text-accent mb-5">
            Navigate crises · Optimize aid · Recover faster
          </p>
          <h1 className="text-4xl md:text-[3.4rem] font-medium mb-6">
            Help arrives faster when{" "}
            <span className="text-accent italic">someone speaks up</span>.
          </h1>
          <p className="text-text-secondary text-base max-w-xl mx-auto mb-9 leading-relaxed">
            Report an emergency in your own words — no account, no forms to figure out.
            We check it, find the right verified NGO nearby, and get real people moving.
          </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/report"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-pill font-semibold bg-primary text-white shadow-sm hover:bg-primary-600 hover:-translate-y-0.5 hover:shadow-md transition-all"
          >
            <AlertTriangle size={16} /> Report an Emergency
          </Link>
          <Link
            to="/track"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-pill font-semibold text-text bg-surface border border-border hover:border-border-hover transition-colors"
          >
            <Search size={16} /> Track a Report
          </Link>
          </div>
        </div>
      </section>

      <section className="px-6 pb-16 max-w-5xl mx-auto w-full">
        <div className="grid sm:grid-cols-3 gap-5">
          {STEPS.map((s, i) => (
            <div key={s.title} className="glass p-6">
              <div className="h-10 w-10 rounded-xl bg-black/5 border border-border flex items-center justify-center mb-4 text-accent">
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
            <div className="font-display text-3xl font-semibold text-text">{verifiedCount}</div>
            <div className="text-xs text-text-dim uppercase tracking-wide font-semibold mt-1">
              Verified NGOs
            </div>
          </div>
          <div>
            <div className="font-display text-3xl font-semibold text-text">
              {avgSla ? `${avgSla}m` : "—"}
            </div>
            <div className="text-xs text-text-dim uppercase tracking-wide font-semibold mt-1">
              Avg Response Time
            </div>
          </div>
          <div>
            <div className="font-display text-3xl font-semibold text-text">{resolvedCount}</div>
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
