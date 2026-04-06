import { markFailed } from '../../helpers/testFailure.js';
import MerchantPortalLoginPage from '../../pages/merchantPortal/merchantPortalLogin.page.js';
import { test } from '../../../e2e/globalConfig.ui.js';
import { getMerchantPortalAccount } from '../../helpers/merchantCredentials.js';
import { safeOpenNewContextPage, getLastError } from '../../helpers/uiActions.js';

test.describe('Merchant Portal | Login', () => {
  test(
    'E2E-1 | Merchant Should be able to Login Successfully',
    {
      tag: ['@ui', '@merchant', '@login', '@positive', '@merchant-portal', '@e2e-1', '@smoke'],
    },
    async ({ page }) => {
      const login = new MerchantPortalLoginPage(page);
      const merchantAccount = getMerchantPortalAccount('e2e-reg01');

      await login.open();
      await login.login(merchantAccount.username, merchantAccount.password);
      await login.assertSuccessLogin();
    }
  );

  test(
    'E2E-2 | Merchant Should NOT be able login with incorrect credentials',
    { tag: ['@ui', '@merchant', '@login', '@negative', '@merchant-portal', '@e2e-2'] },
    async ({ page }) => {
      const login = new MerchantPortalLoginPage(page);
      await login.open();
      await login.submitLoginFormWithFill('wronguser', 'wrongpass');
      await login.assertFailedLogin();
    }
  );

  test(
    'E2E-3 | Merchant Should NOT be able login with empty credentials',
    {
      tag: ['@ui', '@merchant', '@login', '@negative', '@merchant-portal', '@e2e-3'],
    },

    async ({ page }) => {
      const login = new MerchantPortalLoginPage(page);

      await login.open();
      await login.submitLoginFormWithFill('', '');
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
      const merchantAccount = getMerchantPortalAccount('e2e-reg01');

      await firstLogin.open();
      await firstLogin.login(merchantAccount.username, merchantAccount.password);
      await firstLogin.assertSuccessLogin();

      const opened = await safeOpenNewContextPage(browser, '/login');
      if (!opened) {
        markFailed(`Failed to open fresh context for second login: ${getLastError(page)}`);
      }

      const secondLogin = new MerchantPortalLoginPage(opened.page);
      await secondLogin.login(merchantAccount.username, merchantAccount.password);
      await secondLogin.assertSuccessLogin();
    }
  );
});
