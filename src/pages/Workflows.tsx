import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Database,
  GitPullRequestArrow,
  Loader2,
  Plus,
  ScrollText,
  ShieldCheck,
  Workflow,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import {
  ReleaseStatusBadge,
  SectorBadge,
} from "@/components/proofrail/StatusBadge";

function timeAgo(ts: number) {
  const days = Math.floor((Date.now() - ts) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default function Workflows() {
  const workflows = useQuery(api.optimized.listWorkflows);
  const createWorkflow = useMutation(api.proofrail.createWorkflow);

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sector, setSector] = useState<"legal" | "healthcare" | "finops" | "support">("legal");
  const [agent, setAgent] = useState("claude-sonnet-4-5");
  const [traceSource, setTraceSource] = useState("OpenTelemetry");

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Name required", { description: "Enter a workflow name." });
      return;
    }
    setBusy(true);
    try {
      await createWorkflow({
        name: name.trim(),
        description: description.trim() || "AI agent under governance.",
        sector,
        agent: agent.trim() || "custom-agent",
        traceSource: traceSource.trim() || "OpenTelemetry",
      });
      toast.success("Workflow registered", {
        description: `${name} is now under governance.`,
      });
      setOpen(false);
      setName("");
      setDescription("");
    } catch (err) {
      toast.error("Creation failed", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setBusy(false);
    }
  };

  if (workflows === undefined) {
    return (
      <div className="mx-auto max-w-6xl space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[13px] font-medium text-muted-foreground">
            Governance scope
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            Workflows
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
            Each agent in production gets its own acceptance suite, policy set, and
            release history. Connect one workflow to start.
          </p>
        </div>
        <Button className="cursor-pointer rounded-full" onClick={() => setOpen(true)}>
          <Plus className="size-4" />
          Connect workflow
        </Button>
      </div>

      {workflows.length === 0 ? (
        <Empty className="glass-panel">
          <EmptyHeader>
            <EmptyMedia variant="icon" className="bg-cyan-500/10 text-cyan-300">
              <Workflow className="size-6" />
            </EmptyMedia>
            <EmptyTitle>No workflows yet</EmptyTitle>
            <EmptyDescription>
              Connect OpenTelemetry or another observability source to start
              converting production traces into regression scenarios.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button className="cursor-pointer rounded-full" onClick={() => setOpen(true)}>
              <Plus className="size-4" />
              Connect your first workflow
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {workflows.map((wf) => (
            <article key={wf._id} className="glass-panel flex flex-col gap-4 p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-[16px] font-semibold tracking-tight">
                      {wf.name}
                    </h2>
                    <SectorBadge sector={wf.sector} />
                  </div>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">
                    {wf.description}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11.5px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Workflow className="size-3.5 text-cyan-300" />
                  <span className="font-mono">{wf.agent}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Database className="size-3.5 text-cyan-300" />
                  {wf.traceSource}
                </span>
                <span className="flex items-center gap-1.5">
                  <ScrollText className="size-3.5 text-cyan-300" />
                  {wf.activeScenarioCount} scenarios in suite
                  {wf.draftScenarioCount > 0 && ` · ${wf.draftScenarioCount} drafts`}
                </span>
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-cyan-300" />
                  {wf.policyCount} policies
                </span>
              </div>

              <div className="mt-auto flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  {wf.latestRelease ? (
                    <>
                      <ReleaseStatusBadge status={wf.latestRelease.status} />
                      <span className="text-[11.5px] text-muted-foreground">
                        <span className="font-mono">{wf.latestRelease.version}</span> · {timeAgo(wf.latestRelease.createdAt)}
                      </span>
                    </>
                  ) : (
                    <span className="text-[11.5px] text-muted-foreground">
                      No release gated yet
                    </span>
                  )}
                </div>
                <Button asChild variant="outline" size="sm" className="cursor-pointer rounded-full">
                  <Link to="/dashboard/releases">
                    <GitPullRequestArrow className="size-3.5" />
                    Release history
                  </Link>
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-background/95 backdrop-blur-xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connect workflow</DialogTitle>
            <DialogDescription>
              Register an AI agent workflow under governance to manage acceptance suites, policies, and release gates.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[12px] font-medium">Workflow name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Support Deflection Copilot"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[12px] font-medium">Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does this agent do in production?"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-[12px] font-medium">Industry sector</Label>
                <Select value={sector} onValueChange={(v) => setSector(v as never)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="legal">Legal</SelectItem>
                    <SelectItem value="healthcare">Healthcare</SelectItem>
                    <SelectItem value="finops">FinOps</SelectItem>
                    <SelectItem value="support">Support</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[12px] font-medium">Agent model</Label>
                <Input
                  value={agent}
                  onChange={(e) => setAgent(e.target.value)}
                  placeholder="claude-sonnet-4-5"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[12px] font-medium">Trace source</Label>
              <Select value={traceSource} onValueChange={setTraceSource}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OpenTelemetry">OpenTelemetry</SelectItem>
                  <SelectItem value="Langfuse">Langfuse</SelectItem>
                  <SelectItem value="Braintrust">Braintrust</SelectItem>
                  <SelectItem value="Custom API">Custom API</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" className="cursor-pointer rounded-full" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button className="cursor-pointer rounded-full" onClick={handleCreate} disabled={busy || !name.trim()}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Connect workflow
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
