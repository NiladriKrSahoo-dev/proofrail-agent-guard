import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowUpRight, Lock, Zap } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link } from "react-router";

type LimitKey = "workflows" | "teamMembers" | "scenarios" | "policies" | "traces";

interface PlanGateProps {
  /** Which resource limit to check, or a feature flag name */
  limit?: LimitKey;
  feature?: "evidenceExport" | "complianceReviews" | "traceImport" | "releaseCreation";
  /** The content to render when access is allowed */
  children: ReactNode;
  /** Optional: override the disabled button instead of hiding children */
  disabled?: boolean;
}

const LIMIT_LABELS: Record<LimitKey, string> = {
  workflows: "workflows",
  teamMembers: "team members",
  scenarios: "scenarios",
  policies: "policies",
  traces: "traces",
};

const FEATURE_LABELS: Record<string, string> = {
  evidenceExport: "Evidence packet exports",
  complianceReviews: "Compliance reviews",
  traceImport: "Trace import",
  releaseCreation: "Release creation",
};

export function PlanGate({ limit, feature, children, disabled }: PlanGateProps) {
  const usage = useQuery(api.optimized.planUsage);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  if (usage === undefined) return null;

  // Check feature gate
  if (feature && !usage.features[feature]) {
    return (
      <>
        <Button
          className="cursor-pointer rounded-full"
          onClick={() => setUpgradeOpen(true)}
        >
          <Lock className="size-4" />
          {FEATURE_LABELS[feature] || feature}
          <ArrowUpRight className="size-3.5" />
        </Button>
        <UpgradeDialog
          open={upgradeOpen}
          onOpenChange={setUpgradeOpen}
          reason={`${FEATURE_LABELS[feature] || feature} requires the Pilot plan or higher.`}
          currentPlan={usage.plan}
        />
      </>
    );
  }

  // Check limit gate
  if (limit) {
    const current = usage.usage[limit];
    const max = usage.limits[
      limit === "workflows"
        ? "maxWorkflows"
        : limit === "teamMembers"
          ? "maxTeamMembers"
          : limit === "scenarios"
            ? "maxScenarios"
            : limit === "policies"
              ? "maxPolicies"
              : "maxTraces"
    ];
    const atLimit = max !== Infinity && current >= max;

    if (atLimit || disabled) {
      return (
        <>
          <Button
            className="cursor-pointer rounded-full"
            onClick={() => setUpgradeOpen(true)}
            disabled={disabled}
          >
            <Lock className="size-4" />
            {children}
            {!disabled && <ArrowUpRight className="size-3.5" />}
          </Button>
          <UpgradeDialog
            open={upgradeOpen}
            onOpenChange={setUpgradeOpen}
            reason={`You've reached your ${LIMIT_LABELS[limit]} limit (${current}/${max}). Upgrade to add more.`}
            currentPlan={usage.plan}
          />
        </>
      );
    }
  }

  return <>{children}</>;
}

function UpgradeDialog({
  open,
  onOpenChange,
  reason,
  currentPlan,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  reason: string;
  currentPlan: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background/95 backdrop-blur-xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="size-5 text-cyan-300" />
            Upgrade required
          </DialogTitle>
          <DialogDescription>{reason}</DialogDescription>
        </DialogHeader>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-[12.5px] text-muted-foreground">
          <p>
            <span className="font-semibold text-foreground">Current plan:</span>{" "}
            {currentPlan === "free" ? "Free" : currentPlan === "pilot" ? "Pilot" : "Annual"}
          </p>
          <p className="mt-1">
            {currentPlan === "free"
              ? "Upgrade to Pilot ($15,000/yr) for 3 workflows, evidence exports, and compliance reviews."
              : "Contact sales@proofrail.com for a custom annual deployment."}
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" className="cursor-pointer rounded-full" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="cursor-pointer rounded-full" asChild>
            <Link to="/admin">
              <ArrowUpRight className="size-4" />
              {currentPlan === "free" ? "Upgrade plan" : "Contact sales"}
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
