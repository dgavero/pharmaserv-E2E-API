import { expect } from '@playwright/test';
import { markFailed } from '../../helpers/testFailure.js';
import { loadSelectors, getSelector } from '../../helpers/selectors.js';
import { safeClick, safeFill, safeInput, safeWaitForElementVisible } from '../../helpers/uiActions.js';
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

    await this.submitLoginForm(user, pass);
  }

  async submitLoginForm(user = '', pass = '') {
    // Submits the login form using typing semantics for standard happy-path login.
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

  async submitLoginFormWithFill(user = '', pass = '') {
    // Uses fill semantics so negative tests can intentionally submit empty or invalid credentials.
    if (!(await safeFill(this.page, this.s.loginUsername, user))) {
      markFailed('Failed to fill username');
    }
    if (!(await safeFill(this.page, this.s.loginPassword, pass))) {
      markFailed('Failed to fill password');
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
    const hasLoginErrorState = await this.waitForLoginErrorState();
    if (!hasLoginErrorState) {
      markFailed('Expected either invalid credentials OR invalid username error to be visible');
    }
  }

  async waitForLoginErrorState() {
    // Poll for either known login error state within the standard login wait window.
    try {
      await expect
        .poll(
          async () => {
            const errorCredsVisible = await this.page
              .locator(this.s.errorCredsValidation)
              .first()
              .isVisible()
              .catch(() => false);
            const errorUsernameVisible = await this.page
              .locator(this.s.errorInvalidUsername)
              .first()
              .isVisible()
              .catch(() => false);

            return errorCredsVisible || errorUsernameVisible;
          },
          {
            timeout: Timeouts.standard,
            intervals: [200],
          }
        )
        .toBe(true);
      return true;
    } catch {
      return false;
    }
  }
}
