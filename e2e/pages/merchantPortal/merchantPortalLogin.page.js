import { markFailed } from '../../helpers/testUtilsUI.js';
import { loadSelectors, getSelector } from '../../helpers/selectors.js';
import {
  safeClick,
  safeInput,
  safeWaitForElementVisible,
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
    if (!String(user ?? '').trim() || !String(pass ?? '').trim()) {
      markFailed('Merchant login requires non-empty username and password');
    }

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
    const sidebarHomeLink = getSelector(this.sel, 'Apps.SidebarHomeLink');
    const sidebarHomeLinkVisible = await safeWaitForElementVisible(this.page, sidebarHomeLink);
    if (!sidebarHomeLinkVisible) {
      markFailed('Expected Home sidebar link to be visible after login');
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
