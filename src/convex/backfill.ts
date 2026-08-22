import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation } from "./_generated/server";

/**
 * Backfill team members and the workspace plan for accounts seeded by the
 * earlier build, which predates those tables. Idempotent — safe to call on
 * every session open.
 */
export const backfillWorkspace = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not signed in");

    const hasTeam = await ctx.db
      .query("teamMembers")
      .filter((q) => q.eq(q.field("ownerId"), userId))
      .first();
    if (!hasTeam) {
      const team = [
        { name: "Dana Okoye", email: "dana@acme.dev", role: "admin" as const },
        { name: "Priya Raman", email: "priya@acme.dev", role: "compliance" as const },
        { name: "Marcus Feld", email: "marcus@acme.dev", role: "compliance" as const },
        { name: "Alicia Voss", email: "alicia@acme.dev", role: "engineer" as const },
        { name: "Sam Whitfield", email: "sam@acme.dev", role: "auditor" as const },
      ];
      for (const m of team) {
        await ctx.db.insert("teamMembers", {
          ownerId: userId,
          name: m.name,
          email: m.email,
          role: m.role,
          status: "active",
          createdAt: Date.now() - 60 * 86_400_000,
        });
      }
    }

    const hasPlan = await ctx.db
      .query("plans")
      .filter((q) => q.eq(q.field("ownerId"), userId))
      .first();
    if (!hasPlan) {
      await ctx.db.insert("plans", {
        ownerId: userId,
        name: "pilot",
        amount: 15000,
        seats: 5,
        status: "active",
        startedAt: Date.now() - 14 * 86_400_000,
      });
    }

    return { backfilled: true };
  },
});
