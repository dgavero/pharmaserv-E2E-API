/*
 * Discord client (Gateway) for posting the initial header + creating the thread.
 * Use the Gateway client only when needed (setup/summary). For fast, repeated
 * header edits during the run, use the REST client below.
 */

import { Client, GatewayIntentBits } from 'discord.js';
import fs from 'node:fs';
import path from 'node:path';
import { REST, Routes } from 'discord.js';

// --- Discord Tokens & Config ---
const TOKEN = process.env.DISCORD_BOT_TOKEN; // Used by Gateway client

// --- REST Client Setup ---
// Used for fast, frequent header edits (progress bar, running status, etc.)
const rest = TOKEN ? new REST({ version: '10' }).setToken(TOKEN) : null;

// --- Run Metadata Path ---
// Stores: channelId, headerMessageId, threadId, and suiteLabel.
// Written once during setup, read by all test workers.
// It's safe to overwrite on each new run; no manual cleanup required.
const RUN_META_PATH = path.resolve('.discord-run.json');

// --- Runtime State (lazily initialized) ---
let client = null; // Discord Gateway client (used for posting header + creating thread)
let channel = null; // Target channel instance (fetched once, reused)

function isPublishEnabled() {
  const raw = process.env.REPORT_PUBLISH;
  const isCI = String(process.env.CI || '').toLowerCase() === 'true';
  if (raw == null || raw === '') return isCI;
  return String(raw) !== '0';
}

function resolveDiscordChannelId() {
  if (!isPublishEnabled()) {
    return process.env.LOCAL_RUNS_CHANNELID;
  }

  const envName = String(process.env.TEST_ENV || 'DEV').toUpperCase();
  if (envName === 'DEV') return process.env.DEV_TESTING_CHANNELID || process.env.LOCAL_RUNS_CHANNELID;
  if (envName === 'QA') return process.env.QA_TESTING_CHANNELID || process.env.LOCAL_RUNS_CHANNELID;
  if (envName === 'PROD') return process.env.PROD_TESTING_CHANNELID || process.env.LOCAL_RUNS_CHANNELID;
  return process.env.LOCAL_RUNS_CHANNELID;
}

/*
 * Initializes the Discord Gateway client once and fetches the test-report channel.
 * Required for posting the initial header.
 * Required for creating the run thread.
 * Reused for fetching the header message when appending the summary.
 */
export async function initBot() {
  if (client) return client;
  const channelId = resolveDiscordChannelId();
  if (!TOKEN || !channelId) {
    throw new Error('Missing DISCORD_BOT_TOKEN or channel id (set TEST_ENV channel mappings)');
  }
  client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });
  await client.login(TOKEN);
  channel = await client.channels.fetch(channelId);
  return client;
}

/**
 * Post the suite header (top message) and create a thread for per-test logs.
 * Also persists metadata so other processes (workers) can edit/post consistently.
 */
export async function sendSuiteHeader({ suiteName, env, grep }) {
  await initBot();
  const channelId = resolveDiscordChannelId();

  // Compose the immutable "title" that we keep at the top of the header.
  // `env` comes from TEST_ENV; `grep` is your tag/filter summary shown in the header.
  const title = `${suiteName}: ${env} | ${grep || 'all'}`;

  // 1) Post the header message (this message gets edited throughout the run).
  const headerMessage = await channel.send({ content: title });

  // 2) Create a thread under the header for detailed per-test logs.
  const thread = await headerMessage.startThread({
    name: `${suiteName} Run Logs`,
    autoArchiveDuration: 1440, // 24h
  });

  // 3) Identifiers so every worker can find/update the same places.
  const meta = {
    threadId: thread.id,
    channelId,
    headerMessageId: headerMessage.id,
    suiteLabel: title, // we reuse this exact top line on every header edit
  };
  fs.writeFileSync(RUN_META_PATH, JSON.stringify(meta, null, 2));

  return { headerMessage, thread, metaPath: RUN_META_PATH };
}

/**
 * Reads the `.discord-run.json` file written during setup.
 * Used by **all test workers** to know where to post updates.
 * Returns `null` if the file doesn't exist yet.
 */
export function readRunMeta() {
  try {
    return JSON.parse(fs.readFileSync(RUN_META_PATH, 'utf-8'));
  } catch {
    return null;
  }
}

/**
 * Replace the header content with the final summary.
 * Uses the Gateway client (not REST) so it works even if we need richer capabilities later.
 */
export async function appendSummary({
  passed,
  failed,
  skipped,
  reportUrl,
  traceIndexUrl,
  failedCaseIds = [],
}) {
  const meta = readRunMeta();
  if (!meta || !rest) return;

  const total = (passed || 0) + (failed || 0) + (skipped || 0);
  let content = `${meta.suiteLabel}
Tests completed ✅ 100% [${total}/${total}]

📊 Test Summary
✅ Passed: ${passed}
❌ Failed: ${failed}
⚪ Skipped: ${skipped}`;

  if ((failed || 0) === 0) {
    content += `\n\nYay. No failures! 🎉`;
  } else {
    const uniqueIds = Array.from(new Set(failedCaseIds)).sort((a, b) => {
      const na = parseInt(a.split('-')[1], 10);
      const nb = parseInt(b.split('-')[1], 10);
      if (Number.isNaN(na) || Number.isNaN(nb)) return a.localeCompare(b);
      return na - nb;
    });

    if (uniqueIds.length) {
      const grep = uniqueIds.join('|');
      const testEnv = process.env.TEST_ENV || 'DEV';
      const threads = process.env.THREADS || '4';
      const grepCmd = `TEST_ENV=${testEnv} THREADS=${threads} TAGS="${grep}" npx playwright test`;

      content += `\n\n🛠️ Rerun the failures manually:
\`${grepCmd}\``;
    } else {
      content += `\n\n❗ Failed tests found, but no PHARMA-/E2E- IDs were detected in test titles.`;
    }
  }

  // Embed link to message for the HTML Report
  if (reportUrl) {
    content += `\n\n🔗 Playwright HTML report is [here](${reportUrl})`;
  } else {
    content += `\n\nReport link unavailable (publish disabled or failed).`;
  }
  if (traceIndexUrl) {
    content += `\n🔎 Playwright trace index is [here](${traceIndexUrl})`;
  }
  const embeds = [];

  // Edit the same header message we created at setup time
  await rest.patch(Routes.channelMessage(meta.channelId, meta.headerMessageId), {
    body: { content, embeds },
  });
}

/**
 * Updates the header while tests are running.
 * Shows a live progress bar ▰▰▱▱▱ + percentage + completed/total.
 * Uses REST for speed (lighter than Gateway).
 * If `.discord-run.json` doesn’t exist (setup didn’t run yet) OR
 * REST client isn't initialized (missing DISCORD_BOT_TOKEN), return early.
 * This avoids crashes during local/dev misconfigurations.
 */
export async function editRunningHeader({ completed, total, passed = 0, failed = 0, skipped = 0 }) {
  const meta = readRunMeta();
  if (!meta || !rest) return;

  // Build an 8-segment bar like: ▰▰▰▱▱▱▱▱
  const percent = total === 0 ? 0 : Math.floor((completed / total) * 100);
  const segments = 8;

  // Round to the nearest segment, clamp to [0, segments].
  const filled = Math.max(0, Math.min(segments, Math.round((percent / 100) * segments)));
  const bar = '▰'.repeat(filled) + '▱'.repeat(segments - filled);

  const content = `${meta.suiteLabel}
Tests are running ${bar} ${percent}% [${completed}/${total}]

📊 Test Summary
✅ Passed: ${passed}
❌ Failed: ${failed}
⚪ Skipped: ${skipped}`;

  // PATCH the same header message we originally posted in sendSuiteHeader().
  await rest.patch(Routes.channelMessage(meta.channelId, meta.headerMessageId), {
    body: { content },
  });
}

/**
 * Cleanly destroy the Gateway client (optional, avoids lingering sockets).
 * REST calls do not require the Gateway client to be connected.
 */
export async function shutdownBot() {
  if (client) {
    await client.destroy();
    client = null;
    channel = null;
  }
}

/**
 * ──────────────────────────────────────────────────────────────────────────────
 * 🔭 Scaling roadmap (for 150–300+ tests or long CI runs)
 * Keep behavior as-is for now; when the suite grows, consider these upgrades.
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * 1) Retry-aware progress counting
 *    - Problem: Playwright calls onTestEnd for every retry attempt.
 *      Current logic may overcount `completed`.
 *    - Plan: Track unique test identity (file + title + project) and only
 *      count as "completed" once per test (on its final result).
 *      (Option: use result.retry, result.retryCount, or a per-test map.)
 *
 * 2) Rate-limit safety on REST PATCH edits
 *    - Problem: Bursts (many tests finish at once) can trigger HTTP 429.
 *    - Plan: Serialize edits and add a tiny debounce (e.g., 100–300ms).
 *            Add retry-with-backoff on 429 (e.g., 0.5s, 1s, 2s + jitter).
 *    - Tip: Keep a single in-flight edit; coalesce subsequent renders.
 *
 * 3) Optional heartbeat for long quiet periods
 *    - Problem: If no tests finish for ~15+ min, header looks “stale.”
 *    - Plan: Low-frequency timer (e.g., every 10–15 min) that re-renders
 *            the same progress (no counter change) just to show liveness.
 *            Disable automatically once suite completes.
 *
 * 4) Large-suite readability
 *    - Problem: Very long titles or hundreds of tests can clutter updates.
 *    - Plan: Keep header compact (we already show % and [done/total]).
 *            If listing pending items elsewhere, truncate & show “+N more”.
 *
 * 5) Robust math & guards
 *    - Clamp values: completed ∈ [0, total], percent ∈ [0, 100].
 *    - Defensive parsing: coerce to numbers, handle NaN, total===0.
 *
 * 6) Resilience on REST failures
 *    - Add try/catch around PATCH; log minimal error context (status code).
 *    - If a render fails, allow the next render to overwrite stale state.
 *
 * 7) CI restarts / reruns
 *    - `.discord-run.json` is per-run. Ensure each fresh run overwrites it
 *      at setup. On rerun, workers read the new file automatically.
 *
 * 8) Tunables via env (future)
 *    - EDIT_DEBOUNCE_MS, RATE_LIMIT_BACKOFF_MS, HEARTBEAT_MINUTES, BAR_SEGMENTS
 *    - Keep defaults conservative; expose envs for CI overrides.
 *
 * ✅ Bottom line for today < 09/11/2025>
 *    - Current approach is perfectly fine for small/medium suites (your case).
 *    - Revisit this list once you approach ~200+ tests or see 429s / flaky counts.
 */

// =============================================================
// ========== API Specific Helpers (for test failure logs) =====
// =============================================================
/**
 * Post a compact API failure snippet to the run thread.
 * - snippet: cleaned lines (Error / Expected / Received)
 */
export async function sendAPIFailure({ title, where, snippet }) {
  const meta = readRunMeta();
  if (!meta || !rest || !meta.threadId) return; // bail if no thread yet

  const content = [`❌ **${title}**`, '```', (snippet || '').trim().slice(0, 1400), '```'].join('\n');

  await rest.post(Routes.channelMessages(meta.threadId), { body: { content } });
}
