import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation } from "./_generated/server";
import { v } from "convex/values";

const stepValidator = v.object({
  kind: v.union(
    v.literal("input"),
    v.literal("retrieval"),
    v.literal("tool"),
    v.literal("approval"),
    v.literal("action"),
    v.literal("output"),
  ),
  label: v.string(),
  detail: v.string(),
});

const severityValidator = v.union(
  v.literal("low"),
  v.literal("medium"),
  v.literal("high"),
  v.literal("critical"),
);

/**
 * Import a production trace and convert it into a draft regression scenario.
 *
 * Redaction happens in the browser before this mutation runs: the raw trace is
 * scanned for sensitive patterns (email, phone, SSN, card, DOB, MRN, account,
 * tax ID), matched values are replaced with [pattern] markers client-side, and
 * only the masked text is transmitted. The `redactedFields` array records which
 * patterns were applied so the evidence record can prove what was masked — the
 * original values never reach this backend.
 */
export const importTrace = mutation({
  args: {
    workflowId: v.id("workflows"),
    traceId: v.string(),
    title: v.string(),
    source: v.string(),
    capturedAt: v.number(),
    steps: v.array(stepValidator),
    riskyDecision: v.string(),
    severity: severityValidator,
    redactedFields: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not signed in");

    const wf = await ctx.db.get(args.workflowId);
    if (!wf || wf.ownerId !== userId) throw new Error("Workflow not found");

    const traceId = await ctx.db.insert("traces", {
      workflowId: args.workflowId,
      traceId: args.traceId,
      title: args.title,
      source: args.source,
      capturedAt: args.capturedAt,
      steps: args.steps,
      redactedFields: args.redactedFields.length,
      status: args.redactedFields.length > 0 ? "redacted" : "converted",
    });

    const scenarioId = await ctx.db.insert("scenarios", {
      workflowId: args.workflowId,
      sourceTraceId: traceId,
      title: args.title,
      description:
        "Regression scenario captured from a production trace. The reviewer selected the risky decision; the trace fields were redacted on import.",
      steps: args.steps,
      riskyDecision: args.riskyDecision,
      severity: args.severity,
      redactedFields: args.redactedFields,
      status: "draft",
      createdAt: Date.now(),
    });
    await ctx.db.patch(traceId, { scenarioId });
    return scenarioId;
  },
});
