import { markFailed } from '../../helpers/testFailure.js';
import {
  safeClick,
  safeWaitForElementVisible,
  safeWaitForPageLoad,
} from '../../helpers/uiActions.js';
import { loadSelectors, getSelector } from '../../helpers/selectors.js';
import { Timeouts } from '../../Timeouts.js';

export default class MerchantOrdersPage {
  constructor(page) {
    // Cache page and frequently used selectors/tabs for consistent, reusable order actions.
    this.page = page;
    this.sel = loadSelectors('merchant');
    this.tabs = {
      new: getSelector(this.sel, 'Orders.NewTab'),
      ongoing: getSelector(this.sel, 'Orders.OngoingTab'),
      completed: getSelector(this.sel, 'Orders.CompletedTab'),
      cancelled: getSelector(this.sel, 'Orders.CancelledTab'),
    };
    this.searchInput = getSelector(this.sel, 'Orders.SearchInput');
    this.noResultsFoundMessage = getSelector(this.sel, 'Orders.NoResultsFoundMessage');
    this.orderCardBookingReferenceIDTemplate = getSelector(this.sel, 'Orders.OrderCardBookingReferenceIDTemplate');
    this.orderStatusConfigs = {
      COMPLETED: {
        detailsTemplate: getSelector(this.sel, 'OrderDetails.StatusCompletedByBookingReferenceIDTemplate'),
        tabSelector: this.tabs.completed,
        tabLabel: 'Completed',
      },
      CANCELLED: {
        detailsTemplate: getSelector(this.sel, 'OrderDetails.StatusCancelledByBookingReferenceIDTemplate'),
        tabSelector: this.tabs.cancelled,
        tabLabel: 'Cancelled',
      },
    };
  }

  async open() {
    // Navigates to New Orders view and waits for portal readiness.
    await this.page.goto('/orders/new');

    const loaded = await safeWaitForPageLoad(this.page);
    if (!loaded) {
      markFailed('Orders page did not load');
    }
  }

  async openNewOrderByBookingRef(bookingRef) {
    // Opens a specific booking reference from the New tab.
    await this.openBookingRefInTab(this.tabs.new, bookingRef, 'New');
  }

  async openOngoingOrderByBookingRef(bookingRef) {
    // Opens a specific booking reference from the Ongoing tab.
    await this.openBookingRefInTab(this.tabs.ongoing, bookingRef, 'Ongoing');
  }

  async hasCompletedOrderByBookingRef(bookingRef) {
    // Returns whether a booking reference is visible in Completed tab results.
    return this.hasBookingRefInTab(this.tabs.completed, bookingRef, 'Completed');
  }

  async hasCancelledOrderByBookingRef(bookingRef) {
    // Returns whether a booking reference is visible in Cancelled tab results.
    return this.hasBookingRefInTab(this.tabs.cancelled, bookingRef, 'Cancelled');
  }

  buildOrderCardBookingReferenceID(bookingRef) {
    // Resolves the dynamic order-card selector for the exact booking reference.
    return this.orderCardBookingReferenceIDTemplate.replace('{bookingRef}', String(bookingRef));
  }

  buildOrderDetailsStatusByBookingReferenceID(statusKey, bookingRef) {
    const statusConfig = this.orderStatusConfigs[statusKey];
    return statusConfig.detailsTemplate.replace('{bookingRef}', String(bookingRef));
  }

  async activateOrdersTab(tabSelector, tabLabel = 'target') {
    // Opens a specific Orders tab and waits for the tab page state to stabilize.
    if (!(await safeWaitForElementVisible(this.page, tabSelector))) {
      markFailed(`Unable to find ${tabLabel} orders tab`);
    }
    if (!(await safeClick(this.page, tabSelector))) {
      markFailed(`Unable to open ${tabLabel} orders tab`);
    }
    if (!(await safeWaitForPageLoad(this.page, [this.searchInput, tabSelector], { timeout: Timeouts.short }))) {
      markFailed(`${tabLabel} orders tab did not stabilize`);
    }
  }

  async goToNewOrdersTab() {
    // Opens the New Orders tab.
    await this.activateOrdersTab(this.tabs.new, 'New');
  }

  async goToOngoingOrdersTab() {
    // Opens the Ongoing Orders tab.
    await this.activateOrdersTab(this.tabs.ongoing, 'Ongoing');
  }

  async goToCompletedOrdersTab() {
    // Opens the Completed Orders tab.
    await this.activateOrdersTab(this.tabs.completed, 'Completed');
  }

  async goToCancelledOrdersTab() {
    // Opens the Cancelled Orders tab.
    await this.activateOrdersTab(this.tabs.cancelled, 'Cancelled');
  }

  async focusSearchInput(tabLabel = 'current') {
    // Focuses the shared Orders search input for the current tab.
    const searchInput = await this.getVisibleSearchInput(tabLabel);
    const focused = await searchInput
      .click()
      .then(() => true)
      .catch(() => false);
    if (!focused) {
      markFailed(`Unable to focus search input in ${tabLabel} tab`);
    }
  }

  async getVisibleSearchInput(tabLabel = 'current') {
    // Resolves the currently visible Orders search input to avoid reading stale or hidden instances.
    if (!(await safeWaitForElementVisible(this.page, this.searchInput))) {
      markFailed(`Unable to find search input in ${tabLabel} tab`);
    }

    const searchInputs = this.page.locator(this.searchInput);
    const totalInputs = await searchInputs.count().catch(() => 0);
    for (let index = 0; index < totalInputs; index += 1) {
      const searchInput = searchInputs.nth(index);
      const isVisible = await searchInput.isVisible().catch(() => false);
      if (isVisible) {
        return searchInput;
      }
    }

    markFailed(`Unable to resolve visible search input in ${tabLabel} tab`);
  }

  async clearBookingRefSearch(tabLabel = 'current') {
    // Clears the current Orders search input value through the input locator itself.
    const searchInput = await this.getVisibleSearchInput(tabLabel);
    const cleared = await searchInput
      .fill('')
      .then(() => true)
      .catch(() => false);
    if (!cleared) {
      markFailed(`Unable to clear search input in ${tabLabel} tab`);
    }
    const currentValue = await searchInput.inputValue().catch(() => null);
    if (currentValue == null || currentValue.trim() !== '') {
      markFailed(`Search input did not clear in ${tabLabel} tab`);
    }
  }

  async typeBookingRefSearch(searchTerm, tabLabelLower = 'current') {
    // Types the exact booking reference through the input locator and verifies the final value.
    const searchInput = await this.getVisibleSearchInput(tabLabelLower);
    const typed = await searchInput
      .fill(searchTerm)
      .then(() => true)
      .catch(() => false);
    if (!typed) {
      markFailed(`Unable to search ${tabLabelLower} order ${searchTerm}`);
    }
    const currentValue = await searchInput.inputValue().catch(() => '');
    if (currentValue.trim() !== searchTerm) {
      markFailed(`Search input did not retain booking ref ${searchTerm} in ${tabLabelLower} tab`);
    }
  }

  async waitForBookingRefSearchResults(searchTerm, orderCardBookingReferenceID, tabLabelLower = 'current') {
    // Poll until the exact card appears or the bounded search window expires with a stable no-results state.
    if (
      !(await safeWaitForPageLoad(this.page, [orderCardBookingReferenceID, this.noResultsFoundMessage], {
        timeout: Timeouts.short,
      }))
    ) {
      markFailed(`Search results did not stabilize for ${tabLabelLower} booking ref ${searchTerm}`);
    }

    const probeDeadline = Date.now() + Timeouts.short;
    const probeIntervalMs = 300;
    let isSearchValueRetained = false;
    let isNoResultsVisible = false;
    let isOrderCardVisible = false;
    let sawNoResultsDuringProbe = false;

    while (Date.now() < probeDeadline) {
      const searchInput = await this.getVisibleSearchInput(tabLabelLower);
      const searchValueAfterEnter = await searchInput.inputValue().catch(() => '');
      isSearchValueRetained = searchValueAfterEnter.trim() === searchTerm;
      isNoResultsVisible = await this.page
        .locator(this.noResultsFoundMessage)
        .first()
        .isVisible()
        .catch(() => false);
      isOrderCardVisible = await this.page
        .locator(orderCardBookingReferenceID)
        .first()
        .isVisible()
        .catch(() => false);
      sawNoResultsDuringProbe = sawNoResultsDuringProbe || isNoResultsVisible;

      // Treat the exact booking-ref card as the only early terminal success signal.
      // "No results found" can flash while the filtered cards are still settling.
      if (isSearchValueRetained && isOrderCardVisible) {
        break;
      }

      await this.page.waitForTimeout(probeIntervalMs);
    }

    // Preserve whether empty-state appeared at all, but only after the full probe window.
    return {
      isSearchValueRetained,
      isNoResultsVisible: isNoResultsVisible || sawNoResultsDuringProbe,
      isOrderCardVisible,
    };
  }

  async ensureBookingRefRetained(searchTerm, tabLabel = 'current') {
    // Restores the visible search input value before failing so the final UI state matches the searched booking ref.
    const searchInput = await this.getVisibleSearchInput(tabLabel);
    const currentValue = await searchInput.inputValue().catch(() => '');
    if (currentValue.trim() === searchTerm) {
      return true;
    }

    const restored = await searchInput
      .fill(searchTerm)
      .then(() => true)
      .catch(() => false);
    if (!restored) {
      return false;
    }

    const restoredValue = await searchInput.inputValue().catch(() => '');
    return restoredValue.trim() === searchTerm;
  }

  async searchBookingRef(bookingRef, tabLabel = 'current') {
    // Runs bounded retries to search exact booking ref in the current tab and validates retained input + card match.
    const searchTerm = String(bookingRef);
    const maxSearchAttempts = 2;
    const orderCardBookingReferenceID = this.buildOrderCardBookingReferenceID(searchTerm);
    const tabLabelLower = String(tabLabel).toLowerCase();
    let isOrderCardVisible = false;

    for (let attempt = 1; attempt <= maxSearchAttempts; attempt += 1) {
      await this.focusSearchInput(tabLabel);
      await this.clearBookingRefSearch(tabLabel);
      await this.typeBookingRefSearch(searchTerm, tabLabelLower);

      const searchState = await this.waitForBookingRefSearchResults(
        searchTerm,
        orderCardBookingReferenceID,
        tabLabelLower
      );
      const { isSearchValueRetained, isNoResultsVisible } = searchState;
      isOrderCardVisible = searchState.isOrderCardVisible;

      if (isSearchValueRetained && isOrderCardVisible) break;

      if (attempt === maxSearchAttempts && !isSearchValueRetained) {
        markFailed(`Search input did not retain booking ref ${searchTerm} in ${tabLabel} tab`);
      }
      if (attempt === maxSearchAttempts && isNoResultsVisible) {
        await this.ensureBookingRefRetained(searchTerm, tabLabel);
        markFailed(`No results found for booking ref ${searchTerm} in ${tabLabel} tab`);
      }
    }

    if (!isOrderCardVisible) {
      await this.ensureBookingRefRetained(searchTerm, tabLabel);
      markFailed(`Order card for booking ref ${searchTerm} was not found in ${tabLabel} tab after retries`);
    }

    return { orderCardBookingReferenceID, isOrderCardVisible };
  }

  async searchBookingRefInTab(tabSelector, bookingRef, tabLabel = 'target') {
    // Opens a tab, then searches for the exact booking reference in that tab.
    await this.activateOrdersTab(tabSelector, tabLabel);
    return this.searchBookingRef(bookingRef, tabLabel);
  }

  async verifyBookingRefCardIsVisible(bookingRef, tabLabel = 'target') {
    // Verifies the exact booking-reference card is visible in the current tab.
    const orderCardBookingReferenceID = this.buildOrderCardBookingReferenceID(bookingRef);
    if (!(await safeWaitForElementVisible(this.page, orderCardBookingReferenceID, { timeout: Timeouts.short }))) {
      markFailed(`Order card is not visible for booking ref ${bookingRef} in ${tabLabel} tab`);
    }
  }

  async openBookingRefCard(bookingRef, tabLabel = 'target') {
    // Opens the exact booking-reference card from the current tab and waits for details to load.
    const orderCardBookingReferenceID = this.buildOrderCardBookingReferenceID(bookingRef);
    if (!(await safeClick(this.page, orderCardBookingReferenceID))) {
      markFailed(`Unable to open ${tabLabel.toLowerCase()} order details for booking ref ${bookingRef}`);
    }
    if (!(await safeWaitForPageLoad(this.page))) {
      markFailed(`Order details page did not load for booking ref ${bookingRef}`);
    }
  }

  async openBookingRefInTab(tabSelector, bookingRef, tabLabel = 'target') {
    // Shared opener: search exact booking ref in tab, click card, then wait details page ready.
    console.log(`Opening [${tabLabel.toLowerCase()} order] details for booking ref: ${bookingRef}`);
    await this.activateOrdersTab(tabSelector, tabLabel);
    await this.searchBookingRef(bookingRef, tabLabel);
    await this.verifyBookingRefCardIsVisible(bookingRef, tabLabel);
    await this.openBookingRefCard(bookingRef, tabLabel);
    console.log(`Opened [${tabLabel.toLowerCase()} order] details for booking ref: ${bookingRef}`);
  }

  async hasBookingRefInTab(tabSelector, bookingRef, tabLabel = 'target') {
    // Shared checker: searches in tab and verifies the matching order card is visible.
    await this.activateOrdersTab(tabSelector, tabLabel);
    await this.searchBookingRef(bookingRef, tabLabel);
    const orderCardBookingReferenceID = this.buildOrderCardBookingReferenceID(bookingRef);
    return this.page
      .locator(orderCardBookingReferenceID)
      .first()
      .isVisible()
      .catch(() => false);
  }

  async verifyOrderStatusOnDetails(statusSelector, statusLabel, maxAttempts) {
    // Refreshes the details page a bounded number of times until the expected status appears.
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const isStatusVisible = await safeWaitForElementVisible(this.page, statusSelector);
      if (isStatusVisible) {
        return true;
      }

      if (attempt < maxAttempts) {
        await this.page.reload();
        if (!(await safeWaitForPageLoad(this.page))) {
          markFailed(`Order details page did not load after refresh while verifying ${statusLabel} status`);
        }
      }
    }

    return false;
  }

  async verifyBookingRefInStatusTab(statusConfig, bookingRef, maxAttempts) {
    // Refreshes the Orders page a bounded number of times until the booking reference appears in the target tab.
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const isStatusInTab = await this.hasBookingRefInTab(statusConfig.tabSelector, bookingRef, statusConfig.tabLabel);
        if (isStatusInTab) {
          return true;
        }
      } catch {
      }

      if (attempt < maxAttempts) {
        await this.page.reload();
        if (!(await safeWaitForPageLoad(this.page))) {
          markFailed('Orders page did not load after refresh');
        }
      }
    }

    return false;
  }

  async verifyOrderInDetailsAndTab(bookingRef, status = 'COMPLETED') {
    // Generic status verifier: checks details page status first, then confirms order in matching Orders tab.
    const statusKey = String(status || '')
      .trim()
      .toUpperCase();
    const statusConfig = this.orderStatusConfigs[statusKey];
    if (!statusConfig) {
      markFailed(`Unsupported status verification target: ${status}`);
    }
    const maxStatusCheckAttempts = 3;
    const maxStatusTabAttempts = 3;

    const statusByBookingReferenceID = this.buildOrderDetailsStatusByBookingReferenceID(statusKey, bookingRef);
    const isStatusInOrderDetails = await this.verifyOrderStatusOnDetails(
      statusByBookingReferenceID,
      statusConfig.tabLabel,
      maxStatusCheckAttempts
    );
    if (!isStatusInOrderDetails) {
      markFailed(`Order ${bookingRef} status is not ${statusConfig.tabLabel} on order details page after retries`);
    }

    await this.open();
    const isStatusInTab = await this.verifyBookingRefInStatusTab(statusConfig, bookingRef, maxStatusTabAttempts);
    if (!isStatusInTab) {
      markFailed(`Order ${bookingRef} is not ${statusConfig.tabLabel.toUpperCase()} on merchant portal after refresh`);
    }
  }

  async verifyOrderCompletedInDetailsAndCompletedTab(bookingRef) {
    // Convenience wrapper for completed-status flows.
    await this.verifyOrderInDetailsAndTab(bookingRef, 'COMPLETED');
  }

  async verifyOrderCancelledInDetailsAndCancelledTab(bookingRef) {
    // Convenience wrapper for cancelled-status flows.
    await this.verifyOrderInDetailsAndTab(bookingRef, 'CANCELLED');
  }
}
