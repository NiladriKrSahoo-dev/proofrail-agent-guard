import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation } from "./_generated/server";
import { getEffectivePlan, countUsage, checkLimit, PLAN_LIMITS } from "./planConfig";

/**
 * Activate the free engineering tier: one workflow under governance, up to
 * three engineers, full release gate — no evidence packet exports and no
 * compliance seat included.
 *
 * - Blocks anonymous/guest accounts from activating any plan.
 * - Prevents downgrading if current usage exceeds free-tier limits.
 * - Idempotent for same-tier reactivation.
 */
export const startFree = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not signed in");

    const user = await ctx.db.get(userId);
    if (user?.isAnonymous) throw new Error("Guest accounts cannot activate a plan. Please sign in with email first.");

    const current = await getEffectivePlan(ctx);
    const freeLimits = PLAN_LIMITS.free;

    // If already on a paid plan, check that current usage fits within free limits.
    if (current.name === "pilot" || current.name === "annual") {
      const usage = await countUsage(ctx, userId);

      const wfCheck = checkLimit(usage, "free", "workflows", 0);
      if (!wfCheck.allowed) {
        throw new Error(`Cannot downgrade to free: you have ${wfCheck.currentCount} workflows but the free plan allows ${wfCheck.maxCount}. Remove workflows first, or upgrade back.`);
      }

      const teamCheck = checkLimit(usage, "free", "teamMembers", 0);
      if (!teamCheck.allowed) {
        throw new Error(`Cannot downgrade to free: you have ${teamCheck.currentCount} team members but the free plan allows ${teamCheck.maxCount}. Remove members first, or upgrade back.`);
      }
    }

    const existing = current.record;
    if (existing) {
      // Already on free — just refresh the start date (idempotent).
      if (current.name === "free" && existing.name === "free") {
        return existing._id;
      }
      await ctx.db.patch(existing._id, {
        name: "free",
        amount: 0,
        seats: 3,
        status: "active",
        startedAt: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("plans", {
      ownerId: userId,
      name: "free",
      amount: 0,
      seats: 3,
      status: "active",
      startedAt: Date.now(),
    });
  },
});
