// scripts/publish-report.js
const ghpages = require('gh-pages');
const path = require('path');
const fs = require('fs');

// === CONFIG ===
const REPORTS_DIR = path.resolve('reports');                 // local folder that accumulates all runs
const SOURCE_DIR  = path.resolve('.playwright-report');      // Playwright output
const KEEP_DAYS   = 15;                                      // retention window
const REPO        = 'dgavero/playwright-automation-template';
const BASE_URL    = `https://${REPO.split('/')[0]}.github.io/${REPO.split('/')[1]}/reports`;

// === HELPERS ===
function timestampFolderName() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `run-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

function pruneOldReports() {
  if (!fs.existsSync(REPORTS_DIR)) return;
  const cutoff = Date.now() - KEEP_DAYS * 24 * 60 * 60 * 1000;
  for (const entry of fs.readdirSync(REPORTS_DIR)) {
    const full = path.join(REPORTS_DIR, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory() && stat.mtimeMs < cutoff) {
      console.log(`🧹 Pruning old report: ${entry}`);
      fs.rmSync(full, { recursive: true, force: true });
    }
  }
}

// === MAIN ===
(async () => {
  try {
    // 1) Ensure reports dir
    if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR);

    // 2) Copy the latest PW report into a timestamped subfolder
    const folderName = timestampFolderName();
    const destDir = path.join(REPORTS_DIR, folderName);
    fs.cpSync(SOURCE_DIR, destDir, { recursive: true });
    console.log(`📦 Copied report to ${destDir}`);

    // 3) Prune old runs
    pruneOldReports();

    // 4) (Optional) Drop a .nojekyll inside reports/ (usually not needed, but harmless)
    try { fs.writeFileSync(path.join(REPORTS_DIR, '.nojekyll'), ''); } catch {}

    // 5) Publish the local REPORTS_DIR, but place it under 'reports' on gh-pages
    ghpages.publish(
      REPORTS_DIR,
      {
        branch: 'gh-pages',
        dest: 'reports',                 // <-- put contents under /reports on the branch
        message: `publish: ${folderName}`,
        dotfiles: true,
        add: false,                      // overwrite the 'reports' folder each time (we already manage retention)
      },
      (err) => {
        if (err) {
          console.error('❌ Report publish failed:', err);
          process.exit(1);
        } else {
          const url = `${BASE_URL}/${folderName}/index.html`;
          console.log(`✅ Report published: ${url}`);
          // will be used to parse the url and pass to discord reporter
          console.log(`REPORT_URL=${url}`);
        }
      }
    );
  } catch (err) {
    console.error('❌ Error preparing report:', err);
    process.exit(1);
  }
})();
