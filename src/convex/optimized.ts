import { getAuthUserId } from "@convex-dev/auth/server";
import { query, type QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { getEffectivePlan, countUsage, PLAN_LIMITS, type PlanName, type PlanUsage } from "./planConfig";

/**
 * Index-scoped read queries for Proofrail.
 *
 * The original queries in proofrail.ts scan the shared tables
 * (`query("scenarios").order("desc").take(...)` then filter in JS), so every
 * reactive re-run reads rows belonging to every workspace in the deployment.
 * These equivalents read only the signed-in user's own rows through the
 * existing by_owner / by_workflow / by_release indexes, then merge and sort by
 * recency so the returned shapes are identical.
 */

function requireUser(userId: Id<"users"> | null): Id<"users"> {
  if (userId === null) throw new Error("Not signed in");
  return userId;
}

async function ownedWorkflows(ctx: QueryCtx, userId: Id<"users">) {
  return await ctx.db
    .query("workflows")
    .withIndex("by_owner", (q) => q.eq("ownerId", userId))
    .order("desc")
    .collect();
}

async function scenariosByWf(ctx: QueryCtx, wfIds: Id<"workflows">[], limit: number) {
  const parts = await Promise.all(
    wfIds.map((id) =>
      ctx.db
        .query("scenarios")
        .withIndex("by_workflow", (q) => q.eq("workflowId", id))
        .order("desc")
        .take(limit),
    ),
  );
  return parts.flat();
}

async function policiesByWf(ctx: QueryCtx, wfIds: Id<"workflows">[], limit: number) {
  const parts = await Promise.all(
    wfIds.map((id) =>
      ctx.db
        .query("policies")
        .withIndex("by_workflow", (q) => q.eq("workflowId", id))
        .order("desc")
        .take(limit),
    ),
  );
  return parts.flat();
}

async function tracesByWf(ctx: QueryCtx, wfIds: Id<"workflows">[], limit: number) {
  const parts = await Promise.all(
    wfIds.map((id) =>
      ctx.db
        .query("traces")
        .withIndex("by_workflow", (q) => q.eq("workflowId", id))
        .order("desc")
        .take(limit),
    ),
  );
  return parts.flat();
}

async function releasesByWf(ctx: QueryCtx, wfIds: Id<"workflows">[], limit: number) {
  const parts = await Promise.all(
    wfIds.map((id) =>
      ctx.db
        .query("releases")
        .withIndex("by_workflow", (q) => q.eq("workflowId", id))
        .order("desc")
        .take(limit),
    ),
  );
  return parts.flat();
}

async function runsByRelease(ctx: QueryCtx, releaseIds: Id<"releases">[], limit: number) {
  const parts = await Promise.all(
    releaseIds.map((id) =>
      ctx.db
        .query("testRuns")
        .withIndex("by_release", (q) => q.eq("releaseId", id))
        .order("desc")
        .take(limit),
    ),
  );
  return parts.flat();
}

/** All workflows for the signed-in user, with rollups used by the UI. */
export const listWorkflows = query({
  args: {},
  handler: async (ctx) => {
    const userId = requireUser(await getAuthUserId(ctx));
    const workflows = await ownedWorkflows(ctx, userId);

    const out = await Promise.all(
      workflows.map(async (wf) => {
        const [scenarios, policies, traces, releases] = await Promise.all([
          ctx.db
            .query("scenarios")
            .withIndex("by_workflow", (q) => q.eq("workflowId", wf._id))
            .collect(),
          ctx.db
            .query("policies")
            .withIndex("by_workflow", (q) => q.eq("workflowId", wf._id))
            .collect(),
          ctx.db
            .query("traces")
            .withIndex("by_workflow", (q) => q.eq("workflowId", wf._id))
            .collect(),
          ctx.db
            .query("releases")
            .withIndex("by_workflow", (q) => q.eq("workflowId", wf._id))
            .order("desc")
            .collect(),
        ]);
        return {
          ...wf,
          scenarioCount: scenarios.length,
          activeScenarioCount: scenarios.filter((s) => s.status === "active").length,
          draftScenarioCount: scenarios.filter((s) => s.status === "draft").length,
          policyCount: policies.length,
          traceCount: traces.length,
          latestRelease: releases[0] ?? null,
        };
      }),
    );
    return out;
  },
});

/** Recent traces across the user's workflows (optionally filtered). */
export const listTraces = query({
  args: { workflowId: v.optional(v.id("workflows")), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = requireUser(await getAuthUserId(ctx));
    const workflows = await ownedWorkflows(ctx, userId);
    const wfIds = workflows.map((w) => w._id);
    const traces = await tracesByWf(ctx, wfIds, 100);
    traces.sort((a, b) => b._creationTime - a._creationTime);
    const mine = traces.filter(
      (t) => args.workflowId === undefined || t.workflowId === args.workflowId,
    );
    return mine.slice(0, args.limit ?? 20);
  },
});

/** Scenarios across the user's workflows (optionally filtered). */
export const listScenarios = query({
  args: {
    workflowId: v.optional(v.id("workflows")),
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("reviewed"),
        v.literal("active"),
        v.literal("archived"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const userId = requireUser(await getAuthUserId(ctx));
    const workflows = await ownedWorkflows(ctx, userId);
    const wfIds = workflows.map((w) => w._id);
    const scenarios = await scenariosByWf(ctx, wfIds, 100);
    scenarios.sort((a, b) => b._creationTime - a._creationTime);
    const mine = scenarios.filter(
      (s) =>
        (args.workflowId === undefined || s.workflowId === args.workflowId) &&
        (args.status === undefined || s.status === args.status),
    );
    const wfName = new Map(workflows.map((w) => [w._id, w.name]));
    return mine.map((s) => ({ ...s, workflowName: wfName.get(s.workflowId) ?? "" }));
  },
});

/** Policies across the user's workflows (optionally filtered). */
export const listPolicies = query({
  args: { workflowId: v.optional(v.id("workflows")) },
  handler: async (ctx, args) => {
    const userId = requireUser(await getAuthUserId(ctx));
    const workflows = await ownedWorkflows(ctx, userId);
    const wfIds = workflows.map((w) => w._id);
    const policies = await policiesByWf(ctx, wfIds, 100);
    policies.sort((a, b) => b._creationTime - a._creationTime);
    const mine = policies.filter(
      (p) => args.workflowId === undefined || p.workflowId === args.workflowId,
    );
    const wfName = new Map(workflows.map((w) => [w._id, w.name]));
    return mine.map((p) => ({ ...p, workflowName: wfName.get(p.workflowId) ?? "" }));
  },
});

/** Releases with per-release test summaries. */
export const listReleases = query({
  args: {},
  handler: async (ctx) => {
    const userId = requireUser(await getAuthUserId(ctx));
    const workflows = await ownedWorkflows(ctx, userId);
    const wfIds = workflows.map((w) => w._id);
    const releases = await releasesByWf(ctx, wfIds, 50);
    releases.sort((a, b) => b._creationTime - a._creationTime);
    const wfName = new Map(workflows.map((w) => [w._id, w.name]));
    const wfSector = new Map(workflows.map((w) => [w._id, w.sector]));

    const runs = await runsByRelease(
      ctx,
      releases.map((r) => r._id),
      100,
    );
    const runsByRel = new Map<Id<"releases">, (typeof runs)[number][]>();
    for (const run of runs) {
      const list = runsByRel.get(run.releaseId);
      if (list) list.push(run);
      else runsByRel.set(run.releaseId, [run]);
    }

    return releases.map((r) => {
      const relRuns = runsByRel.get(r._id) ?? [];
      return {
        ...r,
        workflowName: wfName.get(r.workflowId) ?? "",
        sector: wfSector.get(r.workflowId) ?? "support",
        testCount: relRuns.length,
        passCount: relRuns.filter((x) => x.result === "pass").length,
        failCount: relRuns.filter((x) => x.result === "fail").length,
        reviewCount: relRuns.filter((x) => x.result === "needs-review").length,
      };
    });
  },
});

/** Full release detail: release + test runs joined with scenario/policy. */
export const getReleaseDetail = query({
  args: { releaseId: v.id("releases") },
  handler: async (ctx, args) => {
    const userId = requireUser(await getAuthUserId(ctx));
    const release = await ctx.db.get(args.releaseId);
    if (!release) return null;

    const workflow = await ctx.db.get(release.workflowId);
    if (!workflow || workflow.ownerId !== userId) return null;

    const runs = await ctx.db
      .query("testRuns")
      .withIndex("by_release", (q) => q.eq("releaseId", release._id))
      .collect();

    const joined = await Promise.all(
      runs.map(async (run) => {
        const scenario = await ctx.db.get(run.scenarioId);
        const policy = run.policyId ? await ctx.db.get(run.policyId) : null;
        return { run, scenario, policy };
      }),
    );

    return { release, workflow, runs: joined };
  },
});

/** Rollups for the Overview page. */
export const overview = query({
  args: {},
  handler: async (ctx) => {
    const userId = requireUser(await getAuthUserId(ctx));
    const workflows = await ownedWorkflows(ctx, userId);
    const wfIds = workflows.map((w) => w._id);

    const [scenarios, policies, traces, releases] = await Promise.all([
      scenariosByWf(ctx, wfIds, 300),
      policiesByWf(ctx, wfIds, 300),
      tracesByWf(ctx, wfIds, 300),
      releasesByWf(ctx, wfIds, 50),
    ]);
    scenarios.sort((a, b) => b._creationTime - a._creationTime);
    policies.sort((a, b) => b._creationTime - a._creationTime);
    traces.sort((a, b) => b._creationTime - a._creationTime);
    releases.sort((a, b) => b._creationTime - a._creationTime);

    const runs = await runsByRelease(
      ctx,
      releases.map((r) => r._id),
      100,
    );

    const wfName = new Map(workflows.map((w) => [w._id, w.name]));
    const wfSector = new Map(workflows.map((w) => [w._id, w.sector]));

    const needsReviewRuns = runs.filter((r) => r.result === "needs-review");
    const needsReview = await Promise.all(
      needsReviewRuns.map(async (run) => {
        const scenario = await ctx.db.get(run.scenarioId);
        const release = await ctx.db.get(run.releaseId);
        return {
          testRunId: run._id,
          releaseId: run.releaseId,
          scenarioTitle: scenario?.title ?? "Untitled scenario",
          severity: scenario?.severity ?? "medium",
          workflowName: scenario ? (wfName.get(scenario.workflowId) ?? "") : "",
          releaseVersion: release?.version ?? "",
          evaluator: run.evaluator,
          note: run.note ?? "",
        };
      }),
    );

    return {
      workflowCount: workflows.length,
      activeWorkflowCount: workflows.filter((w) => w.status === "active").length,
      scenarioCount: scenarios.length,
      activeScenarioCount: scenarios.filter((s) => s.status === "active").length,
      draftScenarioCount: scenarios.filter((s) => s.status === "draft").length,
      policyCount: policies.length,
      activePolicyCount: policies.filter((p) => p.status === "active").length,
      traceCount: traces.length,
      needsReview,
      releases: releases.map((r) => ({
        ...r,
        workflowName: wfName.get(r.workflowId) ?? "",
        sector: wfSector.get(r.workflowId) ?? "support",
      })),
      workflows: workflows.map((w) => ({
        ...w,
        scenarioCount: scenarios.filter((s) => s.workflowId === w._id).length,
        activeScenarioCount: scenarios.filter(
          (s) => s.workflowId === w._id && s.status === "active",
        ).length,
        policyCount: policies.filter((p) => p.workflowId === w._id).length,
        traceCount: traces.filter((t) => t.workflowId === w._id).length,
        latestRelease: releases.find((r) => r.workflowId === w._id) ?? null,
      })),
      recentTraces: traces.slice(0, 6).map((t) => ({
        ...t,
        workflowName: wfName.get(t.workflowId) ?? "",
      })),
    };
  },
});

/** Discussion thread for a release's evidence record. */
export const listComments = query({
  args: { releaseId: v.id("releases") },
  handler: async (ctx, args) => {
    const userId = requireUser(await getAuthUserId(ctx));
    const release = await ctx.db.get(args.releaseId);
    if (!release) return [];
    const workflow = await ctx.db.get(release.workflowId);
    if (!workflow || workflow.ownerId !== userId) return [];

    return await ctx.db
      .query("comments")
      .withIndex("by_release", (q) => q.eq("releaseId", args.releaseId))
      .order("desc")
      .collect();
  },
});

/** Everyone in the governance workspace, newest first. */
export const listTeamMembers = query({
  args: {},
  handler: async (ctx) => {
    const userId = requireUser(await getAuthUserId(ctx));
    return await ctx.db
      .query("teamMembers")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .order("desc")
      .collect();
  },
});

/** The workspace's commercial plan (null before first checkout). */
export const getPlan = query({
  args: {},
  handler: async (ctx) => {
    const userId = requireUser(await getAuthUserId(ctx));
    const plan = await ctx.db
      .query("plans")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .first();
    return plan ?? null;
  },
});

// ---------------------------------------------------------------------------
// Plan enforcement queries
// ---------------------------------------------------------------------------

/** The user's effective plan (guests → free, unpaid pilot/annual → free). */
export const effectivePlan = query({
  args: {},
  handler: async (ctx) => {
    return await getEffectivePlan(ctx);
  },
});

/** Current resource usage counts + limits for the signed-in user. */
export const planUsage = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return {
        plan: "free" as PlanName,
        usage: { workflows: 0, teamMembers: 0, scenarios: 0, policies: 0, traces: 0 },
        limits: {
          maxWorkflows: 1,
          maxTeamMembers: 3,
          maxScenarios: 5,
          maxPolicies: 5,
          maxTraces: 10,
        },
        features: { evidenceExport: false, complianceReviews: false, traceImport: true, releaseCreation: true },
      };
    }
    const { name: plan } = await getEffectivePlan(ctx);
    const usage = await countUsage(ctx, userId);
    const limits = PLAN_LIMITS[plan];
    return {
      plan,
      usage,
      limits: {
        maxWorkflows: limits.maxWorkflows,
        maxTeamMembers: limits.maxTeamMembers,
        maxScenarios: limits.maxScenarios,
        maxPolicies: limits.maxPolicies,
        maxTraces: limits.maxTraces,
        maxReleases: limits.maxReleases,
      },
      features: {
        evidenceExport: limits.evidenceExport,
        complianceReviews: limits.complianceReviews,
        traceImport: limits.traceImport,
        releaseCreation: limits.releaseCreation,
      },
    };
  },
});
