import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowRight,
  Database,
  FilePlus2,
  GitPullRequestArrow,
  ScrollText,
  ShieldCheck,
  Workflow,
} from "lucide-react";
import { Link } from "react-router";
import {
  ReleaseStatusBadge,
  SectorBadge,
  SeverityBadge,
} from "@/components/proofrail/StatusBadge";
import { cn } from "@/lib/utils";

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  iconClass,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  hint: string;
  iconClass: string;
}) {
  return (
    <div className="glass-panel flex items-start gap-4 p-5">
      <span
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-white/10",
          iconClass,
        )}
      >
        <Icon className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="text-2xl font-bold leading-none tracking-tight">{value}</p>
        <p className="mt-1.5 text-[13px] font-medium">{label}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>
      </div>
    </div>
  );
}

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const days = Math.floor(diff / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default function Overview() {
  const { user } = useAuth();
  const data = useQuery(api.optimized.overview);

  if (data === undefined) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  const firstName = (user?.name || user?.email || "Reviewer").split(/[\s@]/)[0];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[13px] font-medium text-muted-foreground">
            Release assurance workspace
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            Welcome back{firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
            Every release you ship is tested against the policies your compliance
            owners wrote — and the record is kept.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button asChild variant="outline" className="cursor-pointer rounded-full">
            <Link to="/dashboard/scenarios">
              <FilePlus2 className="size-4" />
              Import trace
            </Link>
          </Button>
          <Button asChild className="cursor-pointer rounded-full">
            <Link to="/dashboard/releases">
              <GitPullRequestArrow className="size-4" />
              Create release
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Workflow}
          label="Workflows under governance"
          value={data.activeWorkflowCount}
          hint={`${data.workflowCount} total · ${data.workflowCount - data.activeWorkflowCount} paused`}
          iconClass="bg-blue-500/10 text-blue-300"
        />
        <StatCard
          icon={ScrollText}
          label="Scenarios in acceptance suite"
          value={data.activeScenarioCount}
          hint={`${data.draftScenarioCount} drafts awaiting review`}
          iconClass="bg-emerald-500/10 text-emerald-300"
        />
        <StatCard
          icon={ShieldCheck}
          label="Active policy statements"
          value={data.activePolicyCount}
          hint={`${data.policyCount} total in the workspace`}
          iconClass="bg-violet-500/10 text-violet-300"
        />
        <StatCard
          icon={Database}
          label="Production traces captured"
          value={data.traceCount}
          hint="Redacted on import"
          iconClass="bg-cyan-500/10 text-cyan-300"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Release gates */}
          <section className="glass-panel p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[15px] font-semibold tracking-tight">
                  Release gates
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Latest candidate per workflow, compared to its approved baseline
                </p>
              </div>
              <Button asChild variant="ghost" size="sm" className="cursor-pointer rounded-full">
                <Link to="/dashboard/releases">
                  All releases
                  <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </div>

            <div className="mt-4 space-y-3">
              {data.workflows.length === 0 && (
                <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  No workflows yet — the workspace seeds itself on first visit.
                </p>
              )}
              {data.workflows.map((wf) => {
                const rel = wf.latestRelease;
                return (
                  <div
                    key={wf._id}
                    className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[13.5px] font-semibold tracking-tight">
                          {wf.name}
                        </p>
                        <SectorBadge sector={wf.sector} />
                      </div>
                      <p className="mt-1 text-[11.5px] text-muted-foreground">
                        <span className="font-mono">{wf.agent}</span> · {wf.traceSource} ·{" "}
                        {wf.activeScenarioCount} scenarios in suite ·{" "}
                        {wf.policyCount} policies
                      </p>
                    </div>
                    {rel ? (
                      <div className="flex shrink-0 items-center gap-3">
                        <div className="text-right">
                          <p className="font-mono text-[12px] font-semibold">{rel.version}</p>
                          <p className="text-[10.5px] text-muted-foreground">
                            vs {rel.baselineVersion} · {timeAgo(rel.createdAt)}
                          </p>
                        </div>
                        <ReleaseStatusBadge status={rel.status} />
                      </div>
                    ) : (
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        No release yet
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Recent traces */}
          <section className="glass-panel p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[15px] font-semibold tracking-tight">
                  Recently captured traces
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Imported from observability systems, redacted, ready to convert
                </p>
              </div>
              <Button asChild variant="ghost" size="sm" className="cursor-pointer rounded-full">
                <Link to="/dashboard/scenarios">
                  Scenarios
                  <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </div>
            <div className="mt-4 space-y-2.5">
              {data.recentTraces.map((t) => (
                <div
                  key={t._id}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-300">
                    <Database className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-medium">{t.title}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {t.workflowName} · <span className="font-mono">{t.source}</span> · {timeAgo(t.capturedAt)}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[10.5px] font-medium text-muted-foreground">
                    {t.redactedFields} fields redacted
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Needs review queue */}
          <section className="glass-panel p-5 sm:p-6">
            <h2 className="text-[15px] font-semibold tracking-tight">
              Needs review
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Model graders disagreed on these; a human decides
            </p>
            <div className="mt-4 space-y-2.5">
              {data.needsReview.length === 0 && (
                <p className="rounded-xl border border-dashed border-border p-5 text-center text-[12.5px] text-muted-foreground">
                  No open reviews — the queue is clear.
                </p>
              )}
              {data.needsReview.map((item) => (
                <div
                  key={item.testRunId}
                  className="rounded-xl border border-amber-400/25 bg-amber-400/10 p-3.5 ring-1 ring-amber-400/15"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[12.5px] font-semibold leading-snug tracking-tight">
                      {item.scenarioTitle}
                    </p>
                    <SeverityBadge severity={item.severity} />
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {item.workflowName} · {item.releaseVersion}
                  </p>
                  <Button
                    asChild
                    size="sm"
                    className="mt-2.5 h-7 cursor-pointer rounded-full px-3 text-[11.5px]"
                  >
                    <Link to={`/dashboard/releases/${item.releaseId}`}>
                      Resolve review
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          </section>

          {/* Policy coverage */}
          <section className="glass-panel p-5 sm:p-6">
            <h2 className="text-[15px] font-semibold tracking-tight">
              Policy coverage
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Active policies mapped to acceptance-suite tests
            </p>
            <div className="mt-4">
              <div className="flex items-baseline justify-between">
                <p className="text-2xl font-bold tracking-tight">
                  {data.policyCount > 0
                    ? Math.round((data.activeScenarioCount / (data.policyCount * 2)) * 100)
                    : 0}
                  %
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {data.activePolicyCount} policies ·{" "}
                  {data.activeScenarioCount} active tests
                </p>
              </div>
              <Progress
                value={
                  data.policyCount > 0
                    ? Math.min(
                        100,
                        Math.round(
                          (data.activeScenarioCount / (data.policyCount * 2)) * 100,
                        ),
                      )
                    : 0
                }
                className="mt-2 h-2 bg-cyan-400/10"
              />
            </div>
            <p className="mt-4 border-t border-white/10 pt-3 text-[11.5px] leading-relaxed text-muted-foreground">
              Every policy must map to at least one test, an owner, and an evidence
              source before a release can pass the gate.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
