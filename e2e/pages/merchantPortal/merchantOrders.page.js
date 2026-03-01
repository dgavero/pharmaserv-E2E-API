import { markFailed, safeClick, safeInput, safePressEnter, safeWaitForPageLoad } from '../../helpers/testUtilsUI.js';
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

  async openNewOrderByBookingRef(bookingRef) {
    const orderCardBookingReferenceID = await this.searchOrderInTab(
      getSelector(this.sel, 'Orders.NewTab'),
      bookingRef,
      'New'
    );
    if (!(await safeClick(this.page, orderCardBookingReferenceID)))
      markFailed(`Unable to open order details for booking ref ${bookingRef}`);
    if (!(await safeWaitForPageLoad(this.page))) {
      markFailed(`Order details page did not load for booking ref ${bookingRef}`);
    }
  }

  async openOngoingOrderByBookingRef(bookingRef) {
    const orderCardBookingReferenceID = await this.searchOrderInTab(
      getSelector(this.sel, 'Orders.OngoingTab'),
      bookingRef,
      'Ongoing'
    );
    if (!(await safeClick(this.page, orderCardBookingReferenceID))) {
      markFailed(`Unable to open ongoing order details for booking ref ${bookingRef}`);
    }
  }

  async hasCompletedOrderByBookingRef(bookingRef) {
    const orderCardBookingReferenceID = await this.searchOrderInTab(
      getSelector(this.sel, 'Orders.CompletedTab'),
      bookingRef,
      'Completed'
    );
    return this.page
      .locator(orderCardBookingReferenceID)
      .first()
      .isVisible()
      .catch(() => false);
  }

  async hasCancelledOrderByBookingRef(bookingRef) {
    const orderCardBookingReferenceID = await this.searchOrderInTab(
      getSelector(this.sel, 'Orders.CancelledTab'),
      bookingRef,
      'Cancelled'
    );
    return this.page
      .locator(orderCardBookingReferenceID)
      .first()
      .isVisible()
      .catch(() => false);
  }

  async searchOrderInTab(tabSelector, bookingRef, tabLabel = 'target') {
    const searchTerm = String(bookingRef);
    const maxSearchAttempts = 2;

    const orderCardBookingReferenceIDTemplate = getSelector(this.sel, 'Orders.OrderCardBookingReferenceIDTemplate');
    const orderCardBookingReferenceID = orderCardBookingReferenceIDTemplate.replace('{bookingRef}', searchTerm);
    const searchInput = getSelector(this.sel, 'Orders.SearchInput');

    for (let attempt = 1; attempt <= maxSearchAttempts; attempt += 1) {
      if (!(await safeClick(this.page, tabSelector))) {
        markFailed(`Unable to open ${tabLabel} orders tab`);
      }

      if (!(await safeInput(this.page, searchInput, searchTerm))) {
        markFailed(`Unable to search ${tabLabel.toLowerCase()} order ${searchTerm}`);
      }
      if (!(await safePressEnter(this.page, searchInput))) {
        markFailed(`Unable to submit ${tabLabel.toLowerCase()} search for booking ref ${searchTerm}`);
      }

      const searchValueAfterEnter = await this.page
        .locator(searchInput)
        .first()
        .inputValue()
        .catch(() => '');
      const isSearchValueRetained = searchValueAfterEnter.trim() === searchTerm;

      const isOrderCardVisible = await this.page
        .locator(orderCardBookingReferenceID)
        .first()
        .isVisible()
        .catch(() => false);
      if (isSearchValueRetained && isOrderCardVisible) break;

      if (attempt === maxSearchAttempts && !isSearchValueRetained) {
        markFailed(`Search input did not retain booking ref ${searchTerm} in ${tabLabel} tab`);
      }
    }

    return orderCardBookingReferenceID;
  }
}
