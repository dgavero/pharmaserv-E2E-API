import { markFailed, markPassed } from '../../helpers/testUtilsUI.js';
import MerchantPortalLoginPage from '../../pages/merchantPortal/merchantPortalLogin.page.js';
import { test } from '../../../e2e/globalConfig.ui.js';
import { loadSelectors, getSelector } from '../../helpers/selectors.js';
import {
  safeClick,
  safeInput,
  safeNavigateToUrl,
  safeWaitForPageLoad,
  safeWaitForElementVisible,
  getLastError,
} from '../../helpers/testUtilsUI.js';

test.describe('Merchant Portal | Login', () => {
  test(
    'MP-001 | Merchant Should be able to Login Successfully',
    {
      tag: ['@ui', '@merchant', '@login', '@positive', '@merchant-portal'],
    },
    async ({ page }) => {
      const login = new MerchantPortalLoginPage(page);

      await login.open();
      console.log('Logging in with merchant user:', process.env.MERCHANT_USERNAME);
      console.log('Using merchant password:', process.env.MERCHANT_PASSWORD);
      await login.login(process.env.MERCHANT_USERNAME, process.env.MERCHANT_PASSWORD);
      await login.assertSuccessLogin();
    }
  );

  test(
    'MP-002 | Merchant Should NOT be able login with incorrect credentials',
    { tag: ['@ui', '@merchant', '@login', '@negative', '@merchant-portal'] },
    async ({ page }) => {
      const sel = loadSelectors('merchant');
      await page.goto('/');

      if (!(await safeInput(page, getSelector(sel, 'Login.Username'), 'wronguser'))) {
        markFailed('Failed to input invalid username');
      }

      if (!(await safeInput(page, getSelector(sel, 'Login.Password'), 'wrongpass'))) {
        markFailed('Failed to input invalid password');
      }

      if (!(await safeClick(page, getSelector(sel, 'Login.Submit')))) {
        markFailed('Could not click login submit');
      }

      const login = new MerchantPortalLoginPage(page);
      await login.assertFailedLogin();
    }
  );

  test(
    'MP-003 | Merchant Should NOT be able login with empty credentials',
    {
      tag: ['@ui', '@merchant', '@login', '@negative', '@merchant-portal'],
    },

    async ({ page }) => {
      const login = new MerchantPortalLoginPage(page);

      await login.open();
      await login.login('', '');
      await login.assertFailedLogin();
    }
  );
});
