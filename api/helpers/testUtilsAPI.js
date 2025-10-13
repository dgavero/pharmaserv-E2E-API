// ============================================================================
// API Test Utilities
// Mirrors testUtilsUI.js but adapted for API tests (no screenshots).
// Provides safeGraphQL wrapper, queue + flush, and failure snippet handling.
// ============================================================================

import { graphql } from './graphqlClient.js';
import { sendAPIFailure } from '../../helpers/discord/discordBot.js';

// ============================================================================
// Core GraphQL wrapper
// ============================================================================

/**
 * Thin "safe" layer that does NOT throw.
 * - ok: boolean (HTTP ok AND no GraphQL errors)
 * - error: short string for expect()/logging
 * - body: parsed JSON (or null)
 */
export async function safeGraphQL(api, args) {
  const { res, body } = await graphql(api, args);

  // Transport-level failure
  if (!res.ok()) {
    const text = await res.text().catch(() => '');
    return { ok: false, body, error: `HTTP ${res.status()} ${text?.slice(0, 200)}` };
  }

  // GraphQL-level failure (HTTP 200 but resolver/schema errors)
  if (body?.errors?.length) {
    return { ok: false, body, error: JSON.stringify(body.errors).slice(0, 400) };
  }

  return { ok: true, body, error: null };
}

// ============================================================================
// Queue + Flush system for Discord reporting
// ============================================================================

const apiMessageQueue = [];
let flushScheduled = false;
const FLUSH_DELAY = 100; // ms

function enqueueMessage(msg) {
  apiMessageQueue.push(msg);
  scheduleFlush();
}

export async function flushApiReports() {
  while (apiMessageQueue.length > 0) {
    const msg = apiMessageQueue.shift();
    try {
      await msg();
    } catch (err) {
      console.error('[API Reporter] Failed to flush message', err);
    }
  }
}

function scheduleFlush() {
  if (flushScheduled) return;
  flushScheduled = true;
  setTimeout(async () => {
    flushScheduled = false;
    await flushApiReports();
  }, FLUSH_DELAY);
}

// ============================================================================
// Failure processing (for reporter to call on failed tests)
// ============================================================================

/**
 * Extract a compact snippet from Playwright test result errors.
 * Handles both hard and soft assertion failures.
 */
export function extractApiFailureSnippet(result) {
  const stripAnsi = (s) => (s || '').replace(/\u001b\[[0-9;]*m/g, '');
  const errs = Array.isArray(result.errors) && result.errors.length
    ? result.errors
    : (result.error ? [result.error] : []);

  const msgs = errs
    .map(e => stripAnsi(e.message || '').trim())
    .filter(Boolean);
  if (!msgs.length) return '';

  // Prefer a compact trio:
  //   Error: expect(received)...
  //   Expected: ...
  //   Received: ...
  for (const msg of msgs) {
    const errorLine = (msg.match(/^Error:.*$/m) || [])[0];
    const expectedLine = (msg.match(/^(?:Expected:.*)$/m) || [])[0];
    const receivedLine = (msg.match(/^(?:Received:.*)$/m) || [])[0];
    const parts = [errorLine, expectedLine, receivedLine].filter(Boolean);
    if (parts.length) return parts.join('\n');
  }

  // Next preference: everything from "Expected:" down to a blank line/stack
  for (const msg of msgs) {
    const idx = msg.indexOf('Expected:');
    if (idx !== -1) {
      const slice = msg.slice(idx);
      const m = slice.match(/^(Expected:[\s\S]*?)(?:\n{2,}|\n\s*at\s|\n\s*✓|\s*$)/m);
      return (m && m[1]) ? m[1] : slice;
    }
  }
  // Fallback: first non-empty line
  return msgs[0].split('\n').find(l => l.trim().length) || msgs[0];
}

/**
 * Enqueue a failure message for a given API test.
 */
export function enqueueApiFailure({ title, snippet }) {
  enqueueMessage(async () => {
    await sendAPIFailure({ title, snippet });
  });
}
