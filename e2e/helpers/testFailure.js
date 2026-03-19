import fs from 'node:fs';
import path from 'node:path';
import { enqueueDiscordMessage } from './reporting/discordReporterClient.js';

let currentTestTitle = null;
let currentPage = null;
let pendingFailureReason = null;

const failedOnceByTitle = new Set();

function formatMsg(emoji, title, reason) {
  return reason ? `${emoji} ${title}\nReason: ${reason}` : `${emoji} ${title}`;
}

export function setCurrentTestTitle(title) {
  currentTestTitle = title;
  pendingFailureReason = null;
}

export function setPendingFailureReason(reason) {
  pendingFailureReason = typeof reason === 'string' ? reason : null;
}

export function consumePendingFailureReason() {
  const reason = pendingFailureReason;
  pendingFailureReason = null;
  return reason;
}

export function setCurrentPage(page) {
  currentPage = page || null;
}

export function getCurrentPage() {
  return currentPage;
}

export function clearCurrentPage() {
  currentPage = null;
}

export async function safeScreenshot(page) {
  try {
    if (!page) return null;
    const dir = path.resolve('screenshots');
    fs.mkdirSync(dir, { recursive: true });
    const ts = new Date().toISOString().replace(/[:]/g, '-').replace(/\..+$/, '');
    const base = (currentTestTitle || 'test').replace(/[^a-z0-9-_]+/gi, '_').slice(0, 120);
    const filename = `${ts}__${base}.png`;
    const filePath = path.join(dir, filename);
    await page.screenshot({ path: filePath });
    return { path: filePath, filename };
  } catch {
    return null;
  }
}

export function markFailed(reason) {
  if (!currentTestTitle) throw new Error('markFailed() called without a current test title');
  if (typeof reason !== 'string' || reason.trim().length === 0) {
    throw new Error(`[CONFIG ERROR] markFailed("${currentTestTitle}") requires a non-empty reason`);
  }

  if (!failedOnceByTitle.has(currentTestTitle)) {
    failedOnceByTitle.add(currentTestTitle);
    setPendingFailureReason(reason);
  }

  throw new Error(`[FAILED] ${currentTestTitle}: ${reason}`);
}

export async function handleFailureAfterEach(page, testInfo) {
  const reasonFromMarkFailed = consumePendingFailureReason();
  const raw = testInfo?.error?.message || '';
  let reason;
  if (reasonFromMarkFailed) {
    reason = reasonFromMarkFailed;
  } else if (testInfo.status === 'timedOut') {
    const ms = testInfo.timeout || 0;
    const seconds = Math.round(ms / 1000);
    reason = seconds ? `Test timed-out after ${seconds}s.` : 'Test timed-out.';
  } else {
    reason = raw.split('\n')[0] || 'Test failed.';
  }

  let extraNotice = '';
  let filePath;
  const shot = await safeScreenshot(page);
  if (shot && shot.path) filePath = shot.path;
  else extraNotice = 'Unable to capture screenshot for this failure.';

  enqueueDiscordMessage({
    content: formatMsg('❌', testInfo.title || currentTestTitle || 'Test', reason),
    filePath,
    extraNotice,
  });
}
