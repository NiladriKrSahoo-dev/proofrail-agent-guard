import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Tone = "emerald" | "rose" | "amber" | "sky" | "violet" | "slate" | "blue";

const toneClass: Record<Tone, string> = {
  emerald: "bg-emerald-500/10 text-emerald-300 border-transparent",
  rose: "bg-rose-500/10 text-rose-300 border-transparent",
  amber: "bg-amber-500/10 text-amber-300 border-transparent",
  sky: "bg-sky-500/10 text-sky-300 border-transparent",
  violet: "bg-violet-500/10 text-violet-300 border-transparent",
  slate: "bg-slate-500/10 text-slate-300 border-transparent",
  blue: "bg-blue-500/10 text-blue-300 border-transparent",
};

export function StatusBadge({
  tone,
  children,
  className,
}: {
  tone: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        toneClass[tone],
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-1px_0_rgba(0,0,0,0.15)]",
        className
      )}
    >
      {children}
    </Badge>
  );
}

const scenarioStatus: Record<string, { label: string; tone: Tone }> = {
  draft: { label: "Draft", tone: "slate" },
  reviewed: { label: "Reviewed", tone: "sky" },
  active: { label: "In acceptance suite", tone: "emerald" },
  archived: { label: "Archived", tone: "slate" },
};

export function ScenarioStatusBadge({ status }: { status: string }) {
  const s = scenarioStatus[status] ?? { label: status, tone: "slate" as Tone };
  return <StatusBadge tone={s.tone}>{s.label}</StatusBadge>;
}

const severityConfig: Record<string, { label: string; tone: Tone }> = {
  critical: { label: "Critical", tone: "rose" },
  high: { label: "High", tone: "amber" },
  medium: { label: "Medium", tone: "sky" },
  low: { label: "Low", tone: "slate" },
};

export function SeverityBadge({ severity }: { severity: string }) {
  const s = severityConfig[severity] ?? { label: severity, tone: "slate" as Tone };
  return <StatusBadge tone={s.tone}>{s.label}</StatusBadge>;
}

const policyBehavior: Record<string, { label: string; tone: Tone }> = {
  required: { label: "Required", tone: "blue" },
  forbidden: { label: "Forbidden", tone: "rose" },
  "approval-gated": { label: "Approval-gated", tone: "violet" },
};

export function PolicyBehaviorBadge({ behavior }: { behavior: string }) {
  const b = policyBehavior[behavior] ?? { label: behavior, tone: "slate" as Tone };
  return <StatusBadge tone={b.tone}>{b.label}</StatusBadge>;
}

const releaseStatus: Record<string, { label: string; tone: Tone }> = {
  approved: { label: "Approved", tone: "emerald" },
  blocked: { label: "Blocked", tone: "rose" },
  pending: { label: "Awaiting review", tone: "amber" },
  running: { label: "Running suite", tone: "sky" },
  "approved-with-exceptions": { label: "Approved w/ exceptions", tone: "violet" },
};

export function ReleaseStatusBadge({ status }: { status: string }) {
  const s = releaseStatus[status] ?? { label: status, tone: "slate" as Tone };
  return <StatusBadge tone={s.tone}>{s.label}</StatusBadge>;
}

const evaluatorConfig: Record<string, { label: string; tone: Tone }> = {
  deterministic: { label: "Deterministic", tone: "blue" },
  model: { label: "Model grader", tone: "violet" },
  human: { label: "Human review", tone: "amber" },
};

export function EvaluatorBadge({ evaluator }: { evaluator: string }) {
  const e = evaluatorConfig[evaluator] ?? { label: evaluator, tone: "slate" as Tone };
  return <StatusBadge tone={e.tone}>{e.label}</StatusBadge>;
}

const resultConfig: Record<string, { label: string; tone: Tone }> = {
  pass: { label: "Pass", tone: "emerald" },
  fail: { label: "Fail", tone: "rose" },
  "needs-review": { label: "Needs review", tone: "amber" },
  pending: { label: "Pending", tone: "slate" },
};

export function ResultBadge({ result }: { result: string }) {
  const r = resultConfig[result] ?? { label: result, tone: "slate" as Tone };
  return <StatusBadge tone={r.tone}>{r.label}</StatusBadge>;
}

const sectorConfig: Record<string, { label: string; tone: Tone }> = {
  legal: { label: "Legal tech", tone: "violet" },
  healthcare: { label: "Healthcare", tone: "sky" },
  finops: { label: "FinOps", tone: "blue" },
  support: { label: "Enterprise support", tone: "slate" },
};

export function SectorBadge({ sector }: { sector: string }) {
  const s = sectorConfig[sector] ?? { label: sector, tone: "slate" as Tone };
  return <StatusBadge tone={s.tone}>{s.label}</StatusBadge>;
}

const teamRoleConfig: Record<string, { label: string; tone: Tone }> = {
  admin: { label: "Admin", tone: "violet" },
  compliance: { label: "Compliance", tone: "sky" },
  engineer: { label: "Engineer", tone: "blue" },
  auditor: { label: "Auditor", tone: "amber" },
};

export function TeamRoleBadge({ role }: { role: string }) {
  const r = teamRoleConfig[role] ?? { label: role, tone: "slate" as Tone };
  return <StatusBadge tone={r.tone}>{r.label}</StatusBadge>;
}

const regulationConfig: Record<string, { label: string; tone: Tone }> = {
  hipaa: { label: "HIPAA", tone: "sky" },
  finra: { label: "FINRA", tone: "amber" },
  soc2: { label: "SOC 2", tone: "blue" },
  gdpr: { label: "GDPR", tone: "violet" },
  pci: { label: "PCI DSS", tone: "rose" },
};

export function RegulationBadge({ regulation }: { regulation: string }) {
  const r = regulationConfig[regulation] ?? {
    label: regulation,
    tone: "slate" as Tone,
  };
  return <StatusBadge tone={r.tone}>{r.label}</StatusBadge>;
}
