// // tests/example.spec.js
// import { test } from '../../e2e/globalConfig.ui.js';
// import { markPassed, markFailed, safeWaitForElementVisible } from '../helpers/testUtilsUI.js';

// const isProd = (process.env.TEST_ENV || 'LOCAL').toUpperCase() === 'PROD';

// test.describe('positive @samples', () => {
//   test('positive test case 1 @pos1 @all', async ({ page }) => {
//     await page.goto('/');

//     // Both example.com & playwright.dev have an <h1>
//     if (!(await safeWaitForElementVisible(page, 'h1'))) {
//       markFailed('Main heading <h1> is not visible');
//     }

//     markPassed();
//   });

//   test('positive test case 2 @pos2 @all', async ({ page }) => {
//     await page.goto('/');

//     // Pick a homepage CTA that exists per env
//     const ctaSelector = isProd
//       ? 'text=/Get started/i' // playwright.dev
//       : 'text=/More information/i'; // example.com

//     if (!(await safeWaitForElementVisible(page, ctaSelector))) {
//       markFailed(`Expected homepage CTA not visible (${ctaSelector})`);
//     }

//     markPassed();
//   });
// });

// test.describe('negative @samples', () => {
//   test('negative test case 1 @neg1 @all', async ({ page }) => {
//     await page.goto('/');

//     // Intentionally fail: element should NOT exist
//     if (!(await safeWaitForElementVisible(page, 'text=Totally Not There'))) {
//       markFailed('Expected element not found.');
//     }

//     // (We never reach here; test fails above)
//     markPassed();
//   });

//   test('negative test case 2 @neg2 @all', async ({ page }) => {
//     await page.goto('/');

//     // Intentionally fail: wrong title expectation for both envs
//     if (!(await safeWaitForElementVisible(page, 'text=/This String Will Not Appear Anywhere/i'))) {
//       markFailed('Page title did not match expected value.');
//     }

//     // (We never reach here; test fails above)
//     markPassed();
//   });
// });
