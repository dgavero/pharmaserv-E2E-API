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

// ----- GraphQL error extractor (single source of truth) -----
// Accepts either the whole safeGraphQL envelope (with .body) or a raw GraphQL body.
// Returns a consistent shape for tests and for safeGraphQL to reuse.
function _extractGqlError(body) {
  const err = (body?.errors ?? [])[0] ?? {};
  const message = String(err?.message ?? '');
  const code = String(err?.extensions?.code ?? '');
  const classification = String(err?.extensions?.classification ?? '').toUpperCase();
  const path = Array.isArray(err?.path) ? err.path.join('.') : '';
  return { message, code, classification, path };
}

export function getGQLError(resOrBody) {
  // allow both: gqlError(res) or gqlError(body)
  const body = resOrBody?.body ?? resOrBody;
  return _extractGqlError(body);
}

// Syntactically-valid but invalid JWT → reliably 401 (no GraphQL errors[])
export const INVALID_JWT =
  'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJpbnZhbGlkIiwiZXhwIjoxNTAwMDAwMDAwfQ.invalidsig';

// Headers helpers
export const bearerInvalid = () => ({ Authorization: `Bearer ${INVALID_JWT}` });
export const noAuth = Object.freeze({}); // convenience for "no bearer"

/**
 * Thin "safe" layer that does NOT throw.
 * - ok: boolean (HTTP ok AND no GraphQL errors)
 * - error: short string for expect()/logging
 * - body: parsed JSON (or null)
 */
export async function safeGraphQL(api, args) {
  const { res, body } = await graphql(api, args);
  const status = res.status();

  // --- 1) Transport-level failure (non-2xx from gateway/proxy)
  if (!res.ok()) {
    const text = await res.text().catch(() => '');
    return {
      ok: false,
      body,
      error: `HTTP ${status} ${String(text).slice(0, 200)}`,
      httpStatus: status,
      httpOk: false,

      // structured fields (null for transport failures)
      errorCode: null,
      errorClass: null,
      errorMessage: text ? String(text).slice(0, 200) : null,
      errorPath: null,
    };
  }

  // --- 2) Resolver/schema failure (HTTP 200 but GraphQL errors[])
  if (Array.isArray(body?.errors) && body.errors.length > 0) {
    // NOTE: pass the WHOLE body, not body.errors
    const { message, code, classification, path } = _extractGqlError(body);

    const compact =
      (code ? `${code}: ` : '') + (message || JSON.stringify(body.errors).slice(0, 300));

    return {
      ok: false,
      body,
      error: compact.slice(0, 400),
      httpStatus: status,
      httpOk: true,

      // structured fields for tests
      errorCode: code || null, // e.g., "409"
      errorClass: classification || null, // e.g., "CONFLICT"
      errorMessage: message || null, // human-readable
      errorPath: path || null, // e.g., "administrator.rider.register"
    };
  }

  // --- 3) Success
  return {
    ok: true,
    body,
    error: null,
    httpStatus: status,
    httpOk: true,
    errorCode: null,
    errorClass: null,
    errorMessage: null,
    errorPath: null,
  };
}

// ============================================================================
// Domain helpers (Auth)
// ============================================================================

const LOGIN_MUTATION = `
  mutation ($username: String!, $password: String!) {
    patient {
      auth {
        login(username: $username, password: $password) {
          accessToken
          refreshToken
        }
      }
    }
  }
`;

/**
 * Login with username/password and return tokens.
 * - Hard-require both fields to avoid accidental undefined vars.
 * - Returns { accessToken, refreshToken, raw } where "raw" is the safeGraphQL envelope.
 */
export async function loginAndGetTokens(api, { username, password }) {
  if (!username || !password) {
    throw new Error('loginAndGetTokens: username and password are required');
  }
  const raw = await safeGraphQL(api, {
    query: LOGIN_MUTATION,
    variables: { username, password },
  });
  if (!raw.ok) {
    throw new Error(`Login failed: ${raw.error || 'unknown error'}`);
  }
  const node = raw.body?.data?.patient?.auth?.login;
  return {
    accessToken: node?.accessToken ?? null,
    refreshToken: node?.refreshToken ?? null,
    raw,
  };
}

/** Convenience builder for Bearer header from an access token. */
export function bearer(token) {
  if (!token) throw new Error('bearer: token is required');
  return { Authorization: `Bearer ${token}` };
}

// ----- Admin login (parallel to patient login)
const ADMIN_LOGIN_MUTATION = `
  mutation ($username: String!, $password: String!) {
    administrator {
      auth {
        login(username: $username, password: $password) {
          accessToken
          refreshToken
        }
      }
    }
  }
`;

/** Login as administrator and return tokens. */
export async function adminLoginAndGetTokens(api, { username, password }) {
  if (!username || !password) {
    throw new Error('adminLoginAndGetTokens: username and password are required');
  }
  const raw = await safeGraphQL(api, {
    query: ADMIN_LOGIN_MUTATION,
    variables: { username, password },
  });
  if (!raw.ok) {
    throw new Error(`Admin login failed: ${raw.error || 'unknown error'}`);
  }
  const node = raw.body?.data?.administrator?.auth?.login;
  return {
    accessToken: node?.accessToken ?? null,
    refreshToken: node?.refreshToken ?? null,
    raw,
  };
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
  const errs =
    Array.isArray(result.errors) && result.errors.length
      ? result.errors
      : result.error
        ? [result.error]
        : [];

  const msgs = errs.map((e) => stripAnsi(e.message || '').trim()).filter(Boolean);
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
      return m && m[1] ? m[1] : slice;
    }
  }
  // Fallback: first non-empty line
  return msgs[0].split('\n').find((l) => l.trim().length) || msgs[0];
}

/**
 * Enqueue a failure message for a given API test.
 */
export function enqueueApiFailure({ title, snippet }) {
  enqueueMessage(async () => {
    await sendAPIFailure({ title, snippet });
  });
}

// ============================================================================
// EXPECTED CONSTANTS FOR TESTS
// ============================================================================
export const NOAUTH_MESSAGES = [
  'Unauthorized',
  'Unauthorized Access',
  'Access Denied',
  'INTERNAL_SERVER_ERROR',
  'invalid value',
];

// Prebuilt regex pattern for matching any of the above messages
export const NOAUTH_MESSAGE_PATTERN = new RegExp(`(${NOAUTH_MESSAGES.join('|')})`);

export const NOAUTH_CLASSIFICATIONS = [
  'UNAUTHORIZED',
  'CONFLICT',
  'INTERNAL_ERROR',
  'VALIDATIONERROR',
];

export const NOAUTH_CODES = ['401', '500'];

export const NOAUTH_HTTP_STATUSES = [401, 403, 500];
