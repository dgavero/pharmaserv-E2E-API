// Initializes the Discord run: posts header + creates thread, then shuts down Gateway.

import { sendSuiteHeader, shutdownBot } from './discordBot.js';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Extracts the raw value passed to Playwright via --grep / -g.
 * - Supports both split args:  --grep somePattern
 * - And inline form:           --grep=/samples/i
 * Returns the raw string or null if not present.
 */
function extractRawGrepFromArgs() {
  const idx = process.argv.findIndex((a) => a === '--grep' || a === '-g');
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1];
  const inline = process.argv.find((a) => a.startsWith('--grep='));
  if (inline) return inline.split('=')[1];
  return null;
}

/**
 * Converts a raw grep/tag string into a readable label for the header.
 * Examples:
 *   "/(smoke|samples)/i"  -> "smoke, samples"
 *   "samples"             -> "samples"
 *   "" or null            -> "all"
 * - Strips non-capturing groups (?:...) and parentheses for cleaner display.
 * - Normalizes "|" into a comma-separated list.
 */
function prettifyGrep(raw) {
  if (!raw) return 'all';
  const m = raw.match(/^\/(.+)\/[a-z]*$/i);
  const core = m ? m[1] : raw;
  const pretty = core.replace(/\(\?:/g, '(').replace(/[()]/g, '').trim();
  const parts = pretty
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length > 1 ? parts.join(', ') : pretty || 'all';
}

/**
 * Extracts projects from CLI, e.g.:
 *   --project e2e   --project api
 *   --project=e2e,api
 */
function extractProjectsFromArgs() {
  const set = new Set();
  for (let i = 0; i < process.argv.length; i++) {
    const a = process.argv[i];
    if (a === '--project' && process.argv[i + 1]) {
      process.argv[i + 1].split(',').forEach((p) => set.add(p.trim().toLowerCase()));
      i++;
    } else if (a.startsWith('--project=')) {
      a.split('=')[1]
        .split(',')
        .forEach((p) => set.add(p.trim().toLowerCase()));
    }
  }
  return set;
}

/**
 * Resolves which projects are intended to run based on env (PROJECT/PROJECTS)
 * and CLI (--project). If none specified → default to BOTH.
 */
function resolveProjectSet() {
  const set = new Set();
  const envVal = (process.env.PROJECT || process.env.PROJECTS || '').trim();
  if (envVal) {
    envVal.split(',').forEach((p) => set.add(p.trim().toLowerCase()));
  }
  const cli = extractProjectsFromArgs();
  cli.forEach((p) => set.add(p));
  return set; // may be empty => treat as BOTH
}

// Return suite title based on selected projects
function suiteNameFromProjects(projectsSet) {
  if (!projectsSet || projectsSet.size === 0) return '🛠️ End2End & API Test Suites';
  const hasE2E = projectsSet.has('e2e');
  const hasAPI = projectsSet.has('api');
  if (hasE2E && hasAPI) return '🛠️ End2End & API Test Suites';
  if (hasE2E) return '🌐 End2End Test Suite';
  if (hasAPI) return '🧭 API Test Suite';
  return 'Test Suite';
}


/**
 * Global setup for the Discord dashboard:
 * - Determines the environment label (TEST_ENV or "LOCAL").
 * - Chooses the visible "grep/tags" label:
 *     Prefer TAGS env (e.g., "samples|smoke"), otherwise fall back to CLI --grep.
 * - Posts the header + creates the run thread.
 * - Closes the Gateway client (we’ll use REST for live progress during the run).
 */
async function discordSetup() {
  const reuseRun = String(process.env.DISCORD_REUSE_RUN || '0') === '1';
  const runMetaPath = path.resolve('.discord-run.json');
  if (reuseRun && fs.existsSync(runMetaPath)) {
    return;
  }

  const testEnv = process.env.TEST_ENV || 'DEV';

  // Prefer env TAGS for clarity (e.g., "samples|smoke"); fallback to CLI --grep if absent.
  const raw =
    process.env.TAGS && process.env.TAGS.trim().length
      ? process.env.TAGS
      : extractRawGrepFromArgs();
  const grepLabel = prettifyGrep(raw);

  // Compute the suite title based on which projects are running
  const projects = resolveProjectSet();
  const suiteName = suiteNameFromProjects(projects);

  await sendSuiteHeader({
    suiteName,
    env: testEnv,
    grep: grepLabel,
  });

  // Close Gateway after setup to free resources.
  // Workers will use REST for live header edits during the run.
  await shutdownBot();
}

export default discordSetup;
