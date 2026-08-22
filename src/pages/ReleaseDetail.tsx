import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarClock,
  CircleCheck,
  CircleX,
  Download,
  FileLock2,
  Loader2,
  MessageCircle,
  MessageSquareWarning,
  Send,
  ShieldAlert,
  ShieldCheck,
  Stamp,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import {
  EvaluatorBadge,
  ReleaseStatusBadge,
  ResultBadge,
  SectorBadge,
  SeverityBadge,
} from "@/components/proofrail/StatusBadge";
import { cn } from "@/lib/utils";

function timeAgo(ts: number) {
  const days = Math.floor((Date.now() - ts) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

function formatScheduled(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

async function sha256Hex(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const SLOTS = ["09:00", "11:00", "14:00", "16:00"];

function nextDays(count: number) {
  const out: Date[] = [];
  const d = new Date();
  while (out.length < count) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) out.push(new Date(d));
  }
  return out;
}

export default function ReleaseDetail() {
  const { releaseId } = useParams();
  const data = useQuery(api.optimized.getReleaseDetail, {
    releaseId: releaseId as never,
  });
  const comments = useQuery(api.optimized.listComments, {
    releaseId: releaseId as never,
  });
  const team = useQuery(api.optimized.listTeamMembers);
  const resolveReview = useMutation(api.proofrail.resolveReview);
  const approveWithExceptions = useMutation(api.proofrail.approveWithExceptions);
  const addComment = useMutation(api.proofrail.addComment);
  const scheduleReview = useMutation(api.proofrail.scheduleReview);

  const [resolveTarget, setResolveTarget] = useState<{
    runId: string;
    scenarioTitle: string;
    note: string;
    result: "pass" | "fail";
  } | null>(null);
  const [resolveBusy, setResolveBusy] = useState(false);
  const [exceptionsOpen, setExceptionsOpen] = useState(false);
  const [exceptions, setExceptions] = useState<Record<string, string>>({});
  const [approveBusy, setApproveBusy] = useState(false);
  const [packetOpen, setPacketOpen] = useState(false);
  const [signature, setSignature] = useState("");

  const [commentText, setCommentText] = useState("");
  const [commentBusy, setCommentBusy] = useState(false);

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleBusy, setScheduleBusy] = useState(false);
  const [scheduleDay, setScheduleDay] = useState("");
  const [scheduleSlot, setScheduleSlot] = useState(SLOTS[0]);
  const [scheduleWith, setScheduleWith] = useState("");

  const failedScenarios = useMemo(() => {
    if (!data) return [];
    const seen = new Set<string>();
    const out: { title: string; note: string }[] = [];
    for (const { run, scenario } of data.runs) {
      if (run.result === "fail" && scenario && !seen.has(scenario.title)) {
        seen.add(scenario.title);
        out.push({ title: scenario.title, note: run.note ?? "" });
      }
    }
    return out;
  }, [data]);

  const counts = useMemo(() => {
    if (!data) return { pass: 0, fail: 0, review: 0, total: 0 };
    const runs = data.runs.map((r) => r.run);
    return {
      pass: runs.filter((r) => r.result === "pass").length,
      fail: runs.filter((r) => r.result === "fail").length,
      review: runs.filter((r) => r.result === "needs-review").length,
      total: runs.length,
    };
  }, [data]);

  const days = useMemo(() => nextDays(5), []);

  useEffect(() => {
    if (!data || !packetOpen) return;
    const packet = {
      record: "proofrail-evidence-packet",
      version: 1,
      generatedAt: new Date().toISOString(),
      release: {
        version: data.release.version,
        baselineVersion: data.release.baselineVersion,
        status: data.release.status,
        createdBy: data.release.createdBy,
        createdAt: data.release.createdAt,
        summary: data.release.summary,
        exceptions: data.release.exceptions,
      },
      workflow: {
        name: data.workflow.name,
        agent: data.workflow.agent,
        sector: data.workflow.sector,
        traceSource: data.workflow.traceSource,
      },
      checks: data.runs.map(({ run, scenario, policy }) => ({
        scenario: scenario?.title ?? "Untitled",
        severity: scenario?.severity ?? "medium",
        policy: policy?.title ?? "Unmapped",
        evaluator: run.evaluator,
        result: run.result,
        score: run.score ?? null,
        reviewer: run.reviewer ?? null,
        note: run.note ?? "",
      })),
    };
    sha256Hex(JSON.stringify(packet)).then(setSignature);
  }, [data, packetOpen]);

  if (data === undefined || comments === undefined) {
    return (
      <div className="mx-auto max-w-6xl space-y-4">
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  if (data === null) {
    return (
      <div className="mx-auto max-w-6xl glass-panel p-10 text-center">
        <p className="text-sm font-medium">Release not found</p>
        <Button asChild variant="outline" size="sm" className="mt-3 cursor-pointer rounded-full">
          <Link to="/dashboard/releases">Back to releases</Link>
        </Button>
      </div>
    );
  }

  const { release, workflow, runs } = data;
  const needsReviewRuns = runs.filter(
    ({ run }) => run.result === "needs-review" && run.evaluator === "human",
  );
  const canSchedule =
    (release.status === "blocked" || release.status === "pending") &&
    !release.reviewScheduledAt;

  const handleResolve = async () => {
    if (!resolveTarget) return;
    setResolveBusy(true);
    try {
      await resolveReview({
        testRunId: resolveTarget.runId as never,
        result: resolveTarget.result,
        note: resolveTarget.note || "Resolved by assigned reviewer.",
      });
      toast.success("Review resolved", {
        description:
          resolveTarget.result === "pass"
            ? "The gate was updated."
            : "Marked as failed — the gate recomputed.",
      });
      setResolveTarget(null);
    } catch (err) {
      console.error(err);
      toast.error("Could not resolve review");
    } finally {
      setResolveBusy(false);
    }
  };

  const handleApprove = async () => {
    const list = failedScenarios
      .filter((f) => (exceptions[f.title] ?? "").trim().length > 0)
      .map((f) => ({ scenarioTitle: f.title, reason: exceptions[f.title].trim() }));
    if (list.length === 0) {
      toast.error("Document exceptions", {
        description: "Each failed scenario needs a written reason.",
      });
      return;
    }
    setApproveBusy(true);
    try {
      await approveWithExceptions({
        releaseId: release._id as never,
        exceptions: list,
      });
      toast.success("Release approved with exceptions", {
        description: "Recorded with your name as the approver.",
      });
      setExceptionsOpen(false);
      setExceptions({});
    } catch (err) {
      console.error(err);
      toast.error("Could not approve release");
    } finally {
      setApproveBusy(false);
    }
  };

  const handleComment = async () => {
    const body = commentText.trim();
    if (!body) return;
    setCommentBusy(true);
    try {
      await addComment({ releaseId: release._id as never, body });
      toast.success("Comment posted to the evidence thread");
      setCommentText("");
    } catch (err) {
      console.error(err);
      toast.error("Could not post comment");
    } finally {
      setCommentBusy(false);
    }
  };

  const handleSchedule = async () => {
    if (!scheduleDay || !scheduleWith) return;
    const day = days.find((d) => d.toDateString() === scheduleDay);
    if (!day) return;
    const [h, m] = scheduleSlot.split(":").map(Number);
    const at = new Date(day);
    at.setHours(h, m, 0, 0);
    setScheduleBusy(true);
    try {
      await scheduleReview({
        releaseId: release._id as never,
        scheduledAt: at.getTime(),
        withPerson: scheduleWith,
      });
      toast.success("Compliance review scheduled", {
        description: `${formatScheduled(at.getTime())} at ${scheduleSlot} with ${scheduleWith}.`,
      });
      setScheduleOpen(false);
      setScheduleDay("");
      setScheduleWith("");
    } catch (err) {
      console.error(err);
      toast.error("Could not schedule review");
    } finally {
      setScheduleBusy(false);
    }
  };

  const downloadPacket = () => {
    const packet = {
      record: "proofrail-evidence-packet",
      version: 1,
      generatedAt: new Date().toISOString(),
      signature,
      release: {
        version: release.version,
        baselineVersion: release.baselineVersion,
        status: release.status,
        createdBy: release.createdBy,
        createdAt: release.createdAt,
        summary: release.summary,
        exceptions: release.exceptions,
      },
      workflow: {
        name: workflow.name,
        agent: workflow.agent,
        sector: workflow.sector,
        traceSource: workflow.traceSource,
      },
      checks: runs.map(({ run, scenario, policy }) => ({
        scenario: scenario?.title ?? "Untitled",
        severity: scenario?.severity ?? "medium",
        policy: policy?.title ?? "Unmapped",
        evaluator: run.evaluator,
        result: run.result,
        score: run.score ?? null,
        reviewer: run.reviewer ?? null,
        note: run.note ?? "",
      })),
    };
    const blob = new Blob([JSON.stringify(packet, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `proofrail-${workflow.name.toLowerCase().replace(/\s+/g, "-")}-${release.version}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Evidence packet downloaded");
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-ml-2 cursor-pointer rounded-full text-muted-foreground"
        >
          <Link to="/dashboard/releases">
            <ArrowLeft className="size-3.5" />
            Release gates
          </Link>
        </Button>
        <div className="mt-2 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-mono text-2xl font-bold tracking-tight sm:text-3xl">
                {release.version}
              </h1>
              <ReleaseStatusBadge status={release.status} />
            </div>
            <p className="mt-1.5 text-[13px] text-muted-foreground">
              {workflow.name} · <SectorBadge sector={workflow.sector} />{" "}
              <span className="font-mono">{workflow.agent}</span> ·{" "}
              {workflow.traceSource}
            </p>
            <p className="mt-1 text-[12px] text-muted-foreground">
              Baseline {release.baselineVersion} · created {timeAgo(release.createdAt)} ·{" "}
              {release.createdBy}
            </p>
            {release.reviewScheduledAt && (
              <p className="mt-1.5 flex items-center gap-1.5 text-[12px] font-medium text-cyan-300">
                <CalendarClock className="size-3.5" />
                Compliance review booked — {formatScheduled(release.reviewScheduledAt)} ·{" "}
                {release.reviewScheduledWith}
              </p>
            )}
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {canSchedule && (
              <Button
                variant="outline"
                className="cursor-pointer rounded-full"
                onClick={() => setScheduleOpen(true)}
              >
                <CalendarClock className="size-4" />
                Schedule review
              </Button>
            )}
            <Button
              variant="outline"
              className="cursor-pointer rounded-full"
              onClick={() => setPacketOpen(true)}
            >
              <FileLock2 className="size-4" />
              Evidence packet
            </Button>
            {release.status === "blocked" && (
              <Button
                className="cursor-pointer rounded-full"
                onClick={() => setExceptionsOpen(true)}
              >
                <Stamp className="size-4" />
                Approve with exceptions
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Gate banner */}
      <section
        className={cn(
          "glass-panel flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6",
          release.status === "blocked" && "ring-1 ring-rose-400/25",
          release.status === "approved" && "ring-1 ring-emerald-400/25",
          release.status === "approved-with-exceptions" && "ring-1 ring-violet-400/25",
          (release.status === "pending" || release.status === "running") &&
            "ring-1 ring-amber-400/25",
        )}
      >
        <div className="flex items-start gap-4">
          <span
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-white/10",
              release.status === "blocked" && "bg-rose-500/10 text-rose-300",
              release.status === "approved" && "bg-emerald-500/10 text-emerald-300",
              release.status === "approved-with-exceptions" &&
                "bg-violet-500/10 text-violet-300",
              (release.status === "pending" || release.status === "running") &&
                "bg-amber-500/10 text-amber-300",
            )}
          >
            {release.status === "blocked" ? (
              <ShieldAlert className="size-5" />
            ) : release.status === "approved" ? (
              <BadgeCheck className="size-5" />
            ) : (
              <MessageSquareWarning className="size-5" />
            )}
          </span>
          <div>
            <p className="text-[15px] font-semibold tracking-tight">
              {release.status === "blocked" &&
                `Blocked — ${counts.fail} failing check${counts.fail === 1 ? "" : "s"} against documented policy`}
              {release.status === "approved" &&
                "Approved — the full acceptance suite passed against baseline"}
              {release.status === "approved-with-exceptions" &&
                "Approved with documented exceptions — record retained for audit"}
              {(release.status === "pending" || release.status === "running") &&
                "Awaiting human review — ambiguity is surfaced, not collapsed"}
            </p>
            <p className="mt-1 max-w-2xl text-[12.5px] leading-relaxed text-muted-foreground">
              {release.status === "blocked" &&
                "Critical or high-severity regressions were detected. A compliance owner must sign off before this candidate ships."}
              {release.status === "approved" &&
                "Every deterministic check, model grader, and human review passed. The signed evidence packet is ready to export."}
              {release.status === "approved-with-exceptions" &&
                "Failed scenarios were approved with written reasons. The exceptions are part of the permanent release record."}
              {(release.status === "pending" || release.status === "running") &&
                `${needsReviewRuns.length} review${needsReviewRuns.length === 1 ? "" : "s"} assigned — resolve them and the gate recomputes.`}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="flex items-center gap-1.5 text-[12px] font-medium text-emerald-300">
            <CircleCheck className="size-4" />
            {counts.pass}
          </span>
          {counts.fail > 0 && (
            <span className="flex items-center gap-1.5 text-[12px] font-medium text-rose-300">
              <CircleX className="size-4" />
              {counts.fail}
            </span>
          )}
          {counts.review > 0 && (
            <span className="flex items-center gap-1.5 text-[12px] font-medium text-amber-300">
              <MessageSquareWarning className="size-4" />
              {counts.review}
            </span>
          )}
          <span className="text-[12px] text-muted-foreground">/ {counts.total} checks</span>
        </div>
      </section>

      {release.exceptions.length > 0 && (
        <section className="glass-panel-soft p-5">
          <h2 className="text-[14px] font-semibold tracking-tight">
            Approved exceptions on record
          </h2>
          <div className="mt-3 space-y-2.5">
            {release.exceptions.map((e) => (
              <div
                key={e.scenarioTitle}
                className="rounded-xl border border-white/10 bg-white/5 p-3.5"
              >
                <p className="text-[12.5px] font-semibold">{e.scenarioTitle}</p>
                <p className="mt-0.5 text-[12px] text-muted-foreground">{e.reason}</p>
                <p className="mt-1.5 text-[11px] font-medium text-violet-300">
                  Approved by {e.approvedBy}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Test runs */}
      <section className="glass-panel overflow-hidden p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-[15px] font-semibold tracking-tight">
              Evaluation results
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Deterministic checks, model graders, and human reviews — kept separate
              so disagreement is visible
            </p>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto rounded-xl border border-white/10 bg-white/5">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4 text-[11px] uppercase tracking-wider">
                  Scenario
                </TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider">
                  Policy
                </TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider">
                  Evaluator
                </TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider">
                  Result
                </TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider">
                  Score
                </TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider">
                  Reviewer
                </TableHead>
                <TableHead className="pr-4 text-right text-[11px] uppercase tracking-wider">
                  Note
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map(({ run, scenario, policy }) => (
                <TableRow key={run._id}>
                  <TableCell className="max-w-52 pl-4">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-[12.5px] font-medium">
                        {scenario?.title ?? "Untitled"}
                      </p>
                      {scenario && <SeverityBadge severity={scenario.severity} />}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-44">
                    <p className="truncate text-[12px] text-muted-foreground">
                      {policy?.title ?? "Unmapped"}
                    </p>
                  </TableCell>
                  <TableCell>
                    <EvaluatorBadge evaluator={run.evaluator} />
                  </TableCell>
                  <TableCell>
                    <ResultBadge result={run.result} />
                  </TableCell>
                  <TableCell className="font-mono text-[12.5px] font-medium">
                    {run.score !== undefined && run.score !== null
                      ? `${run.score}/100`
                      : "—"}
                  </TableCell>
                  <TableCell className="max-w-40">
                    <p className="truncate text-[12px] text-muted-foreground">
                      {run.reviewer ?? "—"}
                    </p>
                  </TableCell>
                  <TableCell className="pr-4">
                    <div className="flex items-center justify-end gap-2">
                      <p className="max-w-56 truncate text-[11.5px] text-muted-foreground">
                        {run.note}
                      </p>
                      {run.result === "needs-review" && run.evaluator === "human" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 shrink-0 cursor-pointer rounded-full px-2.5 text-[11px]"
                          onClick={() =>
                            setResolveTarget({
                              runId: run._id,
                              scenarioTitle: scenario?.title ?? "Scenario",
                              note: "",
                              result: "pass",
                            })
                          }
                        >
                          Resolve
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* Comments */}
      <section className="glass-panel p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <MessageCircle className="size-4 text-cyan-300" />
          <h2 className="text-[15px] font-semibold tracking-tight">
            Evidence thread
          </h2>
          <span className="rounded-full bg-white/5 px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
            {comments.length}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Discuss the gate decision here — every message becomes part of the
          release record.
        </p>

        <div className="mt-4 space-y-3">
          {comments.length === 0 && (
            <p className="rounded-xl border border-dashed border-border p-5 text-center text-[12.5px] text-muted-foreground">
              No comments yet. Start the discussion with a note for your reviewers.
            </p>
          )}
          {comments.map((c) => (
            <div
              key={c._id}
              className="rounded-xl border border-white/10 bg-white/5 p-3.5"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-[12.5px] font-semibold tracking-tight">{c.author}</p>
                <p className="text-[10.5px] text-muted-foreground">
                  {timeAgo(c.createdAt)}
                </p>
              </div>
              <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
                {c.body}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-start gap-2">
          <Textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Add a note for the reviewers…"
            className="min-h-20 flex-1"
          />
          <Button
            className="cursor-pointer rounded-xl"
            onClick={handleComment}
            disabled={commentBusy || !commentText.trim()}
          >
            {commentBusy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            Post
          </Button>
        </div>
      </section>

      {/* Resolve review dialog */}
      <Dialog
        open={resolveTarget !== null}
        onOpenChange={(o) => !o && setResolveTarget(null)}
      >
        <DialogContent className="bg-background/95 backdrop-blur-xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Resolve human review</DialogTitle>
            <DialogDescription>
              {resolveTarget?.scenarioTitle} — the model grader flagged this as
              ambiguous against the policy. Your decision updates the gate.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                variant={resolveTarget?.result === "pass" ? "default" : "outline"}
                className="flex-1 cursor-pointer rounded-full"
                onClick={() =>
                  setResolveTarget((r) => (r ? { ...r, result: "pass" } : r))
                }
              >
                <CircleCheck className="size-4" />
                Compliant
              </Button>
              <Button
                variant={resolveTarget?.result === "fail" ? "destructive" : "outline"}
                className="flex-1 cursor-pointer rounded-full"
                onClick={() =>
                  setResolveTarget((r) => (r ? { ...r, result: "fail" } : r))
                }
              >
                <CircleX className="size-4" />
                Violates policy
              </Button>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] font-medium">Rationale</Label>
              <Textarea
                value={resolveTarget?.note ?? ""}
                onChange={(e) =>
                  setResolveTarget((r) => (r ? { ...r, note: e.target.value } : r))
                }
                placeholder="e.g. Jurisdiction clause differs from standard and was never approved."
                className="min-h-24"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="cursor-pointer rounded-full"
              onClick={() => setResolveTarget(null)}
            >
              Cancel
            </Button>
            <Button
              className="cursor-pointer rounded-full"
              disabled={resolveBusy}
              onClick={handleResolve}
            >
              {resolveBusy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ShieldCheck className="size-4" />
              )}
              Record decision
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve with exceptions dialog */}
      <Dialog open={exceptionsOpen} onOpenChange={setExceptionsOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto bg-background/95 backdrop-blur-xl sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Approve with exceptions</DialogTitle>
            <DialogDescription>
              This candidate has failing checks. Compliance sign-off requires a
              written reason for each — these become part of the permanent
              evidence record.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {failedScenarios.map((f) => (
              <div key={f.title} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-[13px] font-semibold tracking-tight">{f.title}</p>
                <p className="mt-0.5 text-[11.5px] text-muted-foreground">{f.note}</p>
                <Input
                  className="mt-3"
                  placeholder="Reason for exception (required)"
                  value={exceptions[f.title] ?? ""}
                  onChange={(e) =>
                    setExceptions((prev) => ({
                      ...prev,
                      [f.title]: e.target.value,
                    }))
                  }
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="cursor-pointer rounded-full"
              onClick={() => setExceptionsOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="cursor-pointer rounded-full"
              disabled={approveBusy}
              onClick={handleApprove}
            >
              {approveBusy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Stamp className="size-4" />
              )}
              Approve with exceptions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule review dialog */}
      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="bg-background/95 backdrop-blur-xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Schedule compliance review</DialogTitle>
            <DialogDescription>
              Book a sign-off session for {workflow.name} {release.version}. The
              appointment is recorded on the release.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-[12px] font-medium">Day</Label>
                <Select value={scheduleDay} onValueChange={setScheduleDay}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pick a day" />
                  </SelectTrigger>
                  <SelectContent>
                    {days.map((d) => (
                      <SelectItem key={d.toDateString()} value={d.toDateString()}>
                        {formatScheduled(d.getTime())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px] font-medium">Time</Label>
                <Select value={scheduleSlot} onValueChange={setScheduleSlot}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SLOTS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] font-medium">Attendee</Label>
              <Select value={scheduleWith} onValueChange={setScheduleWith}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Who should sign off?" />
                </SelectTrigger>
                <SelectContent>
                  {(team ?? []).map((m) => (
                    <SelectItem key={m._id} value={`${m.name} · ${m.role}`}>
                      {m.name} · {m.role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="cursor-pointer rounded-full"
              onClick={() => setScheduleOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="cursor-pointer rounded-full"
              disabled={scheduleBusy || !scheduleDay || !scheduleWith}
              onClick={handleSchedule}
            >
              {scheduleBusy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CalendarClock className="size-4" />
              )}
              Book review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Evidence packet dialog */}
      <Dialog open={packetOpen} onOpenChange={setPacketOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto bg-background/95 backdrop-blur-xl sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Evidence packet</DialogTitle>
            <DialogDescription>
              Signed record of scenarios, results, reviewers, and exceptions for{" "}
              {workflow.name} {release.version}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-[12px]">
              <div className="grid gap-1.5 sm:grid-cols-2">
                <p className="text-muted-foreground">
                  Release:{" "}
                  <span className="font-mono font-medium text-foreground">{release.version}</span>
                </p>
                <p className="text-muted-foreground">
                  Baseline:{" "}
                  <span className="font-mono font-medium text-foreground">
                    {release.baselineVersion}
                  </span>
                </p>
                <p className="text-muted-foreground">
                  Status:{" "}
                  <span className="font-medium text-foreground">{release.status}</span>
                </p>
                <p className="text-muted-foreground">
                  Created by:{" "}
                  <span className="font-medium text-foreground">
                    {release.createdBy}
                  </span>
                </p>
              </div>
              <p className="mt-2 border-t border-white/10 pt-2 text-muted-foreground">
                {release.summary}
              </p>
            </div>

            <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
              {runs.map(({ run, scenario, policy }) => (
                <div
                  key={run._id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-medium">
                      {scenario?.title ?? "Untitled"}
                    </p>
                    <p className="truncate text-[10.5px] text-muted-foreground">
                      {policy?.title ?? "Unmapped"} · {run.evaluator}
                      {run.reviewer ? ` · ${run.reviewer}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {run.score !== undefined && run.score !== null && (
                      <span className="font-mono text-[11px] font-semibold">{run.score}</span>
                    )}
                    <ResultBadge result={run.result} />
                  </div>
                </div>
              ))}
            </div>

            {release.exceptions.length > 0 && (
              <div className="rounded-xl border border-violet-400/25 bg-violet-500/10 p-4">
                <p className="text-[12px] font-semibold text-violet-300">
                  Exceptions ({release.exceptions.length})
                </p>
                {release.exceptions.map((e) => (
                  <p key={e.scenarioTitle} className="mt-1 text-[11.5px] text-violet-200/80">
                    {e.scenarioTitle} — {e.reason} ({e.approvedBy})
                  </p>
                ))}
              </div>
            )}

            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Stamp className="size-3.5" />
                Record signature
              </p>
              <p className="mt-1.5 break-all font-mono text-[10.5px] text-muted-foreground">
                {signature || "Computing SHA-256 of canonical record…"}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              className="cursor-pointer rounded-full"
              onClick={() => setPacketOpen(false)}
            >
              Close
            </Button>
            <Button className="cursor-pointer rounded-full" onClick={downloadPacket}>
              <Download className="size-4" />
              Download JSON
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
