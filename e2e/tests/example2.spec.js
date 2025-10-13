// tests/example2.spec.js
import { test } from '../../e2e/globalConfig.ui.js';
import { markPassed, markFailed, safeWaitForElementVisible } from '../helpers/testUtilsUI.js';

const isProd = (process.env.TEST_ENV || 'LOCAL').toUpperCase() === 'PROD';

/* ---------- POSITIVE ---------- */
test.describe('positive 2 @samples', () => {
  test('positive test case 3 @pos1 @all', async ({ page }) => {
    await page.goto('/');

    // Both example.com & playwright.dev have an <h1>
    if (!(await safeWaitForElementVisible(page, 'h1'))) {
      markFailed('Main heading <h1> is not visible');
    }

    markPassed();
  });

  test('positive test case 4 @pos2 @all', async ({ page }) => {
    await page.goto('/');

    // Env-specific CTA that should exist
    const ctaSelector = isProd
      ? 'text=/Get started/i' // playwright.dev
      : 'text=/More information/i'; // example.com

    if (!(await safeWaitForElementVisible(page, ctaSelector))) {
      markFailed(`Expected homepage CTA not visible (${ctaSelector})`);
    }

    markPassed();
  });
});

/* ---------- NEGATIVE (intentional fails) ---------- */
test.describe('negative 2 @samples2', () => {
  test('negative test case 3 @neg1 @all', async ({ page }) => {
    await page.goto('/');

    // Intentionally fail: element should NOT exist
    if (!(await safeWaitForElementVisible(page, 'text=Absolutely Missing'))) {
      markFailed('Expected element not found.');
    }
    markPassed();
  });

  test('negative test case 4 @neg2 @all', async ({ page }) => {
    await page.goto('/');

    // Intentionally fail: improbable text
    if (!(await safeWaitForElementVisible(page, 'text=/This Should Not Exist/i'))) {
      markFailed('Page content did not match expected value.');
    }
    markPassed();
  });
});
