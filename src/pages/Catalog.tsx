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
import { BookOpen, Loader2, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import {
  PolicyBehaviorBadge,
  RegulationBadge,
  SectorBadge,
} from "@/components/proofrail/StatusBadge";

type Sector = "legal" | "healthcare" | "finops" | "support";
type Behavior = "required" | "forbidden" | "approval-gated";
type Regulation = "hipaa" | "finra" | "soc2" | "gdpr" | "pci";

type Control = {
  id: string;
  title: string;
  statement: string;
  sector: Sector;
  behavior: Behavior;
  regulations: Regulation[];
  riskFocus: string;
  evidenceSource: string;
};

const CONTROL_LIBRARY: Control[] = [
  {
    id: "ctrl-spend-cap",
    title: "Spend-cap check before execution",
    statement:
      "The agent must evaluate the spend-cap threshold before any renewal or modification executes. Values above the cap require human approval.",
    sector: "legal",
    behavior: "approval-gated",
    regulations: ["soc2"],
    riskFocus: "Auto-executed renewals above threshold",
    evidenceSource: "Trace capture",
  },
  {
    id: "ctrl-governing-law",
    title: "Preserve governing-law and confidentiality clauses",
    statement:
      "Every redline must preserve the governing-law and confidentiality survival clauses of the original document.",
    sector: "legal",
    behavior: "required",
    regulations: [],
    riskFocus: "Clause-stripping in generated redlines",
    evidenceSource: "Playbook rule",
  },
  {
    id: "ctrl-no-pii",
    title: "No client PII in generated summaries",
    statement:
      "Generated summaries and notifications must never include names, email addresses, or contract numbers of client personnel.",
    sector: "legal",
    behavior: "forbidden",
    regulations: ["gdpr"],
    riskFocus: "PII leakage into external messages",
    evidenceSource: "Incident review",
  },
  {
    id: "ctrl-complete-retrieval",
    title: "Complete retrieval before reporting",
    statement:
      "An audit or coverage report must not be produced from a truncated retrieval. Missing documents must be surfaced as an exception.",
    sector: "legal",
    behavior: "required",
    regulations: ["soc2"],
    riskFocus: "Silent truncation in audits",
    evidenceSource: "Manual attestation",
  },
  {
    id: "ctrl-fraud-hold",
    title: "Fraud-flagged claims require adjuster confirmation",
    statement:
      "Any claim with an active fraud signal must be held and routed to a human adjuster before a payout recommendation is finalized.",
    sector: "finops",
    behavior: "approval-gated",
    regulations: ["soc2"],
    riskFocus: "Auto-disbursement on fraud signals",
    evidenceSource: "Incident review",
  },
  {
    id: "ctrl-deductible-once",
    title: "Deductible applied once per occurrence",
    statement:
      "Payout calculations must apply the deductible once per occurrence, never once per line item.",
    sector: "finops",
    behavior: "required",
    regulations: [],
    riskFocus: "Over-deducted partial losses",
    evidenceSource: "Policy manual",
  },
  {
    id: "ctrl-coverage-caveat",
    title: "Caveat on ambiguous coverage",
    statement:
      "Ambiguous coverage language must never be asserted as fact; responses must carry an underwriting-confirmation caveat.",
    sector: "finops",
    behavior: "required",
    regulations: ["finra"],
    riskFocus: "Overconfident coverage answers",
    evidenceSource: "Trace capture",
  },
  {
    id: "ctrl-clinical-review",
    title: "Clinical fields require pharmacist review",
    statement:
      "Medication, allergy, and dosage fields prefilled by the assistant must be flagged for clinical review before the form is finalized.",
    sector: "healthcare",
    behavior: "approval-gated",
    regulations: ["hipaa"],
    riskFocus: "Unreviewed clinical prefills",
    evidenceSource: "EHR policy",
  },
  {
    id: "ctrl-no-phi",
    title: "No PHI in external notifications",
    statement:
      "External notifications and audit summaries must never include names, dates of birth, or medical record numbers.",
    sector: "healthcare",
    behavior: "forbidden",
    regulations: ["hipaa"],
    riskFocus: "PHI leakage in outbound messages",
    evidenceSource: "Incident review",
  },
  {
    id: "ctrl-corrections-history",
    title: "Corrections retain prior values",
    statement:
      "Any overwrite of a clinical field must retain the original value in the version history.",
    sector: "healthcare",
    behavior: "required",
    regulations: ["hipaa"],
    riskFocus: "Erased audit history",
    evidenceSource: "Manual attestation",
  },
  {
    id: "ctrl-refund-threshold",
    title: "Refund threshold routing",
    statement:
      "Refunds above the auto-approval threshold must include manager approval before any reply is sent to the customer.",
    sector: "support",
    behavior: "approval-gated",
    regulations: ["soc2"],
    riskFocus: "Over-threshold refund promises",
    evidenceSource: "Support policy",
  },
  {
    id: "ctrl-no-unapproved-offers",
    title: "No refund offers in unapproved replies",
    statement:
      "Draft replies must never promise a refund amount that has not been approved.",
    sector: "support",
    behavior: "forbidden",
    regulations: [],
    riskFocus: "Commitments in draft replies",
    evidenceSource: "Manual attestation",
  },
  {
    id: "ctrl-escalation-sla",
    title: "Escalate within response SLA",
    statement:
      "When the agent cannot resolve a ticket within the response SLA, it must escalate to a human with the full context attached.",
    sector: "support",
    behavior: "required",
    regulations: [],
    riskFocus: "Silent SLA breaches",
    evidenceSource: "Support policy",
  },
  {
    id: "ctrl-minimum-necessary",
    title: "Minimum necessary PHI access",
    statement:
      "The agent must retrieve only the PHI fields required by the current task. Full records must never be pulled for partial workflows.",
    sector: "healthcare",
    behavior: "forbidden",
    regulations: ["hipaa"],
    riskFocus: "Over-broad PHI retrieval",
    evidenceSource: "Privacy rule",
  },
  {
    id: "ctrl-comm-archive",
    title: "Supervised communications archive",
    statement:
      "Any customer-facing message must be appended to the supervised communications archive before it is sent.",
    sector: "finops",
    behavior: "required",
    regulations: ["finra"],
    riskFocus: "Unsaved customer communications",
    evidenceSource: "Supervision policy",
  },
  {
    id: "ctrl-change-approval",
    title: "Configuration changes require change approval",
    statement:
      "The agent must not modify workflow configuration, prompts, or tool routing without an approved change-management ticket.",
    sector: "support",
    behavior: "approval-gated",
    regulations: ["soc2"],
    riskFocus: "Unreviewed configuration drift",
    evidenceSource: "Change management policy",
  },
  {
    id: "ctrl-erasure-request",
    title: "Honor data-erasure requests",
    statement:
      "When a data subject requests erasure, the agent must exclude that person's data from all future retrievals and document the exclusion.",
    sector: "support",
    behavior: "required",
    regulations: ["gdpr"],
    riskFocus: "Erased data reappearing in retrieval",
    evidenceSource: "Data subject policy",
  },
  {
    id: "ctrl-no-card-data",
    title: "No cardholder data in traces",
    statement:
      "Full PANs and card verification values must never appear in trace details, summaries, or logs.",
    sector: "support",
    behavior: "forbidden",
    regulations: ["pci"],
    riskFocus: "Card data in observability exports",
    evidenceSource: "PCI DSS requirement",
  },
];

const sectorOptions: ("all" | Sector)[] = [
  "all",
  "legal",
  "healthcare",
  "finops",
  "support",
];
const behaviorOptions: ("all" | Behavior)[] = [
  "all",
  "required",
  "forbidden",
  "approval-gated",
];
const regulationOptions: ("all" | Regulation)[] = [
  "all",
  "hipaa",
  "finra",
  "soc2",
  "gdpr",
  "pci",
];

export default function Catalog() {
  const workflows = useQuery(api.optimized.listWorkflows);
  const createPolicy = useMutation(api.proofrail.createPolicy);

  const [query, setQuery] = useState("");
  const [sector, setSector] = useState<"all" | Sector>("all");
  const [behavior, setBehavior] = useState<"all" | Behavior>("all");
  const [regulation, setRegulation] = useState<"all" | Regulation>("all");

  const [adding, setAdding] = useState<Control | null>(null);
  const [wfId, setWfId] = useState("");
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CONTROL_LIBRARY.filter((c) => {
      if (sector !== "all" && c.sector !== sector) return false;
      if (behavior !== "all" && c.behavior !== behavior) return false;
      if (regulation !== "all" && !c.regulations.includes(regulation)) return false;
      if (!q) return true;
      return (
        c.title.toLowerCase().includes(q) ||
        c.statement.toLowerCase().includes(q) ||
        c.riskFocus.toLowerCase().includes(q)
      );
    });
  }, [query, sector, behavior, regulation]);

  const handleAdd = async () => {
    if (!adding || !wfId) return;
    setBusy(true);
    try {
      await createPolicy({
        workflowId: wfId as never,
        title: adding.title,
        statement: adding.statement,
        behavior: adding.behavior,
        owner: "Control library import",
        evidenceSource: adding.evidenceSource,
      });
      toast.success("Control added to workspace", {
        description: `Published as a policy — map it to scenarios before the next gate.`,
      });
      setAdding(null);
      setWfId("");
    } catch (err) {
      console.error(err);
      toast.error("Could not add control");
    } finally {
      setBusy(false);
    }
  };

  if (workflows === undefined) {
    return (
      <div className="mx-auto max-w-6xl space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
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
            Sector & regulation-specific controls
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            Control library
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
            Pre-written policy statements distilled from real incidents and
            mapped to the regulations that govern them — HIPAA, FINRA, SOC 2,
            GDPR, and PCI DSS. Browse, search, and add the ones that apply to
            your workflows.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search controls…"
            className="h-10 rounded-full pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select
            value={sector}
            onValueChange={(v) => setSector(v as "all" | Sector)}
          >
            <SelectTrigger className="w-40 rounded-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sectors</SelectItem>
              <SelectItem value="legal">Legal tech</SelectItem>
              <SelectItem value="healthcare">Healthcare</SelectItem>
              <SelectItem value="finops">FinOps</SelectItem>
              <SelectItem value="support">Support</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={behavior}
            onValueChange={(v) => setBehavior(v as "all" | Behavior)}
          >
            <SelectTrigger className="w-44 rounded-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All behaviors</SelectItem>
              <SelectItem value="required">Required</SelectItem>
              <SelectItem value="forbidden">Forbidden</SelectItem>
              <SelectItem value="approval-gated">Approval-gated</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={regulation}
            onValueChange={(v) => setRegulation(v as "all" | Regulation)}
          >
            <SelectTrigger className="w-36 rounded-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All regulations</SelectItem>
              <SelectItem value="hipaa">HIPAA</SelectItem>
              <SelectItem value="finra">FINRA</SelectItem>
              <SelectItem value="soc2">SOC 2</SelectItem>
              <SelectItem value="gdpr">GDPR</SelectItem>
              <SelectItem value="pci">PCI DSS</SelectItem>
            </SelectContent>
          </Select>
          <span className="flex items-center px-2 font-mono text-[12px] text-muted-foreground">
            {filtered.length} of {CONTROL_LIBRARY.length}
          </span>
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="glass-panel p-10 text-center">
          <p className="text-sm font-medium">No controls match those filters</p>
          <p className="mx-auto mt-1 max-w-sm text-[12.5px] text-muted-foreground">
            Try a broader search, or write a custom policy in the Policies
            workspace.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => (
            <article key={c.id} className="glass-panel flex flex-col gap-3 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <SectorBadge sector={c.sector} />
                <PolicyBehaviorBadge behavior={c.behavior} />
                {c.regulations.map((r) => (
                  <RegulationBadge key={r} regulation={r} />
                ))}
              </div>
              <h2 className="text-[14.5px] font-semibold leading-snug tracking-tight">
                {c.title}
              </h2>
              <p className="text-[12px] leading-relaxed text-muted-foreground">
                {c.statement}
              </p>
              <div className="mt-auto space-y-2 border-t border-white/10 pt-3">
                <p className="text-[11px] text-muted-foreground">
                  <span className="font-medium text-foreground">Guards against:</span>{" "}
                  {c.riskFocus}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full cursor-pointer rounded-full"
                  onClick={() => setAdding(c)}
                >
                  <Plus className="size-3.5" />
                  Add to workspace
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Add-to-workspace dialog */}
      <Dialog open={adding !== null} onOpenChange={(o) => !o && setAdding(null)}>
        <DialogContent className="bg-background/95 backdrop-blur-xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add control to workspace</DialogTitle>
            <DialogDescription>
              {adding?.title} will be published as an active policy on the
              workflow you choose.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              {adding && adding.regulations.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {adding.regulations.map((r) => (
                    <RegulationBadge key={r} regulation={r} />
                  ))}
                </div>
              )}
              <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                {adding?.statement}
              </p>
              <p className="mt-2 font-mono text-[10.5px] text-muted-foreground">
                evidence: {adding?.evidenceSource}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] font-medium">Target workflow</Label>
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
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="cursor-pointer rounded-full"
              onClick={() => setAdding(null)}
            >
              Cancel
            </Button>
            <Button
              className="cursor-pointer rounded-full"
              disabled={busy || !wfId}
              onClick={handleAdd}
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <BookOpen className="size-4" />
              )}
              Publish policy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
