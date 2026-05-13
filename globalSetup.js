// Cleans artifacts BEFORE every test run
import fs from 'fs';
import path from 'path';
import discordSetup from './helpers/discord/discordSetup.js';

function cleanDir(relPath) {
  const dir = path.join(process.cwd(), relPath);
  if (!fs.existsSync(dir)) return;

  try {
    fs.rmSync(dir, { recursive: true, force: true });
    return;
  } catch (error) {
    // Mounted dirs on CI can be busy; clear contents instead of deleting mountpoint.
    const errorCode = error?.code;
    const errorMessage = String(error?.message || '').toLowerCase();
    const isMountedDirError =
      ['EBUSY', 'EPERM', 'ENOTEMPTY'].includes(errorCode) ||
      errorMessage.includes('device or resource busy') ||
      errorMessage.includes('resource busy');

    if (!isMountedDirError) {
      throw error;
    }
  }

  for (const entry of fs.readdirSync(dir)) {
    fs.rmSync(path.join(dir, entry), { recursive: true, force: true });
  }
}

export default async function globalSetup(config) {
  cleanDir('screenshots');
  cleanDir('.playwright-report');
  cleanDir('test-results');
  // Intentionally do not clean .blob-report here. Top-level runner scripts own blob cleanup
  // so each full run starts fresh without wiping multi-batch blob accumulation mid-sequence.
  console.log('🧹 Cleaned screenshots, playwright-report, test-results');

  // Global setup: posts the Discord header + thread before tests
  await discordSetup(config);
}
