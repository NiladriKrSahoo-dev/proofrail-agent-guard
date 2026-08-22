import { mutation } from "./_generated/server";

/**
 * Wipe all workspace data across the entire database so everything starts clean at 0.
 */
export const clearAll = mutation({
  args: {},
  handler: async (ctx) => {
    const tables = [
      "workflows",
      "scenarios",
      "policies",
      "traces",
      "releases",
      "testRuns",
      "comments",
      "teamMembers",
      "plans",
    ] as const;

    let deleted = 0;
    for (const table of tables) {
      const rows = await ctx.db.query(table).collect();
      for (const row of rows) {
        await ctx.db.delete(row._id);
        deleted++;
      }
    }
    return { deleted };
  },
});
