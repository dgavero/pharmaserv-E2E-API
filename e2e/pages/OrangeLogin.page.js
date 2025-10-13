import { markFailed } from '../helpers/testUtilsUI.js';
import {
  safeClick,
  safeInput,
  safeNavigateToUrl,
  safeWaitForPageLoad,
  safeWaitForElementVisible,
  getLastError,
} from '../helpers/testUtilsUI.js';

export default class OrangeLoginPage {
  constructor(page) {
    this.page = page;

    this.username = '//input[@name="username"]';
    this.password = '//input[@name="password"]';
    this.submit = '//button[@type="submit"]';
    this.dashboardMarker = '//h6[contains(@class,"topbar-header")]';
    this.errorToast = '//div[contains(@class,"orangehrm-login-error")]';
    this.userMenuTrigger = '//p[contains(@class,"oxd-userdropdown-name")]';
    this.dropdownMenu = '//ul[contains(@class,"oxd-dropdown-menu")]';
    this.logoutItem = '//a[normalize-space(.)="Logout"]';
  }

  async open() {
    if (!(await safeNavigateToUrl(this.page, '/')))
      markFailed('HOWEVER Failed to navigate to login page URL.');
  }

  async login(user, pass) {
    if (!(await safeInput(this.page, this.username, user)))
      markFailed('HOWEVER Failed to input username.');

    if (!(await safeInput(this.page, this.password, pass)))
      markFailed('HOWEVER Failed to input password.');

    if (!(await safeClick(this.page, this.submit)))
      markFailed('HOWEVER Failed to click login button.');
  }

  async isOnDashboard() {
    if (!(await safeWaitForElementVisible(this.page, this.dashboardMarker)))
      markFailed(`Dashboard marker not visible.`);
  }

  async hasError() {
    if (!(await safeWaitForElementVisible(this.page, this.errorToast)))
      markFailed(`Error toast not visible.`);
  }
}
