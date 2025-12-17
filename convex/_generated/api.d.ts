/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as course_data from "../course_data.js";
import type * as feed from "../feed.js";
import type * as powerups from "../powerups.js";
import type * as scores from "../scores.js";
import type * as storage from "../storage.js";
import type * as teams from "../teams.js";
import type * as users from "../users.js";
import type * as utils_scoring from "../utils/scoring.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  course_data: typeof course_data;
  feed: typeof feed;
  powerups: typeof powerups;
  scores: typeof scores;
  storage: typeof storage;
  teams: typeof teams;
  users: typeof users;
  "utils/scoring": typeof utils_scoring;
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
