import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import mark from "@/assets/proofrail-mark.svg";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  ClipboardCheck,
  FileLock2,
  Gauge,
  GitPullRequestArrow,
  Layers,
  Lock,
  Play,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Terminal,
  Workflow,
} from "lucide-react";
import { Link } from "react-router";

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: 0.08 * i, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

function Navbar() {
  const { isAuthenticated, isLoading } = useAuth();
  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4">
      <nav className="glass-chip mx-auto flex h-14 max-w-6xl items-center justify-between rounded-full px-4 pl-5 sm:px-5">
        <Link to="/" className="flex items-center gap-2.5">
          <img src={mark} alt="Proofrail" width={28} height={28} className="rounded-lg" />
          <span className="text-[15px] font-bold tracking-tight">
            Proofrail
          </span>
        </Link>
        <div className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex">
          <a href="#product" className="transition-colors hover:text-foreground">
            Product
          </a>
          <a href="#how" className="transition-colors hover:text-foreground">
            How it works
          </a>
          <a href="#sectors" className="transition-colors hover:text-foreground">
            Sectors
          </a>
          <a href="#pricing" className="transition-colors hover:text-foreground">
            Pricing
          </a>
        </div>
        <div className="flex items-center gap-2">
          {!isLoading && isAuthenticated ? (
            <Button asChild size="sm" className="cursor-pointer rounded-full">
              <Link to="/dashboard">
                Open dashboard
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="cursor-pointer rounded-full">
                <Link to="/auth">Sign in</Link>
              </Button>
              <Button asChild size="sm" className="cursor-pointer rounded-full">
                <Link to="/auth?returnTo=%2Fdashboard">Start free</Link>
              </Button>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}

function HeroVisual() {
  return (
    <div className="relative mx-auto mt-14 max-w-4xl px-4">
      {/* Ambient glow behind the panel */}
      <div className="absolute inset-x-8 top-8 -z-10 h-64 rounded-full bg-cyan-500/15 blur-3xl" />
      <div className="absolute inset-x-24 top-20 -z-10 h-48 rounded-full bg-violet-600/10 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 26, rotateX: 6 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 0.8, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="glass-panel overflow-hidden p-5 text-left sm:p-6"
      >
        {/* Window header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex size-7 items-center justify-center rounded-md bg-cyan-500/10 text-cyan-300">
              <Terminal className="size-4" />
            </span>
            <div>
              <p className="text-[13px] font-semibold tracking-tight">
                Contract Review Assistant
              </p>
              <p className="font-mono text-[11px] text-muted-foreground">
                claude-sonnet-4-5 · otlp:8f21c3a9
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden rounded-full border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-[11px] font-medium text-muted-foreground sm:block">
              baseline v2.3.0
            </span>
            <span className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-2.5 py-1 font-mono text-[11px] font-semibold text-cyan-300">
              candidate v2.4.0
            </span>
          </div>
        </div>

        {/* Scenario rows */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2.5">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-300">
                <Check className="size-3.5" />
              </span>
              <p className="truncate text-[12.5px] font-medium">
                Auto-executed renewal over spend cap
              </p>
            </div>
            <div className="ml-3 flex shrink-0 items-center gap-1.5">
              <Badge variant="outline" className="border-transparent bg-blue-500/10 font-mono text-[10px] font-semibold text-blue-300">
                DET · pass
              </Badge>
              <Badge variant="outline" className="hidden border-transparent bg-violet-500/10 font-mono text-[10px] font-semibold text-violet-300 sm:inline-flex">
                MODEL · 91
              </Badge>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2.5">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-300">
                <Check className="size-3.5" />
              </span>
              <p className="truncate text-[12.5px] font-medium">
                NDA redline preserved confidentiality
              </p>
            </div>
            <div className="ml-3 flex shrink-0 items-center gap-1.5">
              <Badge variant="outline" className="border-transparent bg-blue-500/10 font-mono text-[10px] font-semibold text-blue-300">
                DET · pass
              </Badge>
              <Badge variant="outline" className="hidden border-transparent bg-violet-500/10 font-mono text-[10px] font-semibold text-violet-300 sm:inline-flex">
                MODEL · 89
              </Badge>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-rose-400/25 bg-rose-500/10 px-3 py-2.5 ring-1 ring-rose-400/20">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-rose-500/10 text-rose-300">
                <GitPullRequestArrow className="size-3.5" />
              </span>
              <p className="truncate text-[12.5px] font-medium">
                Term sheet pushed before approval
              </p>
            </div>
            <div className="ml-3 flex shrink-0 items-center gap-1.5">
              <Badge variant="outline" className="border-transparent bg-rose-500/10 font-mono text-[10px] font-semibold text-rose-300">
                DET · fail
              </Badge>
              <Badge variant="outline" className="hidden border-transparent bg-amber-500/10 font-mono text-[10px] font-semibold text-amber-300 sm:inline-flex">
                MODEL · review
              </Badge>
            </div>
          </div>
        </div>

        {/* Gate */}
        <div className="mt-4 flex flex-col items-stretch justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center">
          <div>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              release_gate
            </p>
            <p className="mt-0.5 text-[13.5px] font-semibold tracking-tight text-rose-300">
              Blocked — 1 critical regression, 1 review pending
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="glass-chip flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-medium text-muted-foreground">
              <Lock className="size-3.5 text-cyan-300" />
              Evidence packet ready
            </span>
            <Button size="sm" className="cursor-pointer rounded-full">
              Review gate
              <ArrowRight className="size-3.5" />
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Floating chips */}
      <motion.div
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.9, duration: 0.6 }}
        className="glass-chip absolute -left-2 top-24 hidden items-center gap-2 rounded-2xl px-3.5 py-2.5 lg:flex"
      >
        <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-300">
          <ClipboardCheck className="size-4" />
        </span>
        <div>
          <p className="text-[11.5px] font-semibold">Suite passed on baseline</p>
          <p className="font-mono text-[10.5px] text-muted-foreground">v2.3.0 · 12/12 checks</p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.05, duration: 0.6 }}
        className="glass-chip absolute -right-2 bottom-20 hidden items-center gap-2 rounded-2xl px-3.5 py-2.5 lg:flex"
      >
        <span className="flex size-7 items-center justify-center rounded-lg bg-violet-500/10 text-violet-300">
          <Sparkles className="size-4" />
        </span>
        <div>
          <p className="text-[11.5px] font-semibold">Policy coverage 94%</p>
          <p className="font-mono text-[10.5px] text-muted-foreground">12 of 13 policies mapped</p>
        </div>
      </motion.div>
    </div>
  );
}

const features = [
  {
    icon: ScrollText,
    title: "Trace-to-scenario capture",
    body: "Import production traces from OpenTelemetry or your observability stack, redact sensitive fields, and convert each run into a reusable regression scenario. Pick the risky decision — don't reconstruct the whole session.",
  },
  {
    icon: ShieldCheck,
    title: "Policy workspace",
    body: "Compliance owners write required, forbidden, and approval-gated behaviors in plain language. Every policy maps to tests, an owner, and the evidence source it was derived from.",
  },
  {
    icon: Gauge,
    title: "Mixed evaluation",
    body: "Deterministic checks for tool and data rules, model graders for bounded semantic criteria, and assigned human review for ambiguous cases. Disagreement is surfaced, never collapsed into one score.",
  },
  {
    icon: FileLock2,
    title: "Release gate & evidence packet",
    body: "Compare a candidate release against the approved baseline, block on critical regressions, and export a signed record of scenarios, results, reviewers, and exceptions.",
  },
];

function Features() {
  return (
    <section id="product" className="relative mx-auto max-w-6xl px-4 pt-28 sm:pt-36">
      <div className="mx-auto max-w-2xl text-center">
        <Badge variant="outline" className="glass-chip rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-cyan-300">
          The product
        </Badge>
        <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
          The wedge is not prompt management.
          <br />
          <span className="text-gradient-cool">It's policy-to-test translation.</span>
        </h2>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          A single response score can't govern an agent that retrieves, calls tools,
          and acts. Proofrail treats a trace as a testable sequence and turns your
          documented rules into a versioned acceptance suite.
        </p>
      </div>

      <div className="mt-14 grid gap-5 sm:grid-cols-2">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            custom={i}
            viewport={{ once: true, margin: "-60px" }}
            className="glass-panel group p-6"
          >
            <span className="flex size-11 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-300 ring-1 ring-cyan-400/15 transition-transform duration-300 group-hover:-translate-y-0.5">
              <f.icon className="size-5" />
            </span>
            <h3 className="mt-4 text-lg font-semibold tracking-tight">{f.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      icon: Play,
      step: "01",
      title: "Import a trace",
      body: "Connect OpenTelemetry or paste a production run. Sensitive fields are redacted in the browser and the sequence becomes a draft regression scenario.",
    },
    {
      icon: ShieldCheck,
      step: "02",
      title: "Owners write policy",
      body: "Compliance owners state required and forbidden behavior in plain language, then map each policy to tests and an evidence source.",
    },
    {
      icon: GitPullRequestArrow,
      step: "03",
      title: "Gate every release",
      body: "The suite runs deterministic, model, and human checks against the baseline. Critical regressions block the release; everything is retained as evidence.",
    },
  ];
  return (
    <section id="how" className="relative mx-auto max-w-6xl px-4 pt-28 sm:pt-36">
      <div className="mx-auto max-w-2xl text-center">
        <Badge variant="outline" className="glass-chip rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-cyan-300">
          How it works
        </Badge>
        <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
          From production incident to release gate
        </h2>
        <p className="mt-4 text-base text-muted-foreground">
          A team connects a production workflow in about a day, converts real traces
          into reviewed tests, and ships an evidence packet their compliance owner
          accepts.
        </p>
      </div>

      <div className="mt-14 grid gap-5 md:grid-cols-3">
        {steps.map((s, i) => (
          <motion.div
            key={s.step}
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            custom={i}
            viewport={{ once: true, margin: "-60px" }}
            className="glass-panel-soft relative p-6"
          >
            <span className="absolute right-5 top-4 font-mono text-3xl font-bold text-white/10">
              {s.step}
            </span>
            <span className="flex size-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-300">
              <s.icon className="size-5" />
            </span>
            <h3 className="mt-4 text-[16px] font-semibold tracking-tight">{s.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function Sectors() {
  const sectors = [
    {
      name: "Legal technology",
      example: "“Renewal executed above the spend cap without approval”",
      stat: "Contract Review Assistant",
    },
    {
      name: "Healthcare administration",
      example: "“Medication interaction prefilled without pharmacist flag”",
      stat: "Patient Intake Assistant",
    },
    {
      name: "Financial operations",
      example: "“Fraud-flagged claim auto-disbursed before adjuster review”",
      stat: "Claims Triage Agent",
    },
    {
      name: "Enterprise support",
      example: "“Refund above threshold promised in an unapproved reply”",
      stat: "Support Deflection Copilot",
    },
  ];
  return (
    <section id="sectors" className="relative mx-auto max-w-6xl px-4 pt-28 sm:pt-36">
      <div className="mx-auto max-w-2xl text-center">
        <Badge variant="outline" className="glass-chip rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-cyan-300">
          Built for regulated teams
        </Badge>
        <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
          One agent in production is enough to start
        </h2>
        <p className="mt-4 text-base text-muted-foreground">
          Proofrail sells to software companies whose agents make or recommend
          consequential actions — and whose compliance owner needs to prove how
          releases were tested.
        </p>
      </div>

      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {sectors.map((s, i) => (
          <motion.div
            key={s.name}
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            custom={i}
            viewport={{ once: true, margin: "-60px" }}
            className="glass-panel-soft flex flex-col justify-between gap-4 p-5"
          >
            <div>
              <p className="text-[13px] font-semibold tracking-tight">{s.name}</p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {s.example}
              </p>
            </div>
            <p className="border-t border-white/10 pt-3 text-[11px] font-medium text-cyan-300">
              {s.stat}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section id="pricing" className="relative mx-auto max-w-6xl px-4 pt-28 sm:pt-36">
      <div className="mx-auto max-w-2xl text-center">
        <Badge variant="outline" className="glass-chip rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-cyan-300">
          Pricing
        </Badge>
        <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
          Engineers start free. Compliance buys the pilot.
        </h2>
        <p className="mt-4 text-base text-muted-foreground">
          Self-serve for engineering teams on one workflow — no card, no
          procurement. When your compliance owner needs an evidence packet, the
          paid pilot ships a live release gate tied to your own policies.
          Checkout completes inside your workspace.
        </p>
      </div>

      <div className="mx-auto mt-12 grid max-w-5xl gap-5 md:grid-cols-3">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          custom={0}
          viewport={{ once: true }}
          className="glass-panel p-6"
        >
          <p className="text-[13px] font-semibold uppercase tracking-widest text-muted-foreground">
            Free engineering tier
          </p>
          <p className="mt-3 text-4xl font-bold tracking-tight">$0</p>
          <p className="mt-1 text-sm text-muted-foreground">
            one workflow · up to 3 engineers
          </p>
          <ul className="mt-5 space-y-2.5 text-sm">
            {[
              "Trace import with in-browser PII redaction",
              "Full release gate on one workflow",
              "Regulation-tagged control library",
              "No card, no procurement cycle",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <Check className="mt-0.5 size-4 shrink-0 text-emerald-300" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <Button asChild className="mt-6 w-full cursor-pointer rounded-full">
            <Link to="/auth?returnTo=%2Fdashboard">
              Start free
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </motion.div>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          custom={1}
          viewport={{ once: true }}
          className="glass-panel relative p-6"
        >
          <Badge className="absolute -top-3 right-6 rounded-full bg-cyan-400 text-cyan-950">
            Recommended
          </Badge>
          <p className="text-[13px] font-semibold uppercase tracking-widest text-muted-foreground">
            Implementation pilot
          </p>
          <p className="mt-3 text-4xl font-bold tracking-tight">
            $15,000
          </p>
          <p className="mt-1 text-sm text-muted-foreground">six weeks, one workflow</p>
          <ul className="mt-5 space-y-2.5 text-sm">
            {[
              "Trace import connected on day one",
              "20+ real traces converted to reviewed tests",
              "Suite run against two releases",
              "Evidence packet accepted by your compliance owner",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <Check className="mt-0.5 size-4 shrink-0 text-emerald-300" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <Button asChild className="mt-6 w-full cursor-pointer rounded-full">
            <Link to="/auth?returnTo=%2Fdashboard%2Fadmin">
              Start checkout
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </motion.div>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          custom={2}
          viewport={{ once: true }}
          className="glass-panel relative p-6"
        >
          <Badge className="absolute -top-3 right-6 rounded-full bg-cyan-400 text-cyan-950">
            After pilot
          </Badge>
          <p className="text-[13px] font-semibold uppercase tracking-widest text-muted-foreground">
            Annual contract
          </p>
          <p className="mt-3 text-4xl font-bold tracking-tight">
            $36,000<span className="text-base font-medium text-muted-foreground">/yr</span>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            one production workflow; usage &amp; support above that
          </p>
          <ul className="mt-5 space-y-2.5 text-sm">
            {[
              "Versioned acceptance suite in CI",
              "Incident-to-test conversion service",
              "Sector-specific control library",
              "SSO, RBAC, and private deployment",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <Check className="mt-0.5 size-4 shrink-0 text-emerald-300" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <Button asChild variant="outline" className="mt-6 w-full cursor-pointer rounded-full">
            <Link to="/auth?returnTo=%2Fdashboard%2Fadmin">
              Talk to us
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </motion.div>
      </div>

      <p className="mx-auto mt-6 max-w-xl text-center text-xs leading-relaxed text-muted-foreground">
        Free tools like Langfuse and existing CI scripts cover trace and test
        plumbing. The paid value is fewer manual reviews, faster approvals, and an
        auditable release record.
      </p>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="relative mx-auto max-w-6xl px-4 pt-28 sm:pt-36">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
        className="glass-panel relative overflow-hidden p-10 text-center sm:p-16"
      >
        <div className="pointer-events-none absolute inset-0 bg-blueprint opacity-60" />
        <div className="relative">
          <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-300 ring-1 ring-cyan-400/15">
            <Layers className="size-7" />
          </span>
          <h2 className="mx-auto mt-6 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
            Your next incident should become a gate — not a post-mortem
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">
            Proofrail converts production traces and policy requirements into a
            versioned acceptance suite, then blocks releases when an agent violates
            a documented rule or regresses on a high-risk task.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="w-full cursor-pointer rounded-full sm:w-auto">
              <Link to="/auth?returnTo=%2Fdashboard">
                Start free — gate your first agent
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-full cursor-pointer rounded-full sm:w-auto">
              <Link to="/auth?returnTo=%2Fdashboard">Open the workspace</Link>
            </Button>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="mx-auto mt-24 max-w-6xl px-4 pb-10">
      <div className="flex flex-col items-center justify-between gap-6 border-t border-white/10 pt-8 sm:flex-row">
        <div className="flex items-center gap-2.5">
          <img src={mark} alt="Proofrail" width={26} height={26} className="rounded-md" />
          <span className="text-sm font-bold tracking-tight">Proofrail</span>
          <span className="text-xs text-muted-foreground">
            Release assurance for regulated AI
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
          <a href="#product" className="hover:text-foreground">Product</a>
          <a href="#how" className="hover:text-foreground">How it works</a>
          <a href="#sectors" className="hover:text-foreground">Sectors</a>
          <a href="#pricing" className="hover:text-foreground">Pricing</a>
          <span className="flex items-center gap-1.5">
            <Lock className="size-3" /> SOC 2 · SSO · Private deployment
          </span>
        </div>
      </div>
      <p className="mt-6 text-center text-[11px] text-muted-foreground/70">
        Proofrail works across model vendors and trace sources. Your telemetry and
        test exports stay under your control.
      </p>
    </footer>
  );
}

export default function Landing() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="relative min-h-screen overflow-x-clip"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[52rem] bg-blueprint" />

      <Navbar />

      <main className="pt-28 sm:pt-32">
        {/* Hero */}
        <section className="relative mx-auto max-w-6xl px-4 text-center">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={0}
            className="glass-chip mx-auto inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[12px] font-medium text-muted-foreground"
          >
            <span className="flex size-5 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-300">
              <ShieldCheck className="size-3" />
            </span>
            Release assurance for regulated teams deploying AI agents
          </motion.div>

          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={1}
            className="mx-auto mt-6 max-w-4xl text-4xl font-bold leading-[1.06] tracking-tight sm:text-6xl"
          >
            Ship agents with{" "}
            <span className="text-gradient-cool">proof</span>, not promises
          </motion.h1>

          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={2}
            className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg"
          >
            Proofrail turns production traces and policy requirements into a
            versioned acceptance suite, then blocks releases when an agent violates
            a documented rule or regresses on a high-risk task.
          </motion.p>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={3}
            className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <Button asChild size="lg" className="w-full cursor-pointer rounded-full sm:w-auto">
              <Link to="/auth?returnTo=%2Fdashboard">
                Start free — gate your first agent
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-full cursor-pointer rounded-full sm:w-auto">
              <a href="#product">
                <Play className="size-4" />
                See the release gate
              </a>
            </Button>
          </motion.div>

          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={4}
            className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs font-medium text-muted-foreground"
          >
            <span className="flex items-center gap-1.5">
              <Layers className="size-3.5 text-cyan-300" /> Ingests from OpenTelemetry, Langfuse &amp; Braintrust
            </span>
            <span className="flex items-center gap-1.5">
              <Lock className="size-3.5 text-cyan-300" /> Model-agnostic · neutral audit record
            </span>
          </motion.p>
        </section>

        <HeroVisual />
        <Features />
        <HowItWorks />
        <Sectors />
        <Pricing />
        <FinalCta />
      </main>

      <Footer />
    </motion.div>
  );
}
