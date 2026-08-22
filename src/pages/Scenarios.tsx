import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Archive,
  ChevronDown,
  ClipboardCheck,
  Eye,
  EyeOff,
  FilePlus2,
  Loader2,
  ScrollText,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  ScenarioStatusBadge,
  SeverityBadge,
} from "@/components/proofrail/StatusBadge";
import { StepTimeline, type StepKind } from "@/components/proofrail/StepTimeline";

type ParsedStep = { kind: StepKind; label: string; detail: string };

const SAMPLE_TRACE = `{
  "traceId": "otlp-sample-77d9",
  "name": "Renewal review — Meridian renewal",
  "input": "Meridian (meridian-ops@corp.com, +1 415 555 0132) requests a 12-month renewal at +11% with two amended exhibits.",
  "output": "Renewal draft generated; execution held for approval.",
  "spans": [
    { "name": "retrieve.playbook", "attributes": { "kind": "retrieval", "detail": "Retrieved 4 clauses: pricing authority, exhibits, auto-renewal, notice." } },
    { "name": "call.redline_generator", "attributes": { "kind": "tool", "detail": "Generated redline with amended exhibits." } },
    { "name": "check.spend_cap", "attributes": { "kind": "approval", "detail": "Evaluated: +11% on $41k exceeds $50k threshold? No — approved." } },
    { "name": "act.hold_for_review", "attributes": { "kind": "action", "detail": "Draft held in review queue; no signature requested." } }
  ]
}`;

/**
 * Sensitive-field patterns scanned on import. Matches are replaced with
 * [pattern] markers in the browser before anything is sent to the backend, so
 * the raw values never reach Convex. The applied keys are stored on the
 * scenario so the evidence record proves what was masked.
 */
const REDACTION_PATTERNS: {
  key: string;
  label: string;
  hint: string;
  source: string;
}[] = [
  {
    key: "email",
    label: "Email addresses",
    hint: "person@company.com",
    source: "[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}",
  },
  {
    key: "phone",
    label: "Phone numbers",
    hint: "+1 (415) 555-0132",
    source: "(?:\\+?\\d{1,3}[\\s.-]?)?(?:\\(\\d{2,4}\\)|\\d{2,4})[\\s.-]?\\d{3,4}[\\s.-]?\\d{3,4}",
  },
  {
    key: "ssn",
    label: "Social Security numbers",
    hint: "123-45-6789",
    source: "\\b\\d{3}-\\d{2}-\\d{4}\\b",
  },
  {
    key: "card",
    label: "Card numbers",
    hint: "4111 1111 1111 1111",
    source: "\\b(?:\\d[ -]*?){13,19}\\b",
  },
  {
    key: "dob",
    label: "Dates of birth",
    hint: "1985-04-12",
    source: "\\b\\d{4}[-/]\\d{1,2}[-/]\\d{1,2}\\b",
  },
  {
    key: "mrn",
    label: "Medical record numbers",
    hint: "MRN-0034821",
    source: "\\b(?:MRN|mrn)[-_]?\\d{4,}\\b",
  },
  {
    key: "account",
    label: "Account numbers",
    hint: "acct 88410293",
    source: "\\b(?:acct|account)[\\s:#-]*\\d{6,}\\b",
  },
  {
    key: "taxid",
    label: "Tax IDs (EIN)",
    hint: "12-3456789",
    source: "\\b\\d{2}-\\d{7}\\b",
  },
];

const REDACTION_LABEL: Record<string, string> = Object.fromEntries(
  REDACTION_PATTERNS.map((p) => [p.key, p.label]),
);

function parseTraceJson(raw: string): {
  traceId: string;
  title: string;
  steps: ParsedStep[];
} | null {
  try {
    const obj = JSON.parse(raw);
    if (typeof obj !== "object" || obj === null) return null;

    const traceId = String(obj.traceId ?? `trace-${Date.now().toString(36)}`);
    const title = String(obj.name ?? obj.title ?? obj.traceId ?? "Untitled trace");

    if (Array.isArray(obj.steps)) {
      const steps: ParsedStep[] = obj.steps.map((s: Record<string, unknown>) => {
        const rawKind = String(s.kind ?? "action");
        const kind = (
          ["input", "retrieval", "tool", "approval", "action", "output"].includes(rawKind)
            ? rawKind
            : "action"
        ) as StepKind;
        return {
          kind,
          label: String(s.label ?? s.name ?? "Step"),
          detail: String(s.detail ?? ""),
        };
      });
      if (steps.length === 0) return null;
      return { traceId, title, steps };
    }

    if (Array.isArray(obj.spans)) {
      const steps: ParsedStep[] = obj.spans.map((s: Record<string, unknown>) => {
        const attrs = (s.attributes ?? {}) as Record<string, unknown>;
        const name = String(s.name ?? "Step");
        const rawKind = String(attrs.kind ?? "");
        let kind: StepKind = "action";
        if (["input", "retrieval", "tool", "approval", "action", "output"].includes(rawKind)) {
          kind = rawKind as StepKind;
        } else if (/retriev|search|lookup|fetch/i.test(name)) kind = "retrieval";
        else if (/call\.|tool|execute|push|generate|propos/i.test(name)) kind = "tool";
        else if (/approv|check|flag|review/i.test(name)) kind = "approval";
        else if (/act\.|hold|save|record/i.test(name)) kind = "action";
        else if (/send|respond|output|deliver|notify/i.test(name)) kind = "output";
        return {
          kind,
          label: name,
          detail: String(attrs.detail ?? ""),
        };
      });
      if (steps.length === 0) return null;
      return { traceId, title, steps };
    }
    return null;
  } catch {
    return null;
  }
}

export default function Scenarios() {
  const scenarios = useQuery(api.optimized.listScenarios, {});
  const workflows = useQuery(api.optimized.listWorkflows);
  const importTrace = useMutation(api.traceImport.importTrace);
  const reviewScenario = useMutation(api.proofrail.reviewScenario);

  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [raw, setRaw] = useState("");
  const [wfId, setWfId] = useState("");
  const [title, setTitle] = useState("");
  const [traceId, setTraceId] = useState("");
  const [riskyIndex, setRiskyIndex] = useState(1);
  const [severity, setSeverity] = useState("high");
  const [enabledRedactions, setEnabledRedactions] = useState<string[]>([]);
  const [reviewing, setReviewing] = useState<{
    id: string;
    title: string;
    note: string;
  } | null>(null);
  const [reviewBusy, setReviewBusy] = useState(false);

  /** Patterns with at least one match in the pasted trace. */
  const detected = useMemo(() => {
    if (!raw.trim()) return [];
    return REDACTION_PATTERNS.map((p) => {
      const count = (raw.match(new RegExp(p.source, "g")) ?? []).length;
      return { pattern: p, count };
    }).filter((d) => d.count > 0);
  }, [raw]);

  // Fresh paste → everything detected is masked by default. The reviewer can
  // toggle individual patterns off if a match is a false positive.
  useEffect(() => {
    setEnabledRedactions(detected.map((d) => d.pattern.key));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raw]);

  /** The trace with enabled patterns masked — this is what actually gets sent. */
  const maskedRaw = useMemo(() => {
    if (!raw.trim()) return "";
    let masked = raw;
    for (const p of REDACTION_PATTERNS) {
      if (!enabledRedactions.includes(p.key)) continue;
      masked = masked.replace(new RegExp(p.source, "g"), `[${p.key}]`);
    }
    return masked;
  }, [raw, enabledRedactions]);

  const parsed = useMemo(
    () => (maskedRaw.trim() ? parseTraceJson(maskedRaw) : null),
    [maskedRaw],
  );

  const toggleRedaction = (key: string) => {
    setEnabledRedactions((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const filtered = useMemo(() => {
    if (!scenarios) return [];
    const q = query.trim().toLowerCase();
    return scenarios.filter((s) => {
      const matchesTab = tab === "all" || s.status === tab;
      if (!matchesTab) return false;
      if (!q) return true;
      return (
        s.title.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.riskyDecision.toLowerCase().includes(q) ||
        s.workflowName.toLowerCase().includes(q)
      );
    });
  }, [scenarios, tab, query]);

  const handleImport = async () => {
    if (!parsed || !wfId) return;
    setImporting(true);
    try {
      await importTrace({
        workflowId: wfId as never,
        traceId: traceId || parsed.traceId,
        title: title || parsed.title,
        source: "OpenTelemetry",
        capturedAt: Date.now(),
        steps: parsed.steps,
        riskyDecision: parsed.steps[riskyIndex]
          ? `${parsed.steps[riskyIndex].label} — ${parsed.steps[riskyIndex].detail}`
          : parsed.steps[0]?.label ?? "Trace captured",
        severity: severity as "low" | "medium" | "high" | "critical",
        redactedFields: enabledRedactions,
      });
      toast.success("Trace converted to scenario", {
        description:
          enabledRedactions.length > 0
            ? `Draft created — ${enabledRedactions.length} sensitive pattern${
                enabledRedactions.length === 1 ? "" : "s"
              } masked before upload.`
            : "Draft scenario created — no sensitive patterns detected.",
      });
      setImportOpen(false);
      setRaw("");
      setTitle("");
      setTraceId("");
      setWfId("");
      setRiskyIndex(1);
      setEnabledRedactions([]);
    } catch (err) {
      console.error(err);
      toast.error("Import failed", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setImporting(false);
    }
  };

  const handleReview = async (status: "reviewed" | "active" | "archived") => {
    if (!reviewing) return;
    setReviewBusy(true);
    try {
      await reviewScenario({
        scenarioId: reviewing.id as never,
        status,
        note: reviewing.note,
      });
      toast.success(
        status === "active"
          ? "Scenario added to the acceptance suite"
          : status === "reviewed"
            ? "Scenario reviewed"
            : "Scenario archived",
      );
      setReviewing(null);
    } catch (err) {
      console.error(err);
      toast.error("Could not update scenario");
    } finally {
      setReviewBusy(false);
    }
  };

  if (scenarios === undefined || workflows === undefined) {
    return (
      <div className="mx-auto max-w-6xl space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[13px] font-medium text-muted-foreground">
            Trace-to-scenario capture
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            Scenarios
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
            Import a production trace, redact sensitive fields in the browser,
            and select the risky decision worth guarding. Each trace becomes a
            reusable regression scenario.
          </p>
        </div>
        <Button className="cursor-pointer rounded-full" onClick={() => setImportOpen(true)}>
          <FilePlus2 className="size-4" />
          Import trace
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="glass-chip rounded-full">
            <TabsTrigger value="all" className="rounded-full">
              All ({scenarios.length})
            </TabsTrigger>
            <TabsTrigger value="draft" className="rounded-full">
              Draft
            </TabsTrigger>
            <TabsTrigger value="reviewed" className="rounded-full">
              Reviewed
            </TabsTrigger>
            <TabsTrigger value="active" className="rounded-full">
              In suite
            </TabsTrigger>
            <TabsTrigger value="archived" className="rounded-full">
              Archived
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search scenarios…"
            className="h-10 rounded-full pl-9"
          />
        </div>
      </div>

      <div className="space-y-4">
        {filtered.length === 0 && (
          <div className="glass-panel p-10 text-center">
            <p className="text-sm font-medium">No scenarios here yet</p>
            <p className="mx-auto mt-1 max-w-sm text-[12.5px] text-muted-foreground">
              {query
                ? "Nothing matches that search — try a different term."
                : "Import a production trace to convert it into a draft scenario."}
            </p>
          </div>
        )}
        {filtered.map((sc) => (
          <ScenarioCard
            key={sc._id}
            scenario={sc}
            onReview={() =>
              setReviewing({ id: sc._id, title: sc.title, note: sc.reviewNote ?? "" })
            }
          />
        ))}
      </div>

      {/* Import trace dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto bg-background/95 backdrop-blur-xl sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Import a production trace</DialogTitle>
            <DialogDescription>
              Paste an OpenTelemetry export or load the sample. Sensitive values
              are masked in your browser before anything is sent.
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
                <Label className="text-[12px] font-medium">Trace ID (optional)</Label>
                <Input
                  value={traceId}
                  onChange={(e) => setTraceId(e.target.value)}
                  placeholder="otlp-8f21c3a9"
                  className="font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[12px] font-medium">Trace JSON</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 cursor-pointer rounded-full text-[11px] text-cyan-300"
                  onClick={() => setRaw(SAMPLE_TRACE)}
                >
                  <Sparkles className="size-3" />
                  Load sample trace
                </Button>
              </div>
              <Textarea
                value={raw}
                onChange={(e) => setRaw(e.target.value)}
                placeholder='{ "traceId": "...", "name": "...", "spans": [...] }'
                className="min-h-36 font-mono text-[11.5px]"
              />
            </div>

            {detected.length > 0 && (
              <div className="space-y-2.5 rounded-xl border border-amber-400/25 bg-amber-400/10 p-4 ring-1 ring-amber-400/15">
                <div className="flex items-center gap-2">
                  <EyeOff className="size-4 text-amber-300" />
                  <p className="text-[12.5px] font-semibold text-amber-200">
                    Sensitive data detected — masked before upload
                  </p>
                </div>
                <p className="text-[11.5px] leading-relaxed text-muted-foreground">
                  These patterns match values in the trace. Matched values are
                  replaced with{" "}
                  <span className="font-mono text-[10.5px]">[pattern]</span>{" "}
                  markers in your browser; the originals are never transmitted or
                  stored. Toggle a pattern off if the match is a false positive.
                </p>
                <div className="flex flex-wrap gap-2">
                  {detected.map((d) => {
                    const on = enabledRedactions.includes(d.pattern.key);
                    return (
                      <button
                        key={d.pattern.key}
                        type="button"
                        onClick={() => toggleRedaction(d.pattern.key)}
                        className={cn(
                          "cursor-pointer rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                          on
                            ? "border-amber-400/40 bg-amber-400/15 text-amber-200"
                            : "border-white/10 bg-white/5 text-muted-foreground",
                        )}
                      >
                        {on ? "✓ " : ""}
                        {d.pattern.label} · {d.count}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10.5px] text-muted-foreground">
                  {enabledRedactions.length} pattern
                  {enabledRedactions.length === 1 ? "" : "s"} active — the trace
                  below is parsed from the masked copy.
                </p>
              </div>
            )}

            {parsed ? (
              <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="space-y-1.5">
                  <Label className="text-[12px] font-medium">Scenario title</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={parsed.title}
                  />
                </div>
                <p className="text-[11.5px] text-muted-foreground">
                  Parsed {parsed.steps.length} steps from{" "}
                  <span className="font-mono">{parsed.traceId}</span>. Select the
                  step that carries the risk:
                </p>
                <Select
                  value={String(riskyIndex)}
                  onValueChange={(v) => setRiskyIndex(Number(v))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {parsed.steps.map((s, i) => (
                      <SelectItem key={i} value={String(i)}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="space-y-1.5">
                  <Label className="text-[12px] font-medium">Severity</Label>
                  <Select value={severity} onValueChange={setSeverity}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              raw.trim() !== "" && (
                <p className="text-[12px] text-rose-300">
                  Couldn't parse that JSON — try the sample trace.
                </p>
              )
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              className="cursor-pointer rounded-full"
              onClick={() => setImportOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="cursor-pointer rounded-full"
              disabled={!parsed || !wfId || importing}
              onClick={handleImport}
            >
              {importing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <FilePlus2 className="size-4" />
              )}
              Convert to scenario
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review dialog */}
      <Dialog open={reviewing !== null} onOpenChange={(o) => !o && setReviewing(null)}>
        <DialogContent className="bg-background/95 backdrop-blur-xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Review scenario</DialogTitle>
            <DialogDescription>
              {reviewing?.title} — confirm the risky decision and the trace it was
              captured from, then sign off.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label className="text-[12px] font-medium">Review note (optional)</Label>
            <Textarea
              value={reviewing?.note ?? ""}
              onChange={(e) =>
                setReviewing((r) => (r ? { ...r, note: e.target.value } : r))
              }
              placeholder="e.g. Confirmed against run log; matches the Q3 incident."
              className="min-h-24"
            />
          </div>
          <DialogFooter className="flex-wrap gap-2">
            <Button
              variant="ghost"
              className="cursor-pointer rounded-full text-muted-foreground"
              disabled={reviewBusy}
              onClick={() => handleReview("archived")}
            >
              <Archive className="size-4" />
              Archive
            </Button>
            <Button
              variant="outline"
              className="cursor-pointer rounded-full"
              disabled={reviewBusy}
              onClick={() => handleReview("reviewed")}
            >
              <ClipboardCheck className="size-4" />
              Mark reviewed
            </Button>
            <Button
              className="cursor-pointer rounded-full"
              disabled={reviewBusy}
              onClick={() => handleReview("active")}
            >
              {reviewBusy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ShieldCheck className="size-4" />
              )}
              Add to acceptance suite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ScenarioCard({
  scenario,
  onReview,
}: {
  scenario: {
    _id: string;
    title: string;
    description: string;
    workflowName: string;
    severity: string;
    status: string;
    riskyDecision: string;
    steps: { kind: StepKind; label: string; detail: string }[];
    reviewedBy?: string;
    redactedFields?: string[];
    createdAt: number;
  };
  onReview: () => void;
}) {
  const [open, setOpen] = useState(false);
  const riskyStepIndex = scenario.steps.findIndex((s) =>
    scenario.riskyDecision.startsWith(s.label),
  );
  return (
    <article className="glass-panel p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[15px] font-semibold tracking-tight">{scenario.title}</h2>
            <SeverityBadge severity={scenario.severity} />
            <ScenarioStatusBadge status={scenario.status} />
          </div>
          <p className="mt-1.5 max-w-2xl text-[12.5px] leading-relaxed text-muted-foreground">
            {scenario.description}
          </p>
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <ScrollText className="size-3.5 text-cyan-300" />
              {scenario.workflowName}
            </span>
            <span className="flex items-center gap-1.5">
              <Eye className="size-3.5 text-cyan-300" />
              Risky: {scenario.riskyDecision}
            </span>
            {scenario.redactedFields && scenario.redactedFields.length > 0 && (
              <span className="flex items-center gap-1.5" title="Masked client-side before upload; originals never stored">
                <EyeOff className="size-3.5 text-amber-300" />
                Redacted:{" "}
                {scenario.redactedFields
                  .map((k) => REDACTION_LABEL[k] ?? k)
                  .join(", ")}
              </span>
            )}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 cursor-pointer rounded-full"
          onClick={onReview}
          disabled={scenario.status === "archived"}
        >
          Review
        </Button>
      </div>

      <Collapsible open={open} onOpenChange={setOpen} className="mt-4">
        <CollapsibleTrigger asChild>
          <button className="flex cursor-pointer items-center gap-1.5 text-[12px] font-medium text-cyan-300">
            <ChevronDown
              className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`}
            />
            {open ? "Hide trace steps" : "Show trace steps"}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="border-transparent bg-white/5 font-mono text-[10.5px] text-muted-foreground"
              >
                source_trace · converted
              </Badge>
              {scenario.redactedFields && scenario.redactedFields.length > 0 && (
                <Badge
                  variant="outline"
                  className="border-transparent bg-white/5 font-mono text-[10.5px] text-muted-foreground"
                >
                  redaction_policy · {scenario.redactedFields.join(", ")}
                </Badge>
              )}
              {scenario.reviewedBy && (
                <Badge
                  variant="outline"
                  className="border-transparent bg-white/5 text-[10.5px] text-muted-foreground"
                >
                  Reviewed by {scenario.reviewedBy}
                </Badge>
              )}
            </div>
            <StepTimeline
              steps={scenario.steps}
              riskyIndex={riskyStepIndex >= 0 ? riskyStepIndex : undefined}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </article>
  );
}
