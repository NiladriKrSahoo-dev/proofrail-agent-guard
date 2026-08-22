import { mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Fixed-window throttle for OTP email sends: 5 per address per 10 minutes.
 * Called internally by the Email provider's sendVerificationRequest.
 * Fail-closed: throws before sending when the limit is reached.
 *
 * Production rate: 5 emails / 10 min = 30 emails / hour max per address.
 * Still prevents email-bombing while allowing normal login flows.
 */
export const checkAndRecord = mutation({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    const existing = await ctx.db
      .query("otpThrottle")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();

    const now = Date.now();
    const WINDOW_MS = 10 * 60 * 1000; // 10 minutes
    const MAX_SENDS = 5;

    if (!existing) {
      await ctx.db.insert("otpThrottle", { key, count: 1, windowStart: now });
      return;
    }

    if (now - existing.windowStart >= WINDOW_MS) {
      // Window expired — reset counter
      await ctx.db.patch(existing._id, { count: 1, windowStart: now });
      return;
    }

    if (existing.count >= MAX_SENDS) {
      throw new Error(
        "Too many verification codes requested. Please try again in a few minutes.",
      );
    }

    await ctx.db.patch(existing._id, { count: existing.count + 1 });
  },
});

/**
 * Reset the throttle for a specific email address.
 * Use during development/testing to clear a stuck record.
 */
export const reset = mutation({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    const existing = await ctx.db
      .query("otpThrottle")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});
