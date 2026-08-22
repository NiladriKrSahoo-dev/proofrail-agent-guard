import { mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Reset OTP throttle for a specific email address.
 * Used during development when the send limit is hit and you're stuck.
 * In production, this could be gated to admin-only or removed entirely.
 */
export const resetForEmail = mutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const key = email.toLowerCase();
    const existing = await ctx.db
      .query("otpThrottle")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }

    return { reset: true, email: key };
  },
});
