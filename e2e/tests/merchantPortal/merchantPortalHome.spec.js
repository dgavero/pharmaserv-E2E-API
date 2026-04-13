import { test, expect } from '../../globalConfig.ui.js';
import { Timeouts } from '../../Timeouts.js';
import MerchantPortalLoginPage from '../../pages/merchantPortal/merchantPortalLogin.page.js';
import { getPharmacistAccount } from '../../../api/helpers/roleCredentials.js';
import { getMerchantPortalAccount } from '../../helpers/merchantCredentials.js';
import { loadSelectors, getSelector } from '../../helpers/selectors.js';
import { safeWaitForElementVisible } from '../../helpers/uiActions.js';
import { markFailed } from '../../helpers/testFailure.js';

test.describe('Merchant Portal | Home', () => {
  const sel = loadSelectors('merchant');
  const headerInfoContainer = getSelector(sel, 'Home.HeaderInfoContainer');
  const headerPharmacyName = getSelector(sel, 'Home.HeaderPharmacyName');
  const headerBranchName = getSelector(sel, 'Home.HeaderBranchName');

  test(
    'E2E-22 | Onboarded Pharmacist - Pharmacy & Branch name should display on home',
    {
      tag: ['@ui', '@merchant', '@positive', '@merchant-portal', '@e2e-22'],
      // Flow summary: pharmacist_regular logs in -> Home header should display assigned pharmacy and branch names.
    },
    async ({ page }) => {
      const login = new MerchantPortalLoginPage(page);
      const pharmacistRegular = getPharmacistAccount('reg01');
      const testEnv = String(process.env.TEST_ENV || 'DEV').toUpperCase();

      const expectedPharmacyName = testEnv === 'QA' ? 'Pharmacy API-QA' : 'Pharmacy API';
      const expectedBranchName = 'API Branch';

      await login.open();
      await login.login(pharmacistRegular.username, pharmacistRegular.password);
      await login.assertSuccessLogin();

      if (!(await safeWaitForElementVisible(page, headerInfoContainer, { timeout: Timeouts.standard }))) {
        markFailed('Home header info container is not visible');
      }

      await expect
        .poll(
          async () => {
            const pharmacyText = await page
              .locator(headerPharmacyName)
              .first()
              .innerText()
              .catch(() => '');
            const branchText = await page
              .locator(headerBranchName)
              .first()
              .innerText()
              .catch(() => '');
            const normalizedPharmacyText = String(pharmacyText || '')
              .replace(/\s+/g, ' ')
              .trim();
            const normalizedBranchText = String(branchText || '')
              .replace(/\s+/g, ' ')
              .trim();

            return normalizedPharmacyText === expectedPharmacyName && normalizedBranchText === expectedBranchName;
          },
          {
            timeout: Timeouts.standard,
            intervals: [300],
          }
        )
        .toBe(true);
    }
  );

  test(
    'E2E-23 | PSE Pharmacist - Pharmacy & Branch name should not display on home',
    {
      tag: ['@ui', '@merchant', '@positive', '@merchant-portal', '@e2e-23'],
      // Flow summary: PSE pharmacist logs in -> Home header pharmacy and branch labels should remain empty.
    },
    async ({ page }) => {
      const login = new MerchantPortalLoginPage(page);
      const pseAccount = getMerchantPortalAccount('e2e-pse01');

      await login.open();
      await login.login(pseAccount.username, pseAccount.password);
      await login.assertSuccessLogin();

      if (!(await safeWaitForElementVisible(page, headerInfoContainer, { timeout: Timeouts.standard }))) {
        markFailed('Home header info container is not visible for PSE account');
      }

      await expect
        .poll(
          async () => {
            const pharmacyText = await page
              .locator(headerPharmacyName)
              .first()
              .innerText()
              .catch(() => '');
            const branchText = await page
              .locator(headerBranchName)
              .first()
              .innerText()
              .catch(() => '');

            return String(pharmacyText || '').trim() === '' && String(branchText || '').trim() === '';
          },
          {
            timeout: Timeouts.standard,
            intervals: [300],
          }
        )
        .toBe(true);
    }
  );
});
