import { markFailed, safeClick, safeInput, safeWaitForPageLoad } from '../../helpers/testUtilsUI.js';
import { loadSelectors, getSelector } from '../../helpers/selectors.js';

export default class MerchantOrdersPage {
  constructor(page) {
    this.page = page;
    this.sel = loadSelectors('merchant');
  }

  async open() {
    await this.page.goto('/orders/new');
    const loaded = await safeWaitForPageLoad(this.page);
    if (!loaded) {
      markFailed('Orders page did not load');
    }
  }

  async searchOrder(orderId) {
    const newTab = getSelector(this.sel, 'Orders.NewTab');
    await safeClick(this.page, newTab);

    const searchInput = getSelector(this.sel, 'Orders.SearchInput');
    if (!(await safeInput(this.page, searchInput, String(orderId)))) {
      markFailed(`Unable to search for order ${orderId}`);
    }
    await this.page.keyboard.press('Enter');
  }

  async openOrderById(orderRef) {
    const linkByRefTemplate = getSelector(this.sel, 'Orders.OrderLinkByBookingRefTemplate');
    const linkByRef = linkByRefTemplate.replace('{bookingRef}', String(orderRef));
    if (!(await safeClick(this.page, linkByRef))) {
      markFailed(`Unable to open order details for order ${orderRef}`);
    }
  }

  async openOngoingOrderByBookingRef(bookingRef) {
    const ongoingTab = getSelector(this.sel, 'Orders.OngoingTab');
    await safeClick(this.page, ongoingTab);

    const searchInput = getSelector(this.sel, 'Orders.SearchInput');
    if (!(await safeInput(this.page, searchInput, String(bookingRef)))) {
      markFailed(`Unable to search ongoing order ${bookingRef}`);
    }
    await this.page.keyboard.press('Enter');

    const linkByRefTemplate = getSelector(this.sel, 'Orders.OrderLinkByBookingRefTemplate');
    const linkByRef = linkByRefTemplate.replace('{bookingRef}', String(bookingRef));
    if (!(await safeClick(this.page, linkByRef))) {
      markFailed(`Unable to open ongoing order details for booking ref ${bookingRef}`);
    }
  }

  async hasCompletedOrderByBookingRef(bookingRef) {
    const completedTab = getSelector(this.sel, 'Orders.CompletedTab');
    await safeClick(this.page, completedTab);

    const searchInput = getSelector(this.sel, 'Orders.SearchInput');
    if (!(await safeInput(this.page, searchInput, String(bookingRef)))) {
      markFailed(`Unable to search completed order ${bookingRef}`);
    }
    await this.page.keyboard.press('Enter');

    const linkByRefTemplate = getSelector(this.sel, 'Orders.OrderLinkByBookingRefTemplate');
    const linkByRef = linkByRefTemplate.replace('{bookingRef}', String(bookingRef));
    return this.page
      .locator(linkByRef)
      .first()
      .isVisible()
      .catch(() => false);
  }
}
