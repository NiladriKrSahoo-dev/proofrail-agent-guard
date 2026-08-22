import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove
    }).index("email", ["email"]), // index for the email. do not remove or modify

    // SECURITY: fixed-window counter backing the OTP send throttle in
    // `otpThrottle.ts` (3 verification-code emails per address per hour).
    otpThrottle: defineTable({
      key: v.string(), // throttle key (lowercased email address)
      count: v.number(), // sends recorded in the current window
      windowStart: v.number(), // epoch ms when the current window began
    }).index("by_key", ["key"]),

    // Proofrail data model ---------------------------------------------------

    // An AI agent / workflow under governance. The unit a release is shipped
    // and an evidence packet is generated for.
    workflows: defineTable({
      ownerId: v.id("users"),
      name: v.string(),
      description: v.string(),
      sector: v.union(
        v.literal("legal"),
        v.literal("healthcare"),
        v.literal("finops"),
        v.literal("support"),
      ),
      agent: v.string(), // model / agent identifier
      traceSource: v.string(), // e.g. OpenTelemetry, Langfuse, Braintrust
      status: v.union(v.literal("active"), v.literal("paused"), v.literal("draft")),
      createdAt: v.number(),
    }).index("by_owner", ["ownerId"]),

    // A production trace imported from an observability system.
    traces: defineTable({
      workflowId: v.id("workflows"),
      traceId: v.string(),
      title: v.string(),
      source: v.string(),
      capturedAt: v.number(),
      steps: v.array(
        v.object({
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
        }),
      ),
      redactedFields: v.number(),
      status: v.union(
        v.literal("imported"),
        v.literal("redacted"),
        v.literal("converted"),
      ),
      scenarioId: v.optional(v.id("scenarios")),
    }).index("by_workflow", ["workflowId"]),

    // A reusable regression scenario converted from a trace, with the risky
    // decision the reviewer wants to guard.
    scenarios: defineTable({
      workflowId: v.id("workflows"),
      sourceTraceId: v.id("traces"),
      title: v.string(),
      description: v.string(),
      steps: v.array(
        v.object({
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
        }),
      ),
      riskyDecision: v.string(),
      severity: v.union(
        v.literal("low"),
        v.literal("medium"),
        v.literal("high"),
        v.literal("critical"),
      ),
      status: v.union(
        v.literal("draft"),
        v.literal("reviewed"),
        v.literal("active"),
        v.literal("archived"),
      ),
      reviewedBy: v.optional(v.string()),
      reviewNote: v.optional(v.string()),
      // Sensitive-field patterns masked before storage (e.g. email, ssn, card).
      redactedFields: v.optional(v.array(v.string())),
      createdAt: v.number(),
    }).index("by_workflow", ["workflowId"]),

    // Compliance policy statements written in plain language by owners.
    policies: defineTable({
      workflowId: v.id("workflows"),
      title: v.string(),
      statement: v.string(),
      behavior: v.union(
        v.literal("required"),
        v.literal("forbidden"),
        v.literal("approval-gated"),
      ),
      owner: v.string(),
      evidenceSource: v.string(),
      mappedTests: v.number(),
      status: v.union(v.literal("draft"), v.literal("active"), v.literal("archived")),
      createdAt: v.number(),
    }).index("by_workflow", ["workflowId"]),

    // One evaluation of a scenario against a policy for a release, using a
    // deterministic check, a model grader, or assigned human review.
    testRuns: defineTable({
      releaseId: v.id("releases"),
      scenarioId: v.id("scenarios"),
      policyId: v.optional(v.id("policies")),
      evaluator: v.union(
        v.literal("deterministic"),
        v.literal("model"),
        v.literal("human"),
      ),
      result: v.union(
        v.literal("pass"),
        v.literal("fail"),
        v.literal("needs-review"),
        v.literal("pending"),
      ),
      score: v.optional(v.number()),
      note: v.optional(v.string()),
      reviewer: v.optional(v.string()),
      createdAt: v.number(),
    }).index("by_release", ["releaseId"]),

    // A candidate release and its gate outcome, with an evidence record.
    releases: defineTable({
      workflowId: v.id("workflows"),
      version: v.string(),
      baselineVersion: v.string(),
      summary: v.string(),
      status: v.union(
        v.literal("pending"),
        v.literal("running"),
        v.literal("approved"),
        v.literal("blocked"),
        v.literal("approved-with-exceptions"),
      ),
      exceptions: v.array(
        v.object({
          scenarioTitle: v.string(),
          reason: v.string(),
          approvedBy: v.string(),
        }),
      ),
      createdBy: v.string(),
      createdAt: v.number(),
      // Compliance sign-off session booked against this release.
      reviewScheduledAt: v.optional(v.number()),
      reviewScheduledWith: v.optional(v.string()),
    }).index("by_workflow", ["workflowId"]),

    // Threaded discussion on a release's evidence record.
    comments: defineTable({
      releaseId: v.id("releases"),
      author: v.string(),
      body: v.string(),
      createdAt: v.number(),
    }).index("by_release", ["releaseId"]),

    // People inside the governance workspace, with their role.
    teamMembers: defineTable({
      ownerId: v.id("users"),
      name: v.string(),
      email: v.string(),
      role: v.union(
        v.literal("admin"),
        v.literal("compliance"),
        v.literal("engineer"),
        v.literal("auditor"),
      ),
      status: v.union(v.literal("active"), v.literal("pending")),
      createdAt: v.number(),
    }).index("by_owner", ["ownerId"]),

    // The workspace's commercial plan, updated at checkout.
    plans: defineTable({
      ownerId: v.id("users"),
      name: v.union(v.literal("free"), v.literal("pilot"), v.literal("annual")),
      amount: v.number(), // USD per billing period (0 for the free tier)
      seats: v.number(),
      status: v.union(v.literal("active"), v.literal("past-due"), v.literal("checkout")),
      startedAt: v.number(),
      // Payment evidence. A paid-tier record without `paidAt` (demo seed,
      // forged checkout) is treated as the free tier by `plans.ts`.
      paidAt: v.optional(v.number()),
    }).index("by_owner", ["ownerId"]),
  },
  {
    // SECURITY: keep schema validation ON so Convex rejects documents that
    // don't match the schema on write. This is a defense-in-depth layer on
    // top of the per-function arg validators.
    schemaValidation: true,
  },
);

export default schema;
