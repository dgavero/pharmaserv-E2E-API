// scripts/ci/publish-report.js
const ghpages = require('gh-pages');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawnSync } = require('node:child_process');

// === CONFIG ===
const REPORTS_DIR = path.resolve('reports'); // local folder that accumulates all runs
const SOURCE_DIR = path.resolve('.playwright-report'); // Playwright output
const TEST_RESULTS_DIR = path.resolve('test-results'); // Playwright test artifacts (trace.zip on failures)
const KEEP_DAYS = 10; // retention window
const REPO = 'dgavero/pharmaserv-E2E-API';
const BASE_URL = `https://${REPO.split('/')[0]}.github.io/${REPO.split('/')[1]}/reports`;
const TRACE_VIEWER_BASE = 'https://trace.playwright.dev/?trace=';

// === HELPERS ===
function timestampFolderName() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `run-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

function parseRunFolderTimestampMs(folderName) {
  const match = /^run-(\d{4})-(\d{2})-(\d{2})-(\d{2})(\d{2})(\d{2})$/.exec(folderName);
  if (!match) return null;
  const [, year, month, day, hour, minute, second] = match;
  return Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
}

function pruneOldReports() {
  if (!fs.existsSync(REPORTS_DIR)) return;
  const cutoff = Date.now() - KEEP_DAYS * 24 * 60 * 60 * 1000;
  for (const entry of fs.readdirSync(REPORTS_DIR)) {
    const full = path.join(REPORTS_DIR, entry);
    const stat = fs.statSync(full);
    if (!stat.isDirectory()) continue;

    const runTs = parseRunFolderTimestampMs(entry);
    const ageBasis = runTs ?? stat.mtimeMs;
    if (ageBasis < cutoff) {
      console.log(`🧹 Pruning old report: ${entry}`);
      fs.rmSync(full, { recursive: true, force: true });
    }
  }
}

function hydrateExistingReports() {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || process.env.GH_PAGES_TOKEN;
  const cloneUrl = token ? `https://x-access-token:${token}@github.com/${REPO}.git` : `https://github.com/${REPO}.git`;

  // We intentionally clone gh-pages instead of reading local .git history.
  // In CI this script runs inside Docker, and .dockerignore excludes .git.
  // Cloning gh-pages gives us the previously published /reports content so
  // each new publish can preserve recent runs instead of replacing them.
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pw-reports-'));
  try {
    // Shallow clone keeps network/storage overhead small.
    const clone = spawnSync(
      'git',
      ['clone', '--depth=1', '--single-branch', '--branch', 'gh-pages', cloneUrl, tmpRoot],
      { encoding: 'utf-8' }
    );
    if (clone.status !== 0) {
      console.warn('⚠️ Skipped history hydration: unable to clone gh-pages branch');
      return false;
    }

    const srcReports = path.join(tmpRoot, 'reports');
    if (!fs.existsSync(srcReports)) {
      console.log('ℹ️ No existing reports found on gh-pages; starting fresh');
      return true;
    }

    for (const entry of fs.readdirSync(srcReports)) {
      fs.cpSync(path.join(srcReports, entry), path.join(REPORTS_DIR, entry), { recursive: true });
    }
    console.log('📥 Hydrated existing reports from gh-pages');
    return true;
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
}

function walkDir(rootDir) {
  const out = [];
  if (!fs.existsSync(rootDir)) return out;
  const stack = [rootDir];
  while (stack.length) {
    const curr = stack.pop();
    const entries = fs.readdirSync(curr, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(curr, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else out.push(full);
    }
  }
  return out;
}

function safeSlug(input) {
  const raw = String(input || '').toLowerCase();
  return (
    raw
      .replace(/[^a-z0-9-_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 90) || 'trace'
  );
}

function escapeHtml(input) {
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildPublishOptions(folderName, keepRemoteOnFailure = false) {
  const options = {
    branch: 'gh-pages',
    dest: 'reports', // put contents under /reports on the branch
    message: `publish: ${folderName}`,
    dotfiles: true,
    // Normal path: add=false (replace remote /reports with curated local folder,
    // which includes hydrated history + current run + retention pruning).
    // Fallback path: add=true when hydration failed, to avoid deleting remote
    // reports due to missing baseline history in local workspace.
    add: keepRemoteOnFailure,
  };

  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || process.env.GH_PAGES_TOKEN;
  const isCI = String(process.env.CI || '').toLowerCase() === 'true';
  if (isCI && token) {
    // Ensure CI pushes via token even when git credentials are not propagated
    options.repo = `https://x-access-token:${token}@github.com/${REPO}.git`;
  }
  return options;
}

function prepareTraceArtifacts(destDir, folderName) {
  const traceZips = walkDir(TEST_RESULTS_DIR).filter((file) => path.basename(file) === 'trace.zip');
  if (traceZips.length === 0) return null;

  const tracesDir = path.join(destDir, 'traces');
  const filesDir = path.join(tracesDir, 'files');
  fs.mkdirSync(filesDir, { recursive: true });

  const items = traceZips.map((srcPath, idx) => {
    const relCaseDir = path.relative(TEST_RESULTS_DIR, path.dirname(srcPath)) || 'root';
    const name = `${String(idx + 1).padStart(2, '0')}-${safeSlug(relCaseDir)}.zip`;
    const destPath = path.join(filesDir, name);
    fs.copyFileSync(srcPath, destPath);

    const zipUrl = `${BASE_URL}/${folderName}/traces/files/${name}`;
    const viewerUrl = `${TRACE_VIEWER_BASE}${encodeURIComponent(zipUrl)}`;

    return {
      name,
      relCaseDir,
      zipUrl,
      viewerUrl,
    };
  });

  const listItems = items
    .map(
      (item) => `<li>
  <strong>${escapeHtml(item.relCaseDir)}</strong><br/>
  <a href="${item.viewerUrl}">Open in Playwright Trace Viewer</a> |
  <a href="${item.zipUrl}">Download trace.zip</a>
</li>`
    )
    .join('\n');

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Playwright Traces - ${folderName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 24px; line-height: 1.5; }
    h1 { margin-bottom: 6px; }
    p { color: #444; margin-top: 0; }
    li { margin-bottom: 12px; }
  </style>
</head>
<body>
  <h1>Playwright Traces</h1>
  <p>Run: <code>${escapeHtml(folderName)}</code></p>
  <ul>
    ${listItems}
  </ul>
</body>
</html>`;

  fs.writeFileSync(path.join(tracesDir, 'index.html'), html, 'utf-8');
  console.log(`🧵 Prepared ${items.length} trace file(s) in ${tracesDir}`);
  return `${BASE_URL}/${folderName}/traces/index.html`;
}

// === MAIN ===
(async () => {
  try {
    // 1) Ensure reports dir
    if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR);
    // Load current gh-pages reports into local folder first.
    // This is required for retention to work across CI runs.
    const hydrationOk = hydrateExistingReports();

    // 2) Copy the latest PW report into a timestamped subfolder
    const folderName = timestampFolderName();
    const destDir = path.join(REPORTS_DIR, folderName);
    fs.cpSync(SOURCE_DIR, destDir, { recursive: true });
    console.log(`📦 Copied report to ${destDir}`);
    const traceIndexUrl = prepareTraceArtifacts(destDir, folderName);

    // 3) Prune old runs
    pruneOldReports();

    // 4) (Optional) Drop a .nojekyll inside reports/ (usually not needed, but harmless)
    try {
      fs.writeFileSync(path.join(REPORTS_DIR, '.nojekyll'), '');
    } catch {}

    // 5) Publish the local REPORTS_DIR, but place it under 'reports' on gh-pages
    ghpages.publish(
      REPORTS_DIR,
      // If hydration failed, publish additively to protect existing reports.
      buildPublishOptions(folderName, !hydrationOk),
      (err) => {
        if (err) {
          console.error('❌ Report publish failed:', err);
          process.exit(1);
        } else {
          const url = `${BASE_URL}/${folderName}/index.html`;
          console.log(`✅ Report published: ${url}`);
          // will be used to parse the url and pass to discord reporter
          console.log(`REPORT_URL=${url}`);
          if (traceIndexUrl) {
            console.log(`TRACE_INDEX_URL=${traceIndexUrl}`);
          }
        }
      }
    );
  } catch (err) {
    console.error('❌ Error preparing report:', err);
    process.exit(1);
  }
})();
