import { getAuthUserId } from "@convex-dev/auth/server";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

export type PlanName = "free" | "pilot" | "annual";

export interface PlanLimits {
  maxWorkflows: number;
  maxTeamMembers: number;
  maxScenarios: number;
  maxPolicies: number;
  maxTraces: number;
  maxReleases: number;
  evidenceExport: boolean;
  complianceReviews: boolean;
  traceImport: boolean;
  releaseCreation: boolean;
  label: string;
  description: string;
}

export const PLAN_LIMITS: Record<PlanName, PlanLimits> = {
  free: {
    maxWorkflows: 1,
    maxTeamMembers: 3,
    maxScenarios: 15,
    maxPolicies: 10,
    maxTraces: 40,
    maxReleases: 8,
    evidenceExport: false,
    complianceReviews: false,
    traceImport: true,
    releaseCreation: true,
    label: "Free engineering tier",
    description: "1 workflow, 3 team members, 15 scenarios, 10 policies, 40 traces, 8 releases",
  },
  pilot: {
    maxWorkflows: 4,
    maxTeamMembers: 5,
    maxScenarios: 60,
    maxPolicies: 30,
    maxTraces: 200,
    maxReleases: 25,
    evidenceExport: true,
    complianceReviews: true,
    traceImport: true,
    releaseCreation: true,
    label: "Implementation pilot",
    description: "4 workflows, 5 team members, 60 scenarios, 30 policies, 200 traces, 25 releases, evidence packets included",
  },
  annual: {
    maxWorkflows: 10,
    maxTeamMembers: 20,
    maxScenarios: 500,
    maxPolicies: 200,
    maxTraces: 2000,
    maxReleases: 100,
    evidenceExport: true,
    complianceReviews: true,
    traceImport: true,
    releaseCreation: true,
    label: "Annual contract",
    description: "10 workflows, 20 team members, 500 scenarios, 200 policies, 2000 traces, 100 releases, priority support",
  },
};

export async function getEffectivePlan(
  ctx: QueryCtx | MutationCtx,
): Promise<{
  name: PlanName;
  record: { _id: Id<"plans">; name: PlanName; seats: number; startedAt: number; paidAt?: number } | null;
  isGuest: boolean;
}> {
  const userId = await getAuthUserId(ctx);
  if (!userId) return { name: "free", record: null, isGuest: true };
  const user = await ctx.db.get(userId);
  const isGuest = user?.isAnonymous === true;
  if (isGuest) return { name: "free", record: null, isGuest: true };

  const plan = await ctx.db
    .query("plans")
    .withIndex("by_owner", (q) => q.eq("ownerId", userId))
    .first();

  if (!plan || plan.status === "past-due") return { name: "free", record: plan ?? null, isGuest: false };
  if (plan.name !== "free" && !plan.paidAt) return { name: "free", record: plan, isGuest: false };

  return { name: plan.name as PlanName, record: plan, isGuest: false };
}

export interface PlanUsage {
  workflows: number;
  teamMembers: number;
  scenarios: number;
  policies: number;
  traces: number;
  releases: number;
}

export async function countUsage(ctx: QueryCtx, userId: Id<"users">): Promise<PlanUsage> {
  const workflows = await ctx.db
    .query("workflows")
    .withIndex("by_owner", (q) => q.eq("ownerId", userId))
    .collect();

  const perWf = await Promise.all(
    workflows.map(async (wf) => {
      const [sc, po, tr, rel] = await Promise.all([
        ctx.db.query("scenarios").withIndex("by_workflow", (q) => q.eq("workflowId", wf._id)).collect(),
        ctx.db.query("policies").withIndex("by_workflow", (q) => q.eq("workflowId", wf._id)).collect(),
        ctx.db.query("traces").withIndex("by_workflow", (q) => q.eq("workflowId", wf._id)).collect(),
        ctx.db.query("releases").withIndex("by_workflow", (q) => q.eq("workflowId", wf._id)).collect(),
      ]);
      return { sc: sc.length, po: po.length, tr: tr.length, rel: rel.length };
    }),
  );

  const teamMembers = await ctx.db
    .query("teamMembers")
    .withIndex("by_owner", (q) => q.eq("ownerId", userId))
    .collect();

  return {
    workflows: workflows.length,
    teamMembers: teamMembers.length,
    scenarios: perWf.reduce((s, p) => s + p.sc, 0),
    policies: perWf.reduce((s, p) => s + p.po, 0),
    traces: perWf.reduce((s, p) => s + p.tr, 0),
    releases: perWf.reduce((s, p) => s + p.rel, 0),
  };
}

export interface LimitCheck {
  allowed: boolean;
  exceededLimit?: keyof PlanUsage;
  currentCount?: number;
  maxCount?: number;
  message?: string;
}

const RESOURCE_TO_MAX: Record<
  keyof PlanUsage,
  keyof Pick<
    PlanLimits,
    "maxWorkflows" | "maxTeamMembers" | "maxScenarios" | "maxPolicies" | "maxTraces" | "maxReleases"
  >
> = {
  workflows: "maxWorkflows",
  teamMembers: "maxTeamMembers",
  scenarios: "maxScenarios",
  policies: "maxPolicies",
  traces: "maxTraces",
  releases: "maxReleases",
};

export function checkLimit(
  usage: PlanUsage,
  plan: PlanName,
  resource: keyof PlanUsage,
  countDelta = 1,
): LimitCheck {
  const limits = PLAN_LIMITS[plan];
  const max = limits[RESOURCE_TO_MAX[resource]];
  const current = usage[resource];
  if (max === Infinity) return { allowed: true };
  if (current + countDelta > max) {
    return {
      allowed: false,
      exceededLimit: resource,
      currentCount: current,
      maxCount: max,
      message: `${resource.charAt(0).toUpperCase() + resource.slice(1)} limit reached: ${current}/${max} on the ${limits.label}. Upgrade your plan to unlock more.`,
    };
  }
  return { allowed: true };
}

export function hasFeature(
  plan: PlanName,
  feature: "evidenceExport" | "complianceReviews" | "traceImport" | "releaseCreation",
): boolean {
  return PLAN_LIMITS[plan][feature];
}
