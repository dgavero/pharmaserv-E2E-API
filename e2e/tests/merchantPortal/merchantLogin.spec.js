import { markFailed } from '../../helpers/testFailure.js';
import MerchantPortalLoginPage from '../../pages/merchantPortal/merchantPortalLogin.page.js';
import { test } from '../../../e2e/globalConfig.ui.js';
import { getMerchantPortalCredentials } from '../../helpers/merchantCredentials.js';
import { loadSelectors, getSelector } from '../../helpers/selectors.js';
import { safeClick, safeFill, safeInput, safeNavigateToUrl, safeOpenNewContextPage, safeWaitForPageLoad, safeWaitForElementVisible, getLastError } from '../../helpers/uiActions.js';

test.describe('Merchant Portal | Login', () => {
  test(
    'E2E-1 | Merchant Should be able to Login Successfully',
    {
      tag: ['@ui', '@merchant', '@login', '@positive', '@merchant-portal', '@e2e-1', '@smoke'],
    },
    async ({ page }) => {
      const login = new MerchantPortalLoginPage(page);
      const merchantPortalCredentials = getMerchantPortalCredentials('regular');

      await login.open();
      await login.login(merchantPortalCredentials.username, merchantPortalCredentials.password);
      await login.assertSuccessLogin();
    }
  );

  test(
    'E2E-2 | Merchant Should NOT be able login with incorrect credentials',
    { tag: ['@ui', '@merchant', '@login', '@negative', '@merchant-portal', '@e2e-2'] },
    async ({ page }) => {
      const sel = loadSelectors('merchant');
      const login = new MerchantPortalLoginPage(page);
      await login.open();

      if (!(await safeFill(page, getSelector(sel, 'Login.Username'), 'wronguser'))) {
        markFailed('Failed to fill invalid username');
      }

      if (!(await safeFill(page, getSelector(sel, 'Login.Password'), 'wrongpass'))) {
        markFailed('Failed to fill invalid password');
      }

      if (!(await safeClick(page, getSelector(sel, 'Login.Submit')))) {
        markFailed('Could not click login submit');
      }

      await login.assertFailedLogin();
    }
  );

  test(
    'E2E-3 | Merchant Should NOT be able login with empty credentials',
    {
      tag: ['@ui', '@merchant', '@login', '@negative', '@merchant-portal', '@e2e-3'],
    },

    async ({ page }) => {
      const sel = loadSelectors('merchant');
      const login = new MerchantPortalLoginPage(page);

      await login.open();
      if (!(await safeFill(page, getSelector(sel, 'Login.Username'), ''))) {
        markFailed('Failed to fill empty username');
      }
      if (!(await safeFill(page, getSelector(sel, 'Login.Password'), ''))) {
        markFailed('Failed to fill empty password');
      }
      if (!(await safeClick(page, getSelector(sel, 'Login.Submit')))) {
        markFailed('Failed to click login submit with empty credentials');
      }
      await login.assertFailedLogin();
    }
  );

  test(
    'E2E-4 | Merchant Can Re-Login After Opening A Fresh Context',
    {
      tag: ['@ui', '@merchant', '@login', '@positive', '@merchant-portal', '@e2e-4'],
    },
    async ({ page, browser }) => {
      const firstLogin = new MerchantPortalLoginPage(page);
      const merchantPortalCredentials = getMerchantPortalCredentials('regular');

      await firstLogin.open();
      await firstLogin.login(merchantPortalCredentials.username, merchantPortalCredentials.password);
      await firstLogin.assertSuccessLogin();

      await page.waitForTimeout(1000);
      console.log('closing browser to open a new one');

      const opened = await safeOpenNewContextPage(browser, '/login');
      if (!opened) {
        markFailed(`Failed to open fresh context for second login: ${getLastError(page)}`);
      }

      const secondLogin = new MerchantPortalLoginPage(opened.page);
      await secondLogin.login(merchantPortalCredentials.username, merchantPortalCredentials.password);
      await secondLogin.assertSuccessLogin();
    }
  );
});
