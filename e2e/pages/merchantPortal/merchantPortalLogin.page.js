import { markFailed, markPassed } from '../../helpers/testUtilsUI.js';
import { loadSelectors, getSelector } from '../../helpers/selectors.js';
import {
  safeClick,
  safeInput,
  safeNavigateToUrl,
  safeWaitForPageLoad,
  safeWaitForElementVisible,
  safeWaitForElementPresent,
  getLastError,
} from '../../helpers/testUtilsUI.js';

export default class MerchantPortalLoginPage {
  constructor(page) {
    this.page = page;
    this.sel = loadSelectors('merchant');
  }

  async open() {
    await this.page.goto('/login');
  }

  async login(user, pass) {
    if (!(await safeInput(this.page, getSelector(this.sel, 'Login.Username'), user))) {
      markFailed('Failed to input username');
    }

    if (!(await safeInput(this.page, getSelector(this.sel, 'Login.Password'), pass))) {
      markFailed('Failed to input password');
    }

    if (!(await safeClick(this.page, getSelector(this.sel, 'Login.Submit')))) {
      markFailed('Failed to click login');
    }
  }

  async assertSuccessLogin() {
    const newOrderBtn = getSelector(this.sel, 'Apps.NewOrdersBtn');
    const newOrderBtnVisible = await safeWaitForElementPresent(this.page, newOrderBtn);
    if (!newOrderBtnVisible) {
      markFailed('Expected new order button not visible');
    }
  }

  async assertFailedLogin() {
    const errorCredsVisible = await safeWaitForElementVisible(
      this.page,
      getSelector(this.sel, 'Login.ErrorMessageCredsValidation')
    );

    const errorUsernameVisible = await safeWaitForElementVisible(
      this.page,
      getSelector(this.sel, 'Login.ErrorMessageInvalidUserName')
    );

    if (!(errorCredsVisible || errorUsernameVisible))
      markFailed('Expected either invalid credentials OR invalid username error to be visible');
    console.log('Error Message for Failed Login is visible');
  }
}
