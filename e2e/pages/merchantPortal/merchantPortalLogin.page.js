import { markFailed } from '../../helpers/testUtilsUI.js';
import { loadSelectors, getSelector } from '../../helpers/selectors.js';
import { safeClick, safeInput, safeWaitForElementVisible } from '../../helpers/testUtilsUI.js';
import { Timeouts } from '../../Timeouts.js';

export default class MerchantPortalLoginPage {
  constructor(page) {
    // Bind Playwright page and load merchant selectors once for reuse.
    this.page = page;
    this.sel = loadSelectors('merchant');
    this.s = {
      loginUsername: getSelector(this.sel, 'Login.Username'),
      loginPassword: getSelector(this.sel, 'Login.Password'),
      loginSubmit: getSelector(this.sel, 'Login.Submit'),
      sidebarHomeLink: getSelector(this.sel, 'Apps.SidebarHomeLink'),
      errorCredsValidation: getSelector(this.sel, 'Login.ErrorMessageCredsValidation'),
      errorInvalidUsername: getSelector(this.sel, 'Login.ErrorMessageInvalidUserName'),
    };
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

    if (!(await safeInput(this.page, this.s.loginUsername, user))) {
      markFailed('Failed to input username');
    }

    if (!(await safeInput(this.page, this.s.loginPassword, pass))) {
      markFailed('Failed to input password');
    }

    if (!(await safeWaitForElementVisible(this.page, this.s.loginSubmit))) {
      markFailed('Login submit button is not visible');
    }
    if (!(await safeClick(this.page, this.s.loginSubmit))) {
      markFailed('Failed to click login');
    }
  }

  async assertSuccessLogin() {
    // Confirms successful login by validating the Home sidebar entry is visible.
    const sidebarHomeLinkVisible = await safeWaitForElementVisible(this.page, this.s.sidebarHomeLink);
    if (!sidebarHomeLinkVisible) {
      markFailed('Expected Home sidebar link to be visible after login');
    }
  }

  async assertFailedLogin() {
    // Accepts either known login error variant using one shared wait window, then probes both.
    const deadline = Date.now() + Timeouts.standard;

    let errorCredsVisible = false;
    let errorUsernameVisible = false;
    while (Date.now() < deadline) {
      errorCredsVisible = await this.page
        .locator(this.s.errorCredsValidation)
        .first()
        .isVisible()
        .catch(() => false);
      errorUsernameVisible = await this.page
        .locator(this.s.errorInvalidUsername)
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
