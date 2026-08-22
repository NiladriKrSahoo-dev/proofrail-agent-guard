import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  BadgeCheck,
  Check,
  CreditCard,
  Globe,
  Loader2,
  Plus,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { TeamRoleBadge } from "@/components/proofrail/StatusBadge";

type PlanKey = "free" | "pilot" | "annual";

const PLAN_PRICES: Record<PlanKey, { label: string; amount: number }> = {
  free: { label: "Free engineering tier", amount: 0 },
  pilot: { label: "Implementation pilot", amount: 15000 },
  annual: { label: "Annual contract", amount: 36000 },
};

const TIER_ORDER: PlanKey[] = ["free", "pilot", "annual"];

const integrations = [
  { name: "OpenTelemetry", status: "connected", detail: "Trace ingestion · OTLP" },
  { name: "Langfuse", status: "connected", detail: "Trace import + replay" },
  { name: "Braintrust", status: "connected", detail: "Evaluation export" },
  { name: "SAML SSO", status: "available", detail: "Okta, Entra ID, Google Workspace" },
  { name: "Audit log webhook", status: "available", detail: "Ship evidence to your SIEM" },
] as const;

function UsageBar({ current, max, label }: { current: number; max: number; label: string }) {
  const pct = max === Infinity ? 0 : Math.min(100, (current / max) * 100);
  const atLimit = max !== Infinity && current >= max;
  const nearLimit = max !== Infinity && current >= max * 0.8;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground">{label}</span>
        <span className={`font-mono ${atLimit ? "text-amber-400" : "text-muted-foreground"}`}>
          {current}{max === Infinity ? " ∞" : ` / ${max}`}
        </span>
      </div>
      {max !== Infinity && (
        <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
          <div
            className={`h-full rounded-full transition-all ${
              atLimit ? "bg-amber-400" : nearLimit ? "bg-cyan-400" : "bg-emerald-400"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

function FeatureBadge({ enabled, label }: { enabled: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-medium ${
        enabled ? "bg-emerald-500/10 text-emerald-300" : "bg-white/5 text-muted-foreground"
      }`}
    >
      {enabled ? <Check className="size-3" /> : <X className="size-3" />}
      {label}
    </span>
  );
}

export default function Admin() {
  const plan = useQuery(api.optimized.getPlan);
  const planInfo = useQuery(api.optimized.effectivePlan);
  const usage = useQuery(api.optimized.planUsage);
  const team = useQuery(api.optimized.listTeamMembers);
  const guardedCheckout = useMutation(api.planEnforcement.guardedCheckout);
  const startFree = useMutation(api.freePlan.startFree);
  const inviteMember = useMutation(api.proofrail.inviteMember);
  const resetWorkspace = useMutation(api.proofrail.resetWorkspace);

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [planChoice, setPlanChoice] = useState<PlanKey>("annual");
  const [seats, setSeats] = useState(5);
  const [checkoutBusy, setCheckoutBusy] = useState(false);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("engineer");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);

  const handleResetWorkspace = async () => {
    setResetBusy(true);
    try {
      await resetWorkspace();
      toast.success("Workspace reset", {
        description: "All mock workflows, scenarios, policies, releases, and traces have been cleared to 0.",
      });
    } catch (err) {
      toast.error("Reset failed", {
        description: err instanceof Error ? err.message : "Could not reset workspace.",
      });
    } finally {
      setResetBusy(false);
    }
  };

  const currentPlanName = planInfo?.name ?? "free";
  const currentTierLevel = TIER_ORDER.indexOf(currentPlanName);

  const handleCheckout = async () => {
    if (planInfo?.isGuest && planChoice !== "free") {
      toast.error("Guest restriction", {
        description: "Guests are restricted to the Free plan. Please sign in with an email to upgrade.",
      });
      return;
    }
    setCheckoutBusy(true);
    try {
      if (planChoice === "free") {
        await startFree();
        toast.success("Free tier active", {
          description: "One workflow under governance, full release gate, no evidence exports.",
        });
      } else {
        await guardedCheckout({ plan: planChoice, seats });
        const price = PLAN_PRICES[planChoice];
        toast.success("Checkout complete", {
          description: `${price.label} active at $${price.amount.toLocaleString()} for ${Math.max(1, seats)} seat${seats === 1 ? "" : "s"}.`,
        });
      }
      setCheckoutOpen(false);
    } catch (err) {
      toast.error("Checkout failed", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setCheckoutBusy(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteName.trim() || !inviteEmail.trim()) {
      toast.error("Missing fields", { description: "Name and email are required." });
      return;
    }
    if (usage && usage.limits.maxTeamMembers !== Infinity && usage.usage.teamMembers >= usage.limits.maxTeamMembers) {
      toast.error("Team limit reached", {
        description: `Your ${usage.plan} plan allows ${usage.limits.maxTeamMembers} members. Upgrade to invite more.`,
      });
      return;
    }
    setInviteBusy(true);
    try {
      await inviteMember({
        name: inviteName.trim(),
        email: inviteEmail.trim(),
        role: inviteRole as "admin" | "compliance" | "engineer" | "auditor",
      });
      toast.success("Invitation sent", { description: `${inviteName.trim()} will appear once they accept.` });
      setInviteOpen(false);
      setInviteName("");
      setInviteEmail("");
    } catch (err) {
      toast.error("Could not invite", { description: err instanceof Error ? err.message : "Try again." });
    } finally {
      setInviteBusy(false);
    }
  };

  if (plan === undefined || planInfo === undefined || usage === undefined || team === undefined) {
    return (
      <div className="mx-auto max-w-6xl space-y-4">
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    );
  }

  const price = plan ? PLAN_PRICES[plan.name] : null;
  const atTeamLimit = usage.limits.maxTeamMembers !== Infinity && usage.usage.teamMembers >= usage.limits.maxTeamMembers;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[13px] font-medium text-muted-foreground">Workspace administration</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Admin</h1>
          <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
            Manage your plan, the people who can sign off on releases, and the systems Proofrail reads from.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="cursor-pointer rounded-full border-rose-500/30 text-rose-300 hover:bg-rose-500/10"
          onClick={handleResetWorkspace}
          disabled={resetBusy}
        >
          {resetBusy ? <Loader2 className="size-3.5 mr-1 animate-spin" /> : <Trash2 className="size-3.5 mr-1" />}
          Clear Workspace Data (Reset to 0)
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Plan & billing */}
        <section className="glass-panel p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-300">
              <CreditCard className="size-5" />
            </span>
            <div>
              <h2 className="text-[15px] font-semibold tracking-tight">Plan &amp; billing</h2>
              <p className="text-[11px] text-muted-foreground">Your commercial agreement, seats, and renewal</p>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
            {plan && price ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[14px] font-semibold tracking-tight">{price.label}</p>
                  <p className="mt-0.5 font-mono text-[12px] text-muted-foreground">
                    {plan.name === "free"
                      ? "$0 · up to 3 engineers"
                      : `$${price.amount.toLocaleString()} · ${plan.seats} seat${plan.seats === 1 ? "" : "s"}`}
                    {" · "}
                    {new Date(plan.startedAt).toLocaleDateString(undefined, { month: "short", year: "numeric" })}
                  </p>
                </div>
                <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
                  <BadgeCheck className="size-3.5" /> Active
                </span>
              </div>
            ) : (
              <p className="text-[12.5px] text-muted-foreground">No plan on record yet — start checkout to activate one.</p>
            )}
          </div>

          {/* Usage bars */}
          <div className="mt-4 space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-[12px] font-semibold tracking-tight">Resource usage</p>
            <UsageBar current={usage.usage.workflows} max={usage.limits.maxWorkflows} label="Workflows" />
            <UsageBar current={usage.usage.teamMembers} max={usage.limits.maxTeamMembers} label="Team members" />
            <UsageBar current={usage.usage.scenarios} max={usage.limits.maxScenarios} label="Scenarios" />
            <UsageBar current={usage.usage.policies} max={usage.limits.maxPolicies} label="Policies" />
            <UsageBar current={usage.usage.traces} max={usage.limits.maxTraces} label="Traces" />
          </div>

          {/* Feature badges */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            <FeatureBadge enabled={usage.features.traceImport} label="Trace import" />
            <FeatureBadge enabled={usage.features.releaseCreation} label="Release gates" />
            <FeatureBadge enabled={usage.features.evidenceExport} label="Evidence packets" />
            <FeatureBadge enabled={usage.features.complianceReviews} label="Compliance reviews" />
          </div>

          <Button className="mt-4 w-full cursor-pointer rounded-full" onClick={() => setCheckoutOpen(true)}>
            <CreditCard className="size-4" />
            {currentPlanName === "free" ? "Upgrade plan" : currentTierLevel < 2 ? "Upgrade to annual" : "Manage plan"}
          </Button>
          <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
            {currentPlanName === "free"
              ? "Engineers start free on one workflow — the full gate, no compliance exports. Upgrade when you need evidence packets."
              : currentPlanName === "pilot"
                ? "Your pilot runs six weeks. Upgrade to annual for unlimited workflows and priority support."
                : "You have full platform access. Contact sales for multi-workflow deployments."}
          </p>
        </section>

        {/* Team */}
        <section className="glass-panel p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
                <Users className="size-5" />
              </span>
              <div>
                <h2 className="text-[15px] font-semibold tracking-tight">Team</h2>
                <p className="text-[11px] text-muted-foreground">
                  {team.filter((m) => m.status === "active").length} active ·{" "}
                  {team.filter((m) => m.status === "pending").length} pending
                  {usage.limits.maxTeamMembers !== Infinity ? ` · ${usage.usage.teamMembers}/${usage.limits.maxTeamMembers}` : ""}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="cursor-pointer rounded-full"
              onClick={() => setInviteOpen(true)}
              disabled={atTeamLimit}
            >
              <UserPlus className="size-3.5" /> Invite
            </Button>
          </div>

          <div className="mt-4 space-y-2">
            {team.map((m) => (
              <div key={m._id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 font-mono text-[11px] font-semibold text-cyan-300">
                  {m.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-semibold tracking-tight">{m.name}</p>
                  <p className="truncate font-mono text-[10.5px] text-muted-foreground">{m.email}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <TeamRoleBadge role={m.role} />
                  {m.status === "pending" && (
                    <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">Pending</span>
                  )}
                </div>
              </div>
            ))}
            {team.length === 0 && (
              <p className="rounded-xl border border-dashed border-border p-5 text-center text-[12.5px] text-muted-foreground">
                No members yet — invite your compliance owner first.
              </p>
            )}
          </div>
        </section>
      </div>

      {/* Integrations */}
      <section className="glass-panel p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-300">
            <Globe className="size-5" />
          </span>
          <div>
            <h2 className="text-[15px] font-semibold tracking-tight">Integrations</h2>
            <p className="text-[11px] text-muted-foreground">Trace sources and governance hooks</p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {integrations.map((i) => (
            <div key={i.name} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3.5 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-semibold tracking-tight">{i.name}</p>
                <p className="truncate font-mono text-[10.5px] text-muted-foreground">{i.detail}</p>
              </div>
              {i.status === "connected" ? (
                <span className="flex shrink-0 items-center gap-1 text-[11px] font-semibold text-emerald-300">
                  <Check className="size-3.5" /> Connected
                </span>
              ) : (
                <Button
                  variant="outline" size="sm"
                  className="h-7 shrink-0 cursor-pointer rounded-full px-2.5 text-[11px]"
                  onClick={() => toast("Coming soon", { description: `${i.name} setup is on the roadmap.` })}
                >
                  Connect
                </Button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Checkout dialog — upgrade only */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="bg-background/95 backdrop-blur-xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {currentPlanName === "free" ? "Upgrade plan" : currentTierLevel < 2 ? "Upgrade to annual" : "Plan details"}
            </DialogTitle>
            <DialogDescription>
              {currentPlanName === "free"
                ? "Upgrade to unlock multiple workflows, evidence packets, and compliance reviews."
                : currentTierLevel < 2
                  ? "Annual contracts include unlimited workflows, full platform access, and priority support."
                  : "You have the highest tier. Contact sales for custom deployments."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {currentPlanName === "free" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {(["pilot", "annual"] as const).map((key) => {
                  const p = PLAN_PRICES[key];
                  const selected = planChoice === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setPlanChoice(key)}
                      className={`rounded-xl border p-3.5 text-left transition-colors cursor-pointer ${
                        selected ? "border-cyan-400/40 bg-cyan-400/10 ring-1 ring-cyan-400/25" : "border-white/10 bg-white/5 hover:bg-white/10"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-[12.5px] font-semibold tracking-tight">{p.label}</p>
                        {selected && <Check className="size-4 shrink-0 text-cyan-300" />}
                      </div>
                      <p className="mt-2 font-mono text-xl font-bold tracking-tight">
                        ${p.amount.toLocaleString()}
                        {key === "annual" && <span className="text-[11px] font-medium text-muted-foreground">/yr</span>}
                      </p>
                      <p className="mt-1 text-[10.5px] leading-snug text-muted-foreground">
                        {key === "pilot" ? "Six weeks, three workflows, evidence packets" : "Unlimited workflows, full access, priority support"}
                      </p>
                    </button>
                  );
                })}
              </div>
            ) : currentTierLevel < 2 ? (
              <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-4">
                <div className="flex items-center gap-2">
                  <Check className="size-4 text-cyan-300" />
                  <p className="text-[13px] font-semibold text-cyan-300">Annual contract</p>
                </div>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  Unlimited workflows, unlimited team members, evidence packets, compliance reviews, and priority support.
                </p>
                <p className="mt-2 font-mono text-xl font-bold tracking-tight text-cyan-300">$36,000/yr</p>
              </div>
            ) : (
              <p className="text-[12px] text-muted-foreground">You are on the highest available tier.</p>
            )}

            {planChoice !== "free" && currentPlanName === "free" && (
              <div className="space-y-1.5">
                <Label className="text-[12px] font-medium">Seats</Label>
                <Input type="number" min={1} max={50} value={seats} onChange={(e) => setSeats(Number(e.target.value) || 1)} className="font-mono" />
                <p className="text-[10.5px] text-muted-foreground">Reviewers, compliance owners, and auditors who need workspace access.</p>
              </div>
            )}

            {currentPlanName === "free" && (
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-[12px]">
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground">
                    {planChoice === "free" ? "Free engineering tier" : `${PLAN_PRICES[planChoice].label} · ${Math.max(1, seats)} seat${seats === 1 ? "" : "s"}`}
                  </p>
                  <p className="font-mono font-semibold">${PLAN_PRICES[planChoice].amount.toLocaleString()}</p>
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-2">
                  <p className="font-semibold">Total</p>
                  <p className="font-mono text-[14px] font-bold text-cyan-300">${PLAN_PRICES[planChoice].amount.toLocaleString()}</p>
                </div>
              </div>
            )}

            {currentPlanName !== "free" && (
              <p className="text-[11px] text-muted-foreground">Contact sales@proofrail.com to change your plan or add custom workflows.</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" className="cursor-pointer rounded-full" onClick={() => setCheckoutOpen(false)}>
              {currentPlanName === "free" ? "Cancel" : "Close"}
            </Button>
            {currentPlanName === "free" && (
              <Button className="cursor-pointer rounded-full" disabled={checkoutBusy} onClick={handleCheckout}>
                {checkoutBusy ? <Loader2 className="size-4 animate-spin" /> : <CreditCard className="size-4" />}
                {planChoice === "free" ? "Activate free plan" : "Complete upgrade"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="bg-background/95 backdrop-blur-xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Invite a team member</DialogTitle>
            <DialogDescription>Choose a role: compliance owners sign off on gates, engineers run releases, auditors review evidence.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {atTeamLimit && (
              <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-[12px] text-amber-300">
                <p className="font-semibold">Team limit reached</p>
                <p className="mt-0.5 text-muted-foreground">Your plan allows {usage.limits.maxTeamMembers} members. Upgrade to invite more.</p>
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-[12px] font-medium">Full name</Label>
                <Input value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="Jordan Reyes" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px] font-medium">Email</Label>
                <Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="jordan@company.com" className="font-mono" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] font-medium">Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="compliance">Compliance owner</SelectItem>
                  <SelectItem value="engineer">Engineer</SelectItem>
                  <SelectItem value="auditor">Auditor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="cursor-pointer rounded-full" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button className="cursor-pointer rounded-full" disabled={inviteBusy || atTeamLimit} onClick={handleInvite}>
              {inviteBusy ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
              Send invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
