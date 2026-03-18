import { Timeouts } from '../Timeouts';
import { clearCurrentPage, getCurrentPage, setCurrentPage } from './testFailure.js';

const lastErrorMap = new WeakMap();

const DEFAULT_LOADING_SELECTORS = [
  '[data-testid*="loader" i]',
  '[data-testid*="loading" i]',
  '[class*="loader" i]',
  '[class*="loading" i]',
  '[class*="skeleton" i]',
  '.skeleton',
  '[aria-busy="true"]',
  '[role="progressbar"]',
];

function setLastErrorForPage(page, error) {
  const short = error?.message?.split('\n')[0] || String(error);
  lastErrorMap.set(page, short);
}

export async function delay(seconds, message) {
  const sec = Number(seconds);
  const waitSeconds = Number.isFinite(sec) && sec > 0 ? sec : 0;
  if (message) console.log(message);
  await new Promise((resolve) => setTimeout(resolve, Math.round(waitSeconds * 1000)));
}

export function getLastError(page) {
  return lastErrorMap.get(page) || '';
}

export async function safeWaitForElementVisible(page, selector, { timeout = Timeouts.standard } = {}) {
  try {
    await page.locator(selector).waitFor({ state: 'visible', timeout });
    return true;
  } catch (error) {
    setLastErrorForPage(page, error);
    return false;
  }
}

export async function safeWaitForElementPresent(page, selector, { timeout = Timeouts.standard } = {}) {
  try {
    await page.locator(selector).waitFor({ state: 'attached', timeout });
    return true;
  } catch (error) {
    setLastErrorForPage(page, error);
    return false;
  }
}

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

export async function safeInput(page, selector, text, { timeout = Timeouts.standard, delay: typeDelay = 15 } = {}) {
  try {
    const loc = page.locator(selector);
    await loc.waitFor({ state: 'visible', timeout });
    await loc.click({ timeout });

    if (text) {
      await page.keyboard.type(String(text), { delay: typeDelay });
    }
    return true;
  } catch (error) {
    try {
      return await safeFill(page, selector, text, { timeout });
    } catch (fallbackError) {
      setLastErrorForPage(page, fallbackError);
      return false;
    }
  }
}

export async function safeClearText(page) {
  try {
    const selectAllShortcut = process.platform === 'darwin' ? 'Meta+A' : 'Control+A';
    await page.keyboard.press(selectAllShortcut);
    await page.keyboard.press('Backspace');
    return true;
  } catch (error) {
    setLastErrorForPage(page, error);
    return false;
  }
}

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

export async function safeNavigateToUrl(page, url, { timeout = Timeouts.extraLong, waitUntil = 'load' } = {}) {
  try {
    await page.goto(url, { timeout, waitUntil });
    return true;
  } catch (error) {
    setLastErrorForPage(page, error);
    return false;
  }
}

export async function safeWaitForPageLoad(
  page,
  expectedUrlOrSelectors,
  { timeout = Timeouts.extraLong, waitUntil = 'load', loadingSelectors = DEFAULT_LOADING_SELECTORS } = {}
) {
  const startedAt = Date.now();
  const startUrl = page.url();
  console.log(`Checking if page loaded successfully: ${startUrl}`);
  const remainingMs = () => Math.max(0, timeout - (Date.now() - startedAt));
  const elapsedSeconds = () => ((Date.now() - startedAt) / 1000).toFixed(1);
  const startedFromLogin = String(startUrl).includes('/login');
  const hasUnexpectedLoginRedirect = () => !startedFromLogin && String(page.url()).includes('/login');
  const logFailureAndReturn = () => {
    console.log(`Page load failed after ${elapsedSeconds()} seconds`);
    return false;
  };

  try {
    const loadStateBudget = remainingMs();
    if (loadStateBudget <= 0) {
      setLastErrorForPage(page, new Error('Page load budget exhausted before load state check'));
      return logFailureAndReturn();
    }
    await page.waitForLoadState(waitUntil, { timeout: loadStateBudget });
    if (hasUnexpectedLoginRedirect()) {
      setLastErrorForPage(page, new Error('Unexpected redirect to /login'));
      return logFailureAndReturn();
    }
  } catch (error) {
    console.log(`Page load state check failed: ${error?.message || error}`);
    setLastErrorForPage(page, error);
    return logFailureAndReturn();
  }

  while (remainingMs() > 0) {
    let hasVisibleLoader = false;

    for (const selector of loadingSelectors) {
      try {
        if (await page.locator(selector).first().isVisible()) {
          hasVisibleLoader = true;
          break;
        }
      } catch {
      }
    }

    if (!hasVisibleLoader) break;
    await page.waitForTimeout(100);
  }

  for (const selector of loadingSelectors) {
    try {
      if (await page.locator(selector).first().isVisible()) {
        console.log(`Loader/skeleton still visible: ${selector}`);
        setLastErrorForPage(page, new Error(`Page still loading; visible selector: ${selector}`));
        return logFailureAndReturn();
      }
    } catch {
    }
  }
  const logSuccessAndReturn = () => {
    console.log(`Page loaded successfully after ${elapsedSeconds()} seconds`);
    return true;
  };

  if (expectedUrlOrSelectors == null) {
    if (hasUnexpectedLoginRedirect()) {
      setLastErrorForPage(page, new Error('Unexpected redirect to /login'));
      return logFailureAndReturn();
    }
    return logSuccessAndReturn();
  }

  try {
    if (Array.isArray(expectedUrlOrSelectors)) {
      const selectorList = expectedUrlOrSelectors.filter(Boolean);
      if (selectorList.length === 0) {
        return logSuccessAndReturn();
      }

      while (remainingMs() > 0) {
        for (const selector of selectorList) {
          try {
            if (await page.locator(selector).first().isVisible()) {
              if (hasUnexpectedLoginRedirect()) {
                setLastErrorForPage(page, new Error('Unexpected redirect to /login'));
                return logFailureAndReturn();
              }
              return logSuccessAndReturn();
            }
          } catch {
          }
        }
        await page.waitForTimeout(100);
      }
      console.log('Target selector check failed: none became visible before timeout.');
      setLastErrorForPage(page, new Error(`None of selectors became visible: ${selectorList.join(' | ')}`));
      return logFailureAndReturn();
    }

    const urlBudget = remainingMs();
    if (urlBudget <= 0) {
      setLastErrorForPage(page, new Error('Page load budget exhausted before URL check'));
      return logFailureAndReturn();
    }
    await page.waitForURL(expectedUrlOrSelectors, { timeout: urlBudget, waitUntil });
    if (hasUnexpectedLoginRedirect()) {
      setLastErrorForPage(page, new Error('Unexpected redirect to /login'));
      return logFailureAndReturn();
    }
    return logSuccessAndReturn();
  } catch (error) {
    console.log(`Page target check failed: ${error?.message || error}`);
    setLastErrorForPage(page, error);
    return logFailureAndReturn();
  }
}

export async function safeFill(
  page,
  selector,
  text,
  { timeout = Timeouts.standard, retries = 2, retryDelayMs = 150 } = {}
) {
  const expected = text == null ? '' : String(text);
  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const loc = page.locator(selector);
      await loc.waitFor({ state: 'visible', timeout });
      await loc.fill(expected, { timeout });

      const actual = await loc.inputValue({ timeout });
      if (actual === expected) return true;

      lastError = new Error(`safeFill verification mismatch: expected "${expected}", got "${actual}"`);
    } catch (error) {
      lastError = error;
    }

    if (attempt < retries) {
      await page.waitForTimeout(retryDelayMs);
    }
  }

  setLastErrorForPage(page, lastError || new Error('safeFill failed'));
  return false;
}

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

export async function safePressEnter(page, selectorOrLocator, { timeout = Timeouts.standard } = {}) {
  try {
    if (selectorOrLocator) {
      const locator =
        typeof selectorOrLocator === 'string' ? page.locator(selectorOrLocator) : selectorOrLocator;
      await locator.waitFor({ state: 'visible', timeout });
      await locator.press('Enter', { timeout });
      return true;
    }

    await page.keyboard.press('Enter');
    return true;
  } catch (error) {
    setLastErrorForPage(page, error);
    return false;
  }
}

export async function safeUploadFile(page, selector, files, { timeout = Timeouts.standard } = {}) {
  try {
    const loc = page.locator(selector);
    await loc.waitFor({ state: 'attached', timeout });
    await loc.setInputFiles(files, { timeout });
    return true;
  } catch (error) {
    setLastErrorForPage(page, error);
    return false;
  }
}

export async function safeWaitForElementHidden(page, selector, { timeout = Timeouts.standard } = {}) {
  try {
    await page.locator(selector).waitFor({ state: 'hidden', timeout });
    return true;
  } catch (error) {
    setLastErrorForPage(page, error);
    return false;
  }
}

export async function safeOpenNewContextPage(
  browser,
  url,
  { contextOptions = {}, timeout = Timeouts.extraLong, waitUntil = 'load' } = {}
) {
  let previousPage = getCurrentPage();
  let nextPage = null;
  try {
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
