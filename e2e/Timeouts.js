/**
 * Timeouts.js
 * ------------------------------------------------------------------
 * Defines the standard wait times (in milliseconds) for Playwright actions.
 *
 * Why this exists:
 *   - Keeps timeouts consistent across helpers and tests.
 *   - Makes test code more readable (Timeouts.short vs 5000).
 *   - Easy to adjust in one place if you need more/less waiting globally.
 *
 * How to use:
 *   import { Timeouts } from '../helpers/Timeouts';
 *
 *   if (!(await safeClick(page, sel, { timeout: Timeouts.short }))) {
 *     markFailed(`Click failed: ${getLastError(page)}`);
 *   }
 *
 * Categories:
 *   - short      = 5 seconds   → quick actions like button clicks or field visibility
 *   - standard   = 15 seconds  → common waits like navigation or login flows
 *   - long       = 30 seconds  → heavier flows, dashboards, or slower components
 *   - extraLong  = 45 seconds  → edge cases like file uploads or very slow pages
 */

export const Timeouts = {
  short: 5_000,
  standard: 15_000,
  long: 30_000,
  extraLong: 45_000,
};
