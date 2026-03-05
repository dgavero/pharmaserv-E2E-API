import {
  markFailed,
  safeClearText,
  safeClick,
  safeInput,
  safeWaitForElementVisible,
  safeWaitForPageLoad,
} from '../../helpers/testUtilsUI.js';
import { Timeouts } from '../../Timeouts.js';
import { loadSelectors, getSelector } from '../../helpers/selectors.js';

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
    await this.openOrderByBookingRefInTab(this.tabs.new, bookingRef, 'New');
  }

  async openOngoingOrderByBookingRef(bookingRef) {
    // Opens a specific booking reference from the Ongoing tab.
    await this.openOrderByBookingRefInTab(this.tabs.ongoing, bookingRef, 'Ongoing');
  }

  async hasCompletedOrderByBookingRef(bookingRef) {
    // Returns whether a booking reference is visible in Completed tab results.
    return this.hasOrderByBookingRefInTab(this.tabs.completed, bookingRef, 'Completed');
  }

  async hasCancelledOrderByBookingRef(bookingRef) {
    // Returns whether a booking reference is visible in Cancelled tab results.
    return this.hasOrderByBookingRefInTab(this.tabs.cancelled, bookingRef, 'Cancelled');
  }

  buildOrderCardBookingReferenceID(bookingRef) {
    // Resolves the dynamic order-card selector for the exact booking reference.
    return this.orderCardBookingReferenceIDTemplate.replace('{bookingRef}', String(bookingRef));
  }

  async openOrderByBookingRefInTab(tabSelector, bookingRef, tabLabel = 'target') {
    // Shared opener: search exact booking ref in tab, click card, then wait details page ready.
    const orderCardBookingReferenceID = await this.searchOrderInTab(tabSelector, bookingRef, tabLabel);
    if (!(await safeWaitForElementVisible(this.page, orderCardBookingReferenceID))) {
      markFailed(`Order card is not visible for booking ref ${bookingRef} in ${tabLabel} tab`);
    }
    if (!(await safeClick(this.page, orderCardBookingReferenceID))) {
      markFailed(`Unable to open ${tabLabel.toLowerCase()} order details for booking ref ${bookingRef}`);
    }
    if (!(await safeWaitForPageLoad(this.page))) {
      markFailed(`Order details page did not load for booking ref ${bookingRef}`);
    }
  }

  async hasOrderByBookingRefInTab(tabSelector, bookingRef, tabLabel = 'target') {
    // Shared checker: searches in tab and verifies the matching order card is visible.
    const orderCardBookingReferenceID = await this.searchOrderInTab(tabSelector, bookingRef, tabLabel);
    return this.page
      .locator(orderCardBookingReferenceID)
      .first()
      .isVisible()
      .catch(() => false);
  }

  async searchOrderInTab(tabSelector, bookingRef, tabLabel = 'target') {
    // Runs bounded retries to search exact booking ref and validates retained input + card match.
    const searchTerm = String(bookingRef);
    const maxSearchAttempts = 2;
    const orderCardBookingReferenceID = this.buildOrderCardBookingReferenceID(searchTerm);
    const tabLabelLower = String(tabLabel).toLowerCase();
    let isOrderCardVisible = false;

    for (let attempt = 1; attempt <= maxSearchAttempts; attempt += 1) {
      if (!(await safeWaitForElementVisible(this.page, tabSelector))) {
        markFailed(`Unable to find ${tabLabel} orders tab`);
      }
      if (!(await safeClick(this.page, tabSelector))) {
        markFailed(`Unable to open ${tabLabel} orders tab`);
      }
      if (!(await safeWaitForPageLoad(this.page, [this.searchInput, tabSelector], { timeout: Timeouts.standard }))) {
        markFailed(`Orders tab did not stabilize before searching in ${tabLabel} tab`);
      }
      if (!(await safeWaitForElementVisible(this.page, this.searchInput))) {
        markFailed(`Unable to find search input in ${tabLabel} tab`);
      }
      if (!(await safeClick(this.page, this.searchInput))) {
        markFailed(`Unable to focus search input in ${tabLabel} tab`);
      }
      if (!(await safeClearText(this.page))) {
        markFailed(`Unable to clear search input in ${tabLabel} tab`);
      }

      if (!(await safeInput(this.page, this.searchInput, searchTerm))) {
        markFailed(`Unable to search ${tabLabelLower} order ${searchTerm}`);
      }
      if (
        !(await safeWaitForPageLoad(
          this.page,
          [orderCardBookingReferenceID, this.noResultsFoundMessage, this.searchInput],
          {
            timeout: Timeouts.standard,
          }
        ))
      ) {
        markFailed(`Search results did not stabilize for ${tabLabelLower} booking ref ${searchTerm}`);
      }

      const searchValueAfterEnter = await this.page
        .locator(this.searchInput)
        .first()
        .inputValue()
        .catch(() => '');
      const isSearchValueRetained = searchValueAfterEnter.trim() === searchTerm;
      const isNoResultsVisible = await this.page
        .locator(this.noResultsFoundMessage)
        .first()
        .isVisible()
        .catch(() => false);

      isOrderCardVisible = await safeWaitForElementVisible(this.page, orderCardBookingReferenceID, {
        timeout: Timeouts.short,
      });
      if (isSearchValueRetained && isOrderCardVisible) break;

      if (attempt === maxSearchAttempts && !isSearchValueRetained) {
        markFailed(`Search input did not retain booking ref ${searchTerm} in ${tabLabel} tab`);
      }
      if (attempt === maxSearchAttempts && isNoResultsVisible) {
        markFailed(`No results found for booking ref ${searchTerm} in ${tabLabel} tab`);
      }
    }

    if (!isOrderCardVisible) {
      markFailed(`Order card for booking ref ${searchTerm} was not found in ${tabLabel} tab after retries`);
    }

    return orderCardBookingReferenceID;
  }

  buildOrderDetailsStatusByBookingReferenceID(statusKey, bookingRef) {
    const statusConfig = this.orderStatusConfigs[statusKey];
    return statusConfig.detailsTemplate.replace('{bookingRef}', String(bookingRef));
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
    let isStatusInOrderDetails = false;
    for (let attempt = 1; attempt <= maxStatusCheckAttempts; attempt += 1) {
      isStatusInOrderDetails = await safeWaitForElementVisible(this.page, statusByBookingReferenceID);
      if (isStatusInOrderDetails) break;

      if (attempt < maxStatusCheckAttempts) {
        await this.page.reload();
        if (this.page.url().includes('/login')) {
          markFailed(
            `Merchant session redirected to login while waiting for ${statusConfig.tabLabel} status on order details`
          );
        }
        if (!(await safeWaitForPageLoad(this.page))) {
          markFailed(`Order details page did not load after refresh while verifying ${statusConfig.tabLabel} status`);
        }
      }
    }
    if (!isStatusInOrderDetails) {
      markFailed(`Order ${bookingRef} status is not ${statusConfig.tabLabel} on order details page after retries`);
    }

    await this.open();
    let isStatusInTab = false;
    for (let attempt = 1; attempt <= maxStatusTabAttempts; attempt += 1) {
      try {
        isStatusInTab = await this.hasOrderByBookingRefInTab(
          statusConfig.tabSelector,
          bookingRef,
          statusConfig.tabLabel
        );
      } catch {
        isStatusInTab = false;
      }
      if (isStatusInTab) break;

      if (attempt < maxStatusTabAttempts) {
        await this.page.reload();
        if (!(await safeWaitForPageLoad(this.page))) {
          markFailed('Orders page did not load after refresh');
        }
      }
    }
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
