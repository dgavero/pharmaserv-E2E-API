/**
 * Utility helpers for Playwright tests with Discord integration.
 * - Provides markPassed/markFailed logging into Discord threads.
 * - Manages a message queue + flush cycle via REST (no Gateway).
 * - Safe helpers: wrappers around Playwright actions (click, input, hover, navigate, wait)
 *   that return boolean instead of throwing. This:
 *      • keeps test code clean and readable
 *      • allows custom Discord messages per failure
 *      • still lets you include the short Playwright error via getLastError(page)
 *
 * Timeouts:
 * - All helpers default to Timeouts.standard (15s).
 * - Can override per call, e.g. safeClick(page, sel, { timeout: Timeouts.short }).
 */

import fs from 'node:fs';
import path from 'node:path';
import { REST, Routes } from 'discord.js';
import { Timeouts } from '../Timeouts';

/*
 *  Shared run metadata & REST client (used to post to the per-run thread)
 *  `.discord-run.json` is written during setup (see discordSetup/sendSuiteHeader).
 *  We only need REST here (no Gateway) to post ✅ / ❌ logs into the thread.
 */
const RUN_META_PATH = path.resolve('.discord-run.json');
const TOKEN = process.env.DISCORD_BOT_TOKEN;
const rest = TOKEN ? new REST({ version: '10' }).setToken(TOKEN) : null;

// The currently executing test title (set by setCurrentTestTitle in test hooks)
let currentTestTitle = null;

// The currently active Playwright Page (set in test hooks)
let currentPage = null;

// Carries the human reason provided to markFailed(); consumed in afterEach
let pendingFailureReason = null;

// Outgoing message queue for thread posts (non-blocking ✅ / ❌)
// - messageQueue: FIFO queue of message strings to send
// - flushing: prevents overlapping flush loops
// - pendingPosts: promises for posts currently being awaited (for clean shutdown)
const messageQueue = [];
let flushing = false;
const pendingPosts = new Set();

// Prevent duplicate ❌ posts for the same test (de-dupe by test title)
const failedOnceByTitle = new Set();

/**
 * Capture a viewport screenshot to ./screenshots with a timestamp+title filename.
 * Returns { path, filename } on success, or null on failure.
 * (Future: element-only snapshots can be added here.)
 */
export async function safeScreenshot(page) {
  try {
    if (!page) return null;
    const dir = path.resolve('screenshots');
    fs.mkdirSync(dir, { recursive: true });
    const ts = new Date().toISOString().replace(/[:]/g, '-').replace(/\..+$/, '');
    const base = (currentTestTitle || 'test').replace(/[^a-z0-9-_]+/gi, '_').slice(0, 120);
    const filename = `${ts}__${base}.png`;
    const filePath = path.join(dir, filename);
    await page.screenshot({ path: filePath }); // viewport (default)
    return { path: filePath, filename };
  } catch {
    return null;
  }
}

// -------------------- Public API -------------------- //
/**
 * Sets the "current test title" so pass/fail helpers know what to post.
 * Call this from your test hooks (e.g., beforeEach/afterEach) with the test title.
 */
export function setCurrentTestTitle(title) {
  currentTestTitle = title;
  pendingFailureReason = null;
}

export function setPendingFailureReason(reason) {
  pendingFailureReason = typeof reason === 'string' ? reason : null;
}

export function consumePendingFailureReason() {
  const r = pendingFailureReason;
  pendingFailureReason = null;
  return r;
}

// Track the active Playwright Page so markFailed() can take a screenshot without changing tests
export function setCurrentPage(page) {
  currentPage = page || null;
}
export function clearCurrentPage() {
  currentPage = null;
}

/**
 * ✅ Mark a test as PASSED.
 * Enqueues "✅ <title>\nReason: <reason>" only when DISCORD_LOG_PASSED === "1".
 * No-op if currentTestTitle isn't set (guard).
 */
export function markPassed(reason) {
  if (!currentTestTitle) return;
  if (process.env.DISCORD_LOG_PASSED === '1') {
    enqueue(formatMsg('✅', currentTestTitle, reason));
  }
}

/**
 * ❌ Mark a test as FAILED.
 * Enqueues a single failure message per test (de-duped by title).
 * Immediately throws to fail fast with a consistent error message.
 * Requires a non-empty reason for clarity in the thread.
 */
export function markFailed(reason) {
  if (!currentTestTitle) throw new Error('markFailed() called without a current test title');
  if (typeof reason !== 'string' || reason.trim().length === 0) {
    throw new Error(`[CONFIG ERROR] markFailed("${currentTestTitle}") requires a non-empty reason`);
  }

  // Enqueue only once per test title (avoid duplicate ❌ spam on multiple failures)
  if (!failedOnceByTitle.has(currentTestTitle)) {
    failedOnceByTitle.add(currentTestTitle);

    // Hand the reason to afterEach; it will capture/+post the screenshot
    setPendingFailureReason(reason);
  }

  // Fail the test so afterEach runs with status === 'failed'
  throw new Error(`[FAILED] ${currentTestTitle}: ${reason}`);
}

/**
+ * Called from afterEach when a test failed.
+ * - Uses the human reason from markFailed() if present, else testInfo.error.
+ * - Captures viewport screenshot.
+ * - Enqueues one Discord message with attachment (or a fallback line).
+ */
export async function handleFailureAfterEach(page, testInfo) {
  const reasonFromMarkFailed = consumePendingFailureReason();
  const raw = testInfo?.error?.message || '';
  let reason;
  if (reasonFromMarkFailed) {
    reason = reasonFromMarkFailed;
  } else if (testInfo.status === 'timedOut') {
    // Short, generic message for whole-test timeouts
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

  enqueue({
    content: formatMsg('❌', testInfo.title || currentTestTitle || 'Test', reason),
    filePath,
    extraNotice,
  });
}

/**
 * Flush any queued posts before the worker exits.
 * - Awaits the queue flush loop, then any **pendingPosts** REST requests.
 * - Call this in your test runner teardown to avoid dropped messages.
 */
export async function flushReports() {
  await flush();
  if (pendingPosts.size > 0) {
    await Promise.all([...pendingPosts]);
  }
}

// -------------------- Internal Utils -------------------- //

/**
 * Builds a simple message:
 * - With reason:  "<emoji> <title>\nReason: <reason>"
 * - Without:      "<emoji> <title>"
 */
function formatMsg(emoji, title, reason) {
  return reason ? `${emoji} ${title}\nReason: ${reason}` : `${emoji} ${title}`;
}

/**
 * Reads the threadId from `.discord-run.json` (written during setup).
 * - Returns null if the file is missing / unreadable.
 */
function readThreadId() {
  try {
    const meta = JSON.parse(fs.readFileSync(RUN_META_PATH, 'utf-8'));
    return meta?.threadId || null;
  } catch {
    return null;
  }
}

/**
 * Enqueue a message for posting into the run thread.
 * - Schedules a flush (non-blocking) if not already flushing.
 */
function enqueue(item) {
  const normalized = typeof item === 'string' ? { content: item } : item && item.content ? item : null;
  if (!normalized) return;
  messageQueue.push(normalized);
  scheduleFlush();
}

/**
 * Starts a flush with a tiny delay (100ms) to coalesce bursty posts.
 * - Still non-blocking; yields back to the event loop before flushing.
 */
function scheduleFlush() {
  if (flushing) return;
  flushing = true;
  setTimeout(() => void flush(), 100);
}

/**
 * Flush loop: posts queued messages to the run thread via REST.
 * - If threadId/rest aren't ready yet, retries shortly (150ms) and reschedules.
 * - Sends messages one-by-one, tracking **pendingPosts** for clean shutdown.
 * - Reschedules if messageQueue refills while flushing (back-pressure friendly).
 */
async function flush() {
  try {
    const threadId = readThreadId();
    if (!threadId || !rest) {
      // Thread not ready yet — retry shortly
      setTimeout(() => {
        flushing = false;
        scheduleFlush();
      }, 150);
      return;
    }

    while (messageQueue.length > 0) {
      const { content, filePath, extraNotice } = messageQueue.shift();
      let bodyContent = content;
      if (!filePath && extraNotice) {
        bodyContent = `${content}\n\n${extraNotice}`;
      }

      const options = { body: { content: bodyContent } };
      if (filePath && fs.existsSync(filePath)) {
        options.files = [{ name: path.basename(filePath), data: fs.readFileSync(filePath) }];
      }

      // Post directly to the run thread (threadId is a channel id for the thread)
      const p = rest.post(Routes.channelMessages(threadId), options);
      pendingPosts.add(p);
      await p.finally(() => pendingPosts.delete(p));
    }
  } finally {
    flushing = false;
    if (messageQueue.length > 0) scheduleFlush();
  }
}

/**
 * Keeps the last short error per Playwright Page so tests can optionally include it in logs.
 * Usage in tests:
 *   if (!(await safeClick(page, sel))) {
 *     markFailed(`Click failed: ${getLastError(page)}`);
 *   }
 */
const lastErrorMap = new WeakMap(); // key = Page, value = short error string

function setLastErrorForPage(page, error) {
  const short = error?.message?.split('\n')[0] || String(error);
  lastErrorMap.set(page, short);
}

export function getLastError(page) {
  return lastErrorMap.get(page) || '';
}

/** Wait until an element is visible (boolean return). */
export async function safeWaitForElementVisible(page, selector, { timeout = Timeouts.standard } = {}) {
  try {
    await page.locator(selector).waitFor({ state: 'visible', timeout });
    return true;
  } catch (error) {
    setLastErrorForPage(page, error);
    return false;
  }
}

/** Wait until an element is present in the DOM (boolean return). */
export async function safeWaitForElementPresent(page, selector, { timeout = Timeouts.standard } = {}) {
  try {
    await page.locator(selector).waitFor({ state: 'attached', timeout });
    return true;
  } catch (error) {
    setLastErrorForPage(page, error);
    return false;
  }
}

/** Click anything (buttons, links, checkboxes, menu items).  */
export async function safeClick(page, selector, { timeout = Timeouts.standard } = {}) {
  try {
    const loc = page.locator(selector);
    await loc.waitFor({ state: 'visible', timeout });
    await loc.click({ timeout });
    return true;
  } catch (error) {
    setLastErrorForPage(page, error);
    return false;
  }
}

/** Type into input/textarea with keystrokes (cross-platform select-all). */
export async function safeInput(page, selector, text, { timeout = Timeouts.standard, delay = 15 } = {}) {
  try {
    const loc = page.locator(selector);
    await loc.waitFor({ state: 'visible', timeout });
    await loc.click({ timeout }); // focus

    // Detect the right select-all combo for the current OS
    const selectAllShortcut = process.platform === 'darwin' ? 'Meta+A' : 'Control+A';
    await page.keyboard.press(selectAllShortcut);
    await page.keyboard.press('Backspace');

    if (text) await page.keyboard.type(String(text), { delay });
    return true;
  } catch (error) {
    // Fallback path: when keystroke-based input fails, try direct fill.
    try {
      return await safeFill(page, selector, text, { timeout });
    } catch (fallbackError) {
      setLastErrorForPage(page, fallbackError);
      return false;
    }
  }
}

/** Hover over element. */
export async function safeHover(page, selector, { timeout = Timeouts.standard } = {}) {
  try {
    const loc = page.locator(selector);
    await loc.waitFor({ state: 'visible', timeout });
    await loc.hover({ timeout });
    return true;
  } catch (error) {
    setLastErrorForPage(page, error);
    return false;
  }
}

/** Navigate to a given URL and confirm it loads. */
export async function safeNavigateToUrl(page, url, { timeout = Timeouts.extraLong, waitUntil = 'load' } = {}) {
  try {
    await page.goto(url, { timeout, waitUntil });
    return true;
  } catch (error) {
    setLastErrorForPage(page, error);
    return false;
  }
}

/** Wait for the page to load and URL to match the expected value (after a click or redirect). */
export async function safeWaitForPageLoad(
  page,
  expectedUrl,
  { timeout = Timeouts.extraLong, waitUntil = 'load' } = {}
) {
  try {
    await page.waitForURL(expectedUrl, { timeout, waitUntil });
    return true;
  } catch (error) {
    setLastErrorForPage(page, error);
    return false;
  }
}

/** Fill input/textarea directly (faster path when key events are not required). */
export async function safeFill(page, selector, text, { timeout = Timeouts.standard } = {}) {
  try {
    const loc = page.locator(selector);
    await loc.waitFor({ state: 'visible', timeout });
    await loc.fill(text == null ? '' : String(text), { timeout });
    return true;
  } catch (error) {
    setLastErrorForPage(page, error);
    return false;
  }
}

/** Select an option from a native <select> element. */
export async function safeSelectOption(page, selector, value, { timeout = Timeouts.standard } = {}) {
  try {
    const loc = page.locator(selector);
    await loc.waitFor({ state: 'visible', timeout });
    await loc.selectOption(value, { timeout });
    return true;
  } catch (error) {
    setLastErrorForPage(page, error);
    return false;
  }
}

/** Upload one or more files into a file input element. */
export async function safeUploadFile(page, selector, files, { timeout = Timeouts.standard } = {}) {
  try {
    const loc = page.locator(selector);
    // File inputs are often hidden, so "attached" is a safer readiness check.
    await loc.waitFor({ state: 'attached', timeout });
    await loc.setInputFiles(files, { timeout });
    return true;
  } catch (error) {
    setLastErrorForPage(page, error);
    return false;
  }
}

/** Wait until an element is hidden or removed from view. */
export async function safeWaitForElementHidden(page, selector, { timeout = Timeouts.standard } = {}) {
  try {
    await page.locator(selector).waitFor({ state: 'hidden', timeout });
    return true;
  } catch (error) {
    setLastErrorForPage(page, error);
    return false;
  }
}

/**
 * Close the currently tracked context, then open a fresh context/page and navigate to URL.
 * Returns { context, page } on success, or null on failure.
 */
export async function safeOpenNewContextPage(
  browser,
  url,
  { contextOptions = {}, timeout = Timeouts.extraLong, waitUntil = 'load' } = {}
) {
  let previousPage = currentPage;
  let nextPage = null;
  try {
    // Close current tracked context first to ensure a clean session boundary.
    if (previousPage && !previousPage.isClosed()) {
      await previousPage.context().close();
      clearCurrentPage();
    }

    const context = await browser.newContext(contextOptions);
    nextPage = await context.newPage();
    await nextPage.goto(url, { timeout, waitUntil });
    setCurrentPage(nextPage);
    return { context, page: nextPage };
  } catch (error) {
    const errorPage = nextPage || previousPage;
    if (errorPage) setLastErrorForPage(errorPage, error);
    return null;
  }
}
