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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  ArrowRight,
  CalendarClock,
  CircleCheck,
  CircleX,
  GitPullRequestArrow,
  Loader2,
  MessageSquareWarning,
  Plus,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import {
  ReleaseStatusBadge,
  SectorBadge,
} from "@/components/proofrail/StatusBadge";
import { cn } from "@/lib/utils";

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const days = Math.floor(diff / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default function Releases() {
  const releases = useQuery(api.optimized.listReleases);
  const workflows = useQuery(api.optimized.listWorkflows);
  const createRelease = useMutation(api.proofrail.createRelease);

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [wfId, setWfId] = useState("");
  const [version, setVersion] = useState("");
  const [baseline, setBaseline] = useState("");
  const [summary, setSummary] = useState("");

  const existingVersions = useMemo(() => {
    if (!releases) return [];
    return releases
      .filter((r) => r.workflowId === wfId)
      .map((r) => r.version);
  }, [releases, wfId]);

  const handleCreate = async () => {
    const effBaseline = baseline.trim() || (existingVersions.length === 0 ? "v0.0.0" : "");
    if (!wfId || !version.trim() || !effBaseline) {
      toast.error("Missing fields", {
        description: "Workflow and candidate version are required.",
      });
      return;
    }
    setBusy(true);
    try {
      const id = await createRelease({
        workflowId: wfId as never,
        version: version.trim(),
        baselineVersion: effBaseline,
        summary: summary.trim() || "Candidate release for gate evaluation.",
      });
      toast.success("Acceptance suite ran", {
        description: "The gate has decided — check the release detail.",
      });
      setOpen(false);
      setVersion("");
      setBaseline("");
      setSummary("");
      setWfId("");
      return id;
    } catch (err) {
      console.error(err);
      toast.error("Could not create release");
    } finally {
      setBusy(false);
    }
  };

  if (releases === undefined || workflows === undefined) {
    return (
      <div className="mx-auto max-w-6xl space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[13px] font-medium text-muted-foreground">
            Release gate &amp; evidence
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            Release gates
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
            Every candidate release runs the acceptance suite against the approved
            baseline. Critical regressions block the release; everything is
            retained as signed evidence.
          </p>
        </div>
        <Button className="cursor-pointer rounded-full" onClick={() => setOpen(true)}>
          <Plus className="size-4" />
          Create release
        </Button>
      </div>

      {releases.length === 0 && (
        <div className="glass-panel p-10 text-center">
          <p className="text-sm font-medium">No releases gated yet</p>
          <p className="mx-auto mt-1 max-w-sm text-[12.5px] text-muted-foreground">
            Create a candidate release to run the acceptance suite and produce its
            evidence packet.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {releases.map((r) => (
          <Link key={r._id} to={`/dashboard/releases/${r._id}`}>
            <article className="glass-panel group flex flex-col gap-4 p-5 transition-transform duration-200 hover:-translate-y-0.5 sm:flex-row sm:items-center">
              <span
                className={cn(
                  "flex size-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-white/10",
                  r.status === "blocked"
                    ? "bg-rose-500/10 text-rose-300"
                    : r.status === "approved" || r.status === "approved-with-exceptions"
                      ? "bg-emerald-500/10 text-emerald-300"
                      : "bg-amber-500/10 text-amber-300",
                )}
              >
                <GitPullRequestArrow className="size-5" />
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-mono text-[15px] font-semibold tracking-tight">
                    {r.version}
                  </p>
                  <SectorBadge sector={r.sector} />
                  <ReleaseStatusBadge status={r.status} />
                </div>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  {r.workflowName} · baseline {r.baselineVersion} · {timeAgo(r.createdAt)} ·{" "}
                  {r.createdBy}
                </p>
                <p className="mt-1 line-clamp-1 text-[11.5px] text-muted-foreground/80">
                  {r.summary}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-3">
                <div className="flex items-center gap-2 text-[11.5px] font-medium">
                  <span className="flex items-center gap-1 text-emerald-300">
                    <CircleCheck className="size-3.5" />
                    {r.passCount}
                  </span>
                  {r.failCount > 0 && (
                    <span className="flex items-center gap-1 text-rose-300">
                      <CircleX className="size-3.5" />
                      {r.failCount}
                    </span>
                  )}
                  {r.reviewCount > 0 && (
                    <span className="flex items-center gap-1 text-amber-300">
                      <MessageSquareWarning className="size-3.5" />
                      {r.reviewCount}
                    </span>
                  )}
                  <span className="text-muted-foreground">/ {r.testCount} checks</span>
                </div>
                {r.reviewScheduledAt && (
                  <span className="flex items-center gap-1 font-mono text-[11px] text-cyan-300">
                    <CalendarClock className="size-3.5" />
                    review booked
                  </span>
                )}
                <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </div>
            </article>
          </Link>
        ))}
      </div>

      {/* Create release dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-background/95 backdrop-blur-xl sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Create a candidate release</DialogTitle>
            <DialogDescription>
              The acceptance suite runs immediately and the gate decides. You can
              approve with documented exceptions afterwards.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[12px] font-medium">Workflow</Label>
              <Select
                value={wfId}
                onValueChange={(v) => {
                  setWfId(v);
                  const latest = releases
                    .filter((r) => r.workflowId === v)
                    .sort((a, b) => b.createdAt - a.createdAt)[0];
                  setBaseline(latest?.version ?? "");
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select workflow" />
                </SelectTrigger>
                <SelectContent>
                  {workflows.length === 0 ? (
                    <SelectItem value="_empty" disabled>
                      No workflows found (Create a workflow first)
                    </SelectItem>
                  ) : (
                    workflows.map((w) => (
                      <SelectItem key={w._id} value={w._id}>
                        {w.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-[12px] font-medium">Candidate version</Label>
                <Input
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  placeholder="v2.5.0"
                  className="font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px] font-medium">Baseline</Label>
                <Input
                  value={baseline}
                  onChange={(e) => setBaseline(e.target.value)}
                  placeholder={existingVersions.length === 0 ? "v0.0.0 (initial)" : "v2.4.0"}
                  className="font-mono"
                />
                {existingVersions.length > 0 && (
                  <p className="font-mono text-[10.5px] text-muted-foreground">
                    Known: {existingVersions.join(", ")}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[12px] font-medium">What changed</Label>
              <Textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="e.g. Added approval checkpoint before docusign_push; fixed retrieval pagination."
                className="min-h-20"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              className="cursor-pointer rounded-full"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="cursor-pointer rounded-full"
              onClick={handleCreate}
              disabled={busy}
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <GitPullRequestArrow className="size-4" />
              )}
              Run the gate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
