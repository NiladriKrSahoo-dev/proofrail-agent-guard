/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as auth_emailOtp from "../auth/emailOtp.js";
import type * as backfill from "../backfill.js";
import type * as clearAll from "../clearAll.js";
import type * as freePlan from "../freePlan.js";
import type * as http from "../http.js";
import type * as optimized from "../optimized.js";
import type * as otpThrottle from "../otpThrottle.js";
import type * as otpThrottleReset from "../otpThrottleReset.js";
import type * as planConfig from "../planConfig.js";
import type * as planEnforcement from "../planEnforcement.js";
import type * as plans from "../plans.js";
import type * as proofrail from "../proofrail.js";
import type * as traceImport from "../traceImport.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  "auth/emailOtp": typeof auth_emailOtp;
  backfill: typeof backfill;
  clearAll: typeof clearAll;
  freePlan: typeof freePlan;
  http: typeof http;
  optimized: typeof optimized;
  otpThrottle: typeof otpThrottle;
  otpThrottleReset: typeof otpThrottleReset;
  planConfig: typeof planConfig;
  planEnforcement: typeof planEnforcement;
  plans: typeof plans;
  proofrail: typeof proofrail;
  traceImport: typeof traceImport;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
