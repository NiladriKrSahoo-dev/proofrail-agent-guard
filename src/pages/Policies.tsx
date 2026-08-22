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
  FileCheck2,
  Loader2,
  Plus,
  ShieldCheck,
  UserRound,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { PolicyBehaviorBadge } from "@/components/proofrail/StatusBadge";

const evidenceOptions = [
  "Trace capture",
  "Incident review",
  "Policy manual",
  "Manual attestation",
  "Model audit",
];

export default function Policies() {
  const policies = useQuery(api.optimized.listPolicies, {});
  const workflows = useQuery(api.optimized.listWorkflows);
  const createPolicy = useMutation(api.proofrail.createPolicy);

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [wfId, setWfId] = useState("");
  const [title, setTitle] = useState("");
  const [statement, setStatement] = useState("");
  const [behavior, setBehavior] = useState("required");
  const [owner, setOwner] = useState("");
  const [evidence, setEvidence] = useState(evidenceOptions[0]);

  const handleCreate = async () => {
    if (!wfId || !title.trim() || !statement.trim() || !owner.trim()) {
      toast.error("Missing fields", {
        description: "Title, statement, owner, and workflow are required.",
      });
      return;
    }
    setBusy(true);
    try {
      await createPolicy({
        workflowId: wfId as never,
        title: title.trim(),
        statement: statement.trim(),
        behavior: behavior as "required" | "forbidden" | "approval-gated",
        owner: owner.trim(),
        evidenceSource: evidence,
      });
      toast.success("Policy published", {
        description: "It now maps to the workflow's acceptance suite.",
      });
      setOpen(false);
      setTitle("");
      setStatement("");
      setOwner("");
    } catch (err) {
      console.error(err);
      toast.error("Could not create policy");
    } finally {
      setBusy(false);
    }
  };

  if (policies === undefined || workflows === undefined) {
    return (
      <div className="mx-auto max-w-6xl space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-2xl" />
        ))}
      </div>
    );
  }

  const grouped = {
    required: policies.filter((p) => p.behavior === "required"),
    forbidden: policies.filter((p) => p.behavior === "forbidden"),
    "approval-gated": policies.filter((p) => p.behavior === "approval-gated"),
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[13px] font-medium text-muted-foreground">
            Policy workspace
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            Policies
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
            Compliance owners write required, forbidden, and approval-gated
            behavior in plain language. Each policy maps to tests, an owner, and
            the evidence source it came from.
          </p>
        </div>
        <Button className="cursor-pointer rounded-full" onClick={() => setOpen(true)}>
          <Plus className="size-4" />
          New policy
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {(
          [
            ["required", "Required behavior", "The agent must always do this.", Zap],
            ["forbidden", "Forbidden behavior", "The agent must never do this.", FileCheck2],
            ["approval-gated", "Approval-gated", "A human must sign off first.", ShieldCheck],
          ] as const
        ).map(([key, label, desc, Icon]) => (
          <section key={key} className="glass-panel-soft p-5">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-300">
                <Icon className="size-5" />
              </span>
              <div>
                <h2 className="text-[14px] font-semibold tracking-tight">{label}</h2>
                <p className="text-[11px] text-muted-foreground">{desc}</p>
              </div>
              <span className="ml-auto rounded-full bg-white/5 px-2 py-0.5 font-mono text-[11px] font-semibold text-muted-foreground">
                {grouped[key].length}
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {grouped[key].length === 0 && (
                <p className="rounded-xl border border-dashed border-border p-4 text-center text-[12px] text-muted-foreground">
                  No policies in this category yet.
                </p>
              )}
              {grouped[key].map((p) => (
                <article
                  key={p._id}
                  className="rounded-xl border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-[13px] font-semibold leading-snug tracking-tight">
                      {p.title}
                    </h3>
                    <PolicyBehaviorBadge behavior={p.behavior} />
                  </div>
                  <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
                    {p.statement}
                  </p>
                  <div className="mt-3 space-y-1.5 border-t border-white/10 pt-3 text-[11px] text-muted-foreground">
                    <p className="flex items-center gap-1.5">
                      <UserRound className="size-3.5 text-cyan-300" />
                      Owner: {p.owner}
                    </p>
                    <p className="flex items-center gap-1.5">
                      <FileCheck2 className="size-3.5 text-cyan-300" />
                      Evidence: {p.evidenceSource}
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Zap className="size-3.5 text-cyan-300" />
                      {p.mappedTests} test{p.mappedTests === 1 ? "" : "s"} mapped ·{" "}
                      {p.workflowName}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* New policy dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto bg-background/95 backdrop-blur-xl sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>New policy statement</DialogTitle>
            <DialogDescription>
              Written in plain language; mapped to the workflow's acceptance suite
              on publish.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-[12px] font-medium">Workflow</Label>
                <Select value={wfId} onValueChange={setWfId}>
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
              <div className="space-y-1.5">
                <Label className="text-[12px] font-medium">Behavior type</Label>
                <Select value={behavior} onValueChange={setBehavior}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="required">Required</SelectItem>
                    <SelectItem value="forbidden">Forbidden</SelectItem>
                    <SelectItem value="approval-gated">Approval-gated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[12px] font-medium">Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Spend-cap check before renewal execution"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[12px] font-medium">Statement</Label>
              <Textarea
                value={statement}
                onChange={(e) => setStatement(e.target.value)}
                placeholder="The agent must evaluate the spend-cap threshold before any renewal executes. Renewals above $50,000 require human approval."
                className="min-h-24"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-[12px] font-medium">Policy owner</Label>
                <Input
                  value={owner}
                  onChange={(e) => setOwner(e.target.value)}
                  placeholder="Priya Raman · Compliance"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px] font-medium">Evidence source</Label>
                <Select value={evidence} onValueChange={setEvidence}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {evidenceOptions.map((e) => (
                      <SelectItem key={e} value={e}>
                        {e}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
                <ShieldCheck className="size-4" />
              )}
              Publish policy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
