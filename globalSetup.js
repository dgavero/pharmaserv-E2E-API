// Cleans artifacts BEFORE every test run
import fs from 'fs';
import path from 'path';
import discordSetup from './helpers/discord/discordSetup.js';

function cleanDir(relPath) {
  const dir = path.join(process.cwd(), relPath);
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

export default async function globalSetup(config) {
  cleanDir('screenshots');
  cleanDir('.playwright-report');
  cleanDir('test-results');
  console.log('🧹 Cleaned screenshots, playwright-report, test-results');

  // Global setup: posts the Discord header + thread before tests
  await discordSetup(config);
}
