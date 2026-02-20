/**
+ * Custom Playwright reporter for Discord integration.
+ * - Live progress header updates after every test (REST).
+ * - API failures: enqueue compact snippets immediately in onTestEnd
+ *   (the API helper auto-flushes ~100ms later, so messages appear per-test).
+ * - Final summary appended once all tests complete.
+ */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { appendSummary, shutdownBot, editRunningHeader } from './discordBot.js';
import { flushApiReports, extractApiFailureSnippet, enqueueApiFailure } from '../../api/helpers/testUtilsAPI.js';

function sanitizePublishLogs(text) {
  if (!text) return '';
  return String(text)
    .replace(/(x-access-token:)[^@]+@/gi, '$1***@')
    .replace(/(ghp_[a-z0-9_]+)/gi, '***')
    .replace(/(github_pat_[a-z0-9_]+)/gi, '***');
}

function walkDir(rootDir) {
  const out = [];
  if (!fs.existsSync(rootDir)) return out;
  const stack = [rootDir];
  while (stack.length) {
    const cur = stack.pop();
    const entries = fs.readdirSync(cur, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(cur, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else out.push(full);
    }
  }
  return out;
}

class DiscordReporter {
  constructor() {
    this.statePath = path.resolve('.discord-cumulative.json');
    this.batchIndex = parseInt(process.env.DISCORD_BATCH_INDEX || '1', 10);
    this.batchCount = parseInt(process.env.DISCORD_BATCH_COUNT || '1', 10);
    this.reuseRun = String(process.env.DISCORD_REUSE_RUN || '0') === '1';
    // Running tallies for the current suite.
    this.passed = 0;
    this.failed = 0;
    this.skipped = 0;

    // Progress counters for header updates.
    this.total = 0; // set once at start (planned tests after filters)
    this.completed = 0; // incremented on each test end (pass/fail/skip)

    // Track failed test IDs (e.g., PHARMA-123, E2E-2) for rerun convenience.
    this.failedCaseIds = new Set();
  }

  loadCumulativeState() {
    if (!this.reuseRun || this.batchCount <= 1) return null;
    try {
      return JSON.parse(fs.readFileSync(this.statePath, 'utf-8'));
    } catch {
      return null;
    }
  }

  saveCumulativeState() {
    if (!this.reuseRun || this.batchCount <= 1) return;
    const snapshot = {
      passed: this.passed,
      failed: this.failed,
      skipped: this.skipped,
      total: this.total,
      completed: this.completed,
      failedCaseIds: Array.from(this.failedCaseIds),
    };
    fs.writeFileSync(this.statePath, JSON.stringify(snapshot, null, 2));
  }

  mergeSafeBatchBlobReports() {
    if (!this.reuseRun || this.batchCount <= 1) return true;
    const blobRoot = path.resolve('.blob-report');
    const zipFiles = walkDir(blobRoot).filter((file) => file.endsWith('.zip'));
    if (zipFiles.length === 0) return false;

    const mergeInputDir = path.resolve('.blob-report', '__merge-input');
    fs.rmSync(mergeInputDir, { recursive: true, force: true });
    fs.mkdirSync(mergeInputDir, { recursive: true });

    for (const [idx, zipPath] of zipFiles.entries()) {
      const dest = path.join(mergeInputDir, `${String(idx + 1).padStart(4, '0')}-${path.basename(zipPath)}`);
      fs.copyFileSync(zipPath, dest);
    }

    const res = spawnSync(
      'npx',
      ['playwright', 'merge-reports', '--reporter', 'html', mergeInputDir],
      { encoding: 'utf-8' }
    );
    if (res.status !== 0) {
      const logs = sanitizePublishLogs((res.stdout || '') + (res.stderr || ''));
      console.error(
        `[DiscordReporter] merge-reports failed (status=${res.status}, signal=${res.signal || 'none'})`
      );
      if (logs.trim()) console.error('[DiscordReporter] merge logs:\n' + logs.trim());
      return false;
    }
    return true;
  }

  /**
   * Called once before any test runs.
   * - Discovers the exact set of tests that will run (after grep/tags/CLI filters).
   * - Immediately renders "0% [0/N]" so the Discord header shows progress from the start.
   */
  async onBegin(config, suite) {
    const prior = this.loadCumulativeState();
    if (prior) {
      this.passed = Number(prior.passed || 0);
      this.failed = Number(prior.failed || 0);
      this.skipped = Number(prior.skipped || 0);
      this.completed = Number(prior.completed || 0);
      this.total = Number(prior.total || 0);
      for (const id of prior.failedCaseIds || []) this.failedCaseIds.add(id);
    }

    const all = suite.allTests();
    this.total += all.length;
    await editRunningHeader({
      completed: this.completed,
      total: this.total,
      passed: this.passed,
      failed: this.failed,
      skipped: this.skipped,
    });
  }

  /**
   * Called after each test completes (pass/fail/skip).
   * - Updates counters.
   * - Re-renders the running header with the latest percentage and [completed/total].
   *
   * Note: If retries are enabled, onTestEnd fires per attempt. For small suites this is fine;
   *       when the suite grows, consider counting a test as completed only once (final outcome).
   */
  async onTestEnd(test, result) {
    this.completed += 1;

    if (result.status === 'passed') this.passed += 1;
    else if (result.status === 'skipped') this.skipped += 1;
    else {
      this.failed += 1;
      const matches = (test.title || '').match(/(?:PHARMA|E2E)-\d+/g) || [];
      for (const id of matches) this.failedCaseIds.add(id);
      // Post compact API failure snippet (only for API project)
      const isApi = (test.parent?.project()?.name || '').toLowerCase() === 'api';
      if (isApi) {
        const snippet = extractApiFailureSnippet(result);  // strips ANSI; picks Error/Expected/Received
        enqueueApiFailure({ title: test.title, snippet });  // scheduleFlush() runs in the helper
      }
    }

    await editRunningHeader({
      completed: this.completed,
      total: this.total,
      passed: this.passed,
      failed: this.failed,
      skipped: this.skipped,
    });
  }

  /**
   * Called once after the entire run finishes.
   * - Replaces the running header with the final summary (existing format).
   * - Closes the Gateway client (clean shutdown).
   */
  async onEnd() {
    // For multi-batch reused runs, only finalize on the last batch.
    const isLastBatch = !this.reuseRun || this.batchCount <= 1 || this.batchIndex >= this.batchCount;
    if (!isLastBatch) {
      this.saveCumulativeState();
      try { await flushApiReports(); } catch (e) { console.error('[API Reporter] flush failed', e); }
      await shutdownBot();
      return;
    }

    // Merge safe-batch blob outputs into one final HTML report before publish.
    this.mergeSafeBatchBlobReports();

    // At test suite end:
    // - Auto-publishes Playwright HTML report to GitHub Pages (unless disabled via REPORT_PUBLISH=0)
    // - Parses machine-readable "REPORT_URL=..." line
    // - Passes link into appendSummary so it appears in final Discord message
     let reportUrl = null;
     let traceIndexUrl = null;
     const isCI = String(process.env.CI || '').toLowerCase() === 'true';
     const reportPublishRaw = process.env.REPORT_PUBLISH;
     const shouldPublish =
       reportPublishRaw == null || reportPublishRaw === ''
         ? isCI
         : reportPublishRaw !== '0';

     if (shouldPublish) {
       try {
         const res = spawnSync(process.execPath, ['scripts/publish-report.js'], { encoding: 'utf-8' });
         const out = sanitizePublishLogs((res.stdout || '') + (res.stderr || ''));
         const m = out.match(/REPORT_URL=(\S+)/);
         if (m) reportUrl = m[1];
         const t = out.match(/TRACE_INDEX_URL=(\S+)/);
         if (t) traceIndexUrl = t[1];
         if (res.status !== 0 || !reportUrl) {
           console.error(
             `[DiscordReporter] report publish issue (status=${res.status}, signal=${res.signal || 'none'})`
           );
           if (out.trim()) {
             console.error('[DiscordReporter] publish logs:\n' + out.trim());
           }
         }
       } catch (_) {
         // ignore; we'll just fall back to local path in the summary
         console.error('[DiscordReporter] publish-report.js threw unexpectedly');
       }
     }

    // Ensure queued API failure messages are posted before the final summary.
    try { await flushApiReports(); } catch (e) { console.error('[API Reporter] flush failed', e); }

     await appendSummary({
       passed: this.passed,
       failed: this.failed,
       skipped: this.skipped,
       failedCaseIds: Array.from(this.failedCaseIds),
       reportUrl, // let the bot render a direct link if available
       traceIndexUrl,
     });
     try {
       fs.rmSync(this.statePath, { force: true });
     } catch {}
     await shutdownBot();
  }
}

export default DiscordReporter;
