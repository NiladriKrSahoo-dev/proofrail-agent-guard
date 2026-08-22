import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { getEffectivePlan, countUsage, checkLimit, PLAN_LIMITS, type PlanName } from "./planConfig";

/**
 * Guarded checkout mutation:
 *  - Enforces that Guest accounts (anonymous) CANNOT select or upgrade to paid plans.
 *  - Sets `paidAt` timestamp so paid plans become active.
 *  - Enforces resource capacity against current workspace usage.
 */
export const guardedCheckout = mutation({
  args: {
    plan: v.union(v.literal("pilot"), v.literal("annual")),
    seats: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not signed in");

    const user = await ctx.db.get(userId);
    if (user?.isAnonymous) {
      throw new Error("Guest accounts are restricted to the Free plan. Please sign in with an email to upgrade your workspace.");
    }

    const current = await getEffectivePlan(ctx);

    // Enforce upgrade-only: cannot downgrade to a lower tier via checkout
    const tierOrder: PlanName[] = ["free", "pilot", "annual"];
    const currentLevel = tierOrder.indexOf(current.name);
    const targetLevel = tierOrder.indexOf(args.plan);
    if (targetLevel < currentLevel) {
      throw new Error(
        `You are currently on the ${PLAN_LIMITS[current.name].label}. Cannot downgrade to ${PLAN_LIMITS[args.plan].label}.`,
      );
    }

    const seats = Math.max(1, Math.floor(args.seats));

    // Check team member limit against new plan
    const usage = await countUsage(ctx, userId);
    const teamCheck = checkLimit(usage, args.plan, "teamMembers", 0);
    if (!teamCheck.allowed) {
      throw new Error(teamCheck.message);
    }

    const amount = args.plan === "pilot" ? 15000 : 36000;
    const now = Date.now();
    const existing = current.record;

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.plan,
        amount,
        seats,
        status: "active",
        startedAt: now,
        paidAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("plans", {
      ownerId: userId,
      name: args.plan,
      amount,
      seats,
      status: "active",
      startedAt: now,
      paidAt: now,
    });
  },
});
