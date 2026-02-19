#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { Client, GatewayIntentBits } = require('discord.js');

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

function describeChannelRoute() {
  if (!isPublishEnabled()) return 'LOCAL_RUNS_CHANNELID (REPORT_PUBLISH=0)';
  const envName = String(process.env.TEST_ENV || 'DEV').toUpperCase();
  if (envName === 'DEV') return 'DEV_TESTING_CHANNELID (publish enabled)';
  if (envName === 'QA') return 'QA_TESTING_CHANNELID (publish enabled)';
  if (envName === 'PROD') return 'PROD_TESTING_CHANNELID (publish enabled)';
  return 'LOCAL_RUNS_CHANNELID (unknown TEST_ENV fallback)';
}

function walk(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop();
    const entries = fs.readdirSync(cur, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(cur, e.name);
      if (e.isDirectory()) stack.push(full);
      else out.push(full);
    }
  }
  return out;
}

function parseAttr(tag, name) {
  const m = tag.match(new RegExp(`${name}="(\\d+)"`, 'i'));
  return m ? Number(m[1]) : 0;
}

function parseJUnit(xmlText) {
  const testsuitesTag = xmlText.match(/<testsuites\b[^>]*>/i)?.[0] || '';
  const tests = parseAttr(testsuitesTag, 'tests');
  const failures = parseAttr(testsuitesTag, 'failures');
  const skipped = parseAttr(testsuitesTag, 'skipped');

  const failedCaseIds = new Set();
  const testcaseRegex = /<testcase\b[^>]*name="([^"]+)"[^>]*>([\s\S]*?)<\/testcase>/gi;
  let m;
  while ((m = testcaseRegex.exec(xmlText)) !== null) {
    const name = m[1] || '';
    const body = m[2] || '';
    if (!/<failure\b/i.test(body)) continue;
    const ids = name.match(/(?:PHARMA|E2E)-\d+/gi) || [];
    ids.forEach((id) => failedCaseIds.add(id.toUpperCase()));
  }

  return { tests, failures, skipped, failedCaseIds: Array.from(failedCaseIds) };
}

function mergeBlobReports(blobDir) {
  const zipFiles = walk(blobDir).filter((f) => f.endsWith('.zip'));
  if (zipFiles.length === 0) return false;

  const mergeDir = path.resolve(blobDir, '__merge');
  fs.rmSync(mergeDir, { recursive: true, force: true });
  fs.mkdirSync(mergeDir, { recursive: true });

  const copied = new Set();
  for (const zipPath of zipFiles) {
    const name = path.basename(zipPath);
    const dest = path.join(mergeDir, copied.has(name) ? `${Date.now()}-${name}` : name);
    copied.add(name);
    fs.copyFileSync(zipPath, dest);
  }

  const res = spawnSync('npx', ['playwright', 'merge-reports', '--reporter', 'html', mergeDir], {
    encoding: 'utf-8',
    env: {
      ...process.env,
      DISCORD_REPORTER: '0',
    },
  });

  if (res.status !== 0) {
    const logs = `${res.stdout || ''}\n${res.stderr || ''}`.trim();
    console.error('[ci-finalize] merge-reports failed');
    if (logs) console.error(logs);
    return false;
  }

  return fs.existsSync(path.resolve('.playwright-report'));
}

function publishReportIfAvailable() {
  const shouldPublish = isPublishEnabled();
  if (!shouldPublish) return { reportUrl: null, traceIndexUrl: null };
  if (!fs.existsSync(path.resolve('.playwright-report'))) return { reportUrl: null, traceIndexUrl: null };

  const res = spawnSync(process.execPath, ['scripts/publish-report.js'], { encoding: 'utf-8' });
  const out = `${res.stdout || ''}\n${res.stderr || ''}`;
  const reportUrl = out.match(/REPORT_URL=(\S+)/)?.[1] || null;
  const traceIndexUrl = out.match(/TRACE_INDEX_URL=(\S+)/)?.[1] || null;

  if (res.status !== 0) {
    console.error('[ci-finalize] publish-report.js failed');
    console.error(out.trim());
    return { reportUrl: null, traceIndexUrl: null };
  }

  return { reportUrl, traceIndexUrl };
}

function inferSuiteName(projectValue) {
  const normalized = String(projectValue || '').toLowerCase();
  if (normalized === 'api') return '🧭 API Test Suite';
  if (normalized === 'e2e') return '🌐 End2End Test Suite';
  return '🛠️ End2End & API Test Suites';
}

function buildFinalMessage({ suiteLabel, passed, failed, skipped, failedCaseIds, reportUrl, traceIndexUrl }) {
  const total = (passed || 0) + (failed || 0) + (skipped || 0);
  let content = `${suiteLabel}\nTests completed ✅ 100% [${total}/${total}]\n\n📊 Test Summary\n✅ Passed: ${passed}\n❌ Failed: ${failed}\n⚪ Skipped: ${skipped}`;

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
      const baseUrl = process.env.CI_RERUN_URL_BASE || 'https://ci.example.com/rerun?grep=';
      const rerunUrl = `${baseUrl}${encodeURIComponent(grep)}`;

      content += `\n\n🔁 Rerun the failures [here](${rerunUrl})\n🛠️ Rerun the failures manually:\n\`${grepCmd}\``;
    }
  }

  if (reportUrl) content += `\n\n🔗 Playwright HTML report is [here](${reportUrl})`;
  else content += `\n\nReport link unavailable (publish disabled or failed).`;

  if (traceIndexUrl) content += `\n🔎 Playwright trace index is [here](${traceIndexUrl})`;
  return content;
}

(async () => {
  const token = process.env.DISCORD_BOT_TOKEN;
  const channelId = resolveDiscordChannelId();
  if (!token || !channelId) {
    console.log('[ci-finalize] Discord secrets missing. Skipping Discord finalize.');
    return;
  }
  console.log(`[ci-finalize] Channel route: ${describeChannelRoute()} -> ${channelId}`);
  console.log(
    `[ci-finalize] Context: TEST_ENV=${process.env.TEST_ENV || 'DEV'} REPORT_PUBLISH=${
      process.env.REPORT_PUBLISH ?? '(unset)'
    }`
  );

  const junitRoot = path.resolve(process.env.CI_JUNIT_DIR || '.ci-artifacts/junit');
  const blobRoot = path.resolve(process.env.CI_BLOB_DIR || '.ci-artifacts/blob');
  const junitFiles = walk(junitRoot).filter((f) => f.endsWith('.xml'));
  if (junitFiles.length === 0) {
    console.log('[ci-finalize] No JUnit artifacts found; skipping finalize message.');
    return;
  }

  let tests = 0;
  let failures = 0;
  let skipped = 0;
  const failedIdSet = new Set();

  for (const file of junitFiles) {
    const xml = fs.readFileSync(file, 'utf-8');
    const parsed = parseJUnit(xml);
    tests += parsed.tests;
    failures += parsed.failures;
    skipped += parsed.skipped;
    parsed.failedCaseIds.forEach((id) => failedIdSet.add(id));
  }

  const passed = Math.max(0, tests - failures - skipped);
  const rerunTags = (process.env.RERUN_TAGS || '').trim();
  const envName = process.env.TEST_ENV || 'DEV';
  const rerunProject = process.env.RERUN_PROJECT || 'all';
  const suiteName = inferSuiteName(rerunProject);
  const grepLabel = rerunTags || 'all';
  const suiteLabel = `${suiteName}: ${envName} | ${grepLabel}`;

  mergeBlobReports(blobRoot);
  const { reportUrl, traceIndexUrl } = publishReportIfAvailable();

  const finalContent = buildFinalMessage({
    suiteLabel,
    passed,
    failed: failures,
    skipped,
    failedCaseIds: Array.from(failedIdSet),
    reportUrl,
    traceIndexUrl,
  });

  const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });
  await client.login(token);
  const channel = await client.channels.fetch(channelId);

  const headerMessage = await channel.send({ content: suiteLabel });
  await headerMessage.startThread({
    name: `${suiteName} Run Logs`,
    autoArchiveDuration: 1440,
  });

  await headerMessage.edit(finalContent);

  await client.destroy();
})();
