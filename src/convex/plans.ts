import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query, type QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";

// ---------------------------------------------------------------------------
// Plan entitlements
// ---------------------------------------------------------------------------
//
// Every plan's feature allowance. `usage` is computed server-side from the
// signed-in user's own rows only; the UI renders these numbers but never
// decides access — the plan gate lives in `selectPlan` and the counts below
// are authoritative for what the workspace may hold.

export const PLAN_LIMITS = {
  free: {
    label: "Free engineering tier",
    amount: 0,
    seats: 3,
    workflows: 1,
    scenarios: 15,
    policies: 10,
    traces: 40,
    releases: 8,
    teamMembers: 3,
  },
  pilot: {
    label: "Implementation pilot",
    amount: 15000,
    seats: 5,
    workflows: 4,
    scenarios: 60,
    policies: 30,
    traces: 200,
    releases: 25,
    teamMembers: 5,
  },
  annual: {
    label: "Annual contract",
    amount: 36000,
    seats: 20,
    workflows: 10,
    scenarios: 500,
    policies: 200,
    traces: 2000,
    releases: 100,
    teamMembers: 20,
  },
} as const;

export type PlanName = keyof typeof PLAN_LIMITS;

/** Plans a signed-in user may select themselves. Annual is contact-sales only. */
const SELF_SERVE_PLANS = ["free", "pilot"] as const;
type SelfServePlan = (typeof SELF_SERVE_PLANS)[number];

function requireUser(userId: Id<"users"> | null): Id<"users"> {
  if (userId === null) throw new Error("Not signed in");
  return userId;
}

/**
 * The plan a workspace is actually entitled to. A paid-tier record with no
 * payment evidence (`paidAt` unset — e.g. the demo seed or a forged checkout)
 * counts as the free tier. Guests can never hold a paid tier regardless of
 * what the record says.
 */
async function resolveEffectivePlan(
  ctx: { db: QueryCtx["db"] },
  userId: Id<"users">,
  isGuest: boolean,
): Promise<PlanName> {
  const plan = await ctx.db
    .query("plans")
    .withIndex("by_owner", (q) => q.eq("ownerId", userId))
    .first();
  if (!plan) return "free";
  if (plan.name === "free") return "free";
  if (isGuest || !plan.paidAt) return "free";
  return plan.name as PlanName;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Effective plan + entitlement limits + current server-computed usage.
 * Returns the *normalized* plan record (unpaid paid-tiers are reported as
 * free), so existing `plan.name` / `plan.amount` / `plan.seats` consumers
 * keep working unchanged. Null when signed out.
 */
export const getPlanLimits = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const user = await ctx.db.get(userId);
    const isGuest = user?.isAnonymous === true;

    const plan = await ctx.db
      .query("plans")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .first();
    const effective = await resolveEffectivePlan(ctx, userId, isGuest);
    const limits = PLAN_LIMITS[effective];

    const workflows = await ctx.db
      .query("workflows")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .collect();
    const wfIds = workflows.map((w) => w._id);

    const countByWorkflow = async (
      table: "scenarios" | "policies" | "traces" | "releases",
    ) => {
      const rows = await Promise.all(
        wfIds.map((id) =>
          ctx.db
            .query(table)
            .withIndex("by_workflow", (q) => q.eq("workflowId", id))
            .collect(),
        ),
      );
      return rows.reduce((sum, r) => sum + r.length, 0);
    };

    const [scenarioCount, policyCount, traceCount, releaseCount, teamCount] =
      await Promise.all([
        countByWorkflow("scenarios"),
        countByWorkflow("policies"),
        countByWorkflow("traces"),
        countByWorkflow("releases"),
        ctx.db
          .query("teamMembers")
          .withIndex("by_owner", (q) => q.eq("ownerId", userId))
          .collect(),
      ]);

    return {
      // Normalized plan record (effective tier, not the raw row).
      name: effective,
      label: limits.label,
      amount: effective === "free" ? 0 : plan?.amount ?? limits.amount,
      seats: plan?.seats ?? limits.seats,
      status: plan?.status ?? "active",
      startedAt: plan?.startedAt ?? Date.now(),
      isGuest,
      limits: {
        workflows: limits.workflows,
        scenarios: limits.scenarios,
        policies: limits.policies,
        traces: limits.traces,
        releases: limits.releases,
        teamMembers: limits.teamMembers,
      },
      usage: {
        workflows: workflows.length,
        scenarios: scenarioCount,
        policies: policyCount,
        traces: traceCount,
        releases: releaseCount,
        teamMembers: teamCount.length,
      },
    };
  },
});

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * Choose a plan for the workspace. This replaces the old `checkout` mutation,
 * which let anyone — including guests — hold any plan. Now:
 *   - Guests (anonymous) may only hold the free tier.
 *   - Signed-in users may self-serve `free` or `pilot` (invoice-confirmed).
 *   - `annual` is not an accepted value here: it is sold by the team only.
 *   - Paid tiers require payment evidence (`paidAt`), set on confirmation.
 */
export const selectPlan = mutation({
  args: {
    plan: v.union(v.literal("free"), v.literal("pilot")),
    seats: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = requireUser(await getAuthUserId(ctx));
    const user = await ctx.db.get(userId);
    const isGuest = user?.isAnonymous === true;

    if (isGuest && args.plan !== "free") {
      throw new Error(
        "Guests are on the free tier. Sign in with an email to upgrade to a paid plan.",
      );
    }

    const limits = PLAN_LIMITS[args.plan];
    const seats =
      args.plan === "free"
        ? limits.seats
        : Math.max(
            1,
            Math.min(Math.floor(args.seats ?? limits.seats), limits.seats),
          );

    const existing = await ctx.db
      .query("plans")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .first();

    const record = {
      ownerId: userId,
      name: args.plan,
      amount: limits.amount,
      seats,
      status: "active" as const,
      startedAt: Date.now(),
      // Pilot is confirmed by invoice at checkout; annual is never self-serve.
      // When real payment processing is wired in, this should be set by the
      // payment webhook instead.
      paidAt: args.plan === "pilot" ? Date.now() : undefined,
    };

    if (existing) {
      await ctx.db.patch(existing._id, record);
      return existing._id;
    }
    return await ctx.db.insert("plans", record);
  },
});

/**
 * Idempotent cleanup: downgrades any paid-tier plan record that has no payment
 * evidence (e.g. the demo seed handing out a "pilot" plan) to the free tier,
 * and forces guests onto free. Call on the Admin page after login so display
 * and entitlements are always consistent.
 */
export const reconcilePlan = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = requireUser(await getAuthUserId(ctx));
    const user = await ctx.db.get(userId);
    const isGuest = user?.isAnonymous === true;

    const plan = await ctx.db
      .query("plans")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .first();
    if (!plan) return "free" as PlanName;
    if (plan.name !== "free" && (isGuest || !plan.paidAt)) {
      await ctx.db.patch(plan._id, {
        name: "free",
        amount: 0,
        seats: PLAN_LIMITS.free.seats,
        status: "active",
        paidAt: undefined,
      });
      return "free" as PlanName;
    }
    return plan.name as PlanName;
  },
});
