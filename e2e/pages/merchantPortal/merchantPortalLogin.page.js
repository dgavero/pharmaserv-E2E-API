import { markFailed } from '../../helpers/testUtilsUI.js';
import { loadSelectors, getSelector } from '../../helpers/selectors.js';
import { safeClick, safeInput, safeWaitForElementVisible } from '../../helpers/testUtilsUI.js';
import { Timeouts } from '../../Timeouts.js';

export default class MerchantPortalLoginPage {
  constructor(page) {
    // Bind Playwright page and load merchant selectors once for reuse.
    this.page = page;
    this.sel = loadSelectors('merchant');
  }

  async open() {
    // Opens merchant portal login route.
    await this.page.goto('/login');
  }

  async login(user, pass) {
    // Signs in using provided credentials and fails fast on any missing step.
    if (!String(user ?? '').trim() || !String(pass ?? '').trim()) {
      markFailed('Merchant login requires non-empty username and password');
    }

    if (!(await safeInput(this.page, getSelector(this.sel, 'Login.Username'), user))) {
      markFailed('Failed to input username');
    }

    if (!(await safeInput(this.page, getSelector(this.sel, 'Login.Password'), pass))) {
      markFailed('Failed to input password');
    }

    const submitButton = getSelector(this.sel, 'Login.Submit');
    if (!(await safeWaitForElementVisible(this.page, submitButton))) {
      markFailed('Login submit button is not visible');
    }
    if (!(await safeClick(this.page, submitButton))) {
      markFailed('Failed to click login');
    }
  }

  async assertSuccessLogin() {
    // Confirms successful login by validating the Home sidebar entry is visible.
    const sidebarHomeLink = getSelector(this.sel, 'Apps.SidebarHomeLink');
    const sidebarHomeLinkVisible = await safeWaitForElementVisible(this.page, sidebarHomeLink);
    if (!sidebarHomeLinkVisible) {
      markFailed('Expected Home sidebar link to be visible after login');
    }
  }

  async assertFailedLogin() {
    // Accepts either known login error variant using one shared wait window, then probes both.
    const errorCredsSelector = getSelector(this.sel, 'Login.ErrorMessageCredsValidation');
    const errorUsernameSelector = getSelector(this.sel, 'Login.ErrorMessageInvalidUserName');
    const deadline = Date.now() + Timeouts.standard;

    let errorCredsVisible = false;
    let errorUsernameVisible = false;
    while (Date.now() < deadline) {
      errorCredsVisible = await this.page
        .locator(errorCredsSelector)
        .first()
        .isVisible()
        .catch(() => false);
      errorUsernameVisible = await this.page
        .locator(errorUsernameSelector)
        .first()
        .isVisible()
        .catch(() => false);
      if (errorCredsVisible || errorUsernameVisible) break;
      await this.page.waitForTimeout(200);
    }

    if (!(errorCredsVisible || errorUsernameVisible)) {
      markFailed('Expected either invalid credentials OR invalid username error to be visible');
    }
  }
}
