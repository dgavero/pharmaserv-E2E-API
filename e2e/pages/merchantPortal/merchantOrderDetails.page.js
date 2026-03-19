import {
  safeClick,
  safeInput,
  safeUploadFile,
  safeWaitForElementHidden,
  safeWaitForElementVisible,
  safeWaitForPageLoad,
} from '../../helpers/uiActions.js';
import { markFailed } from '../../helpers/testFailure.js';
import { loadSelectors, getSelector } from '../../helpers/selectors.js';
import { Timeouts } from '../../Timeouts.js';

export default class MerchantOrderDetailsPage {
  constructor(page) {
    // Stores page handle and selector map for order-details actions.
    this.page = page;
    this.sel = loadSelectors('merchant');
    this.s = {
      acceptButton: getSelector(this.sel, 'OrderDetails.AcceptButton'),
      uploadQRButton: getSelector(this.sel, 'OrderDetails.UploadQRButton'),
      assignBranchButton: getSelector(this.sel, 'OrderDetails.AssignBranchButton'),
      askRiderToQuoteCheckbox: getSelector(this.sel, 'OrderDetails.AskRiderToQuoteCheckbox'),
      requestForRiderButton: getSelector(this.sel, 'OrderDetails.RequestForRiderButton'),
      editItemButtons: getSelector(this.sel, 'OrderDetails.EditItemButtons'),
      priceInput: getSelector(this.sel, 'OrderDetails.PriceInput'),
      updateItemButton: getSelector(this.sel, 'OrderDetails.UpdateItemButton'),
      assignBranchSearchInput: getSelector(this.sel, 'OrderDetails.AssignBranchSearchInput'),
      assignBranchResultByKeywordTemplate: getSelector(this.sel, 'OrderDetails.AssignBranchResultByKeywordTemplate'),
      assignBranchFirstResult: getSelector(this.sel, 'OrderDetails.AssignBranchFirstResult'),
      assignBranchConfirmButton: getSelector(this.sel, 'OrderDetails.AssignBranchConfirmButton'),
      requestPaymentButton: getSelector(this.sel, 'OrderDetails.RequestPaymentButton'),
      requestPaymentLoadingButton: getSelector(this.sel, 'OrderDetails.RequestPaymentLoadingButton'),
      qrCodeFileInput: getSelector(this.sel, 'OrderDetails.QRCodeFileInput'),
      uploadQRSubmitButton: getSelector(this.sel, 'OrderDetails.UploadQRSubmitButton'),
      addItemsButton: getSelector(this.sel, 'OrderDetails.AddItemsButton'),
      addItemModal: getSelector(this.sel, 'OrderDetails.AddItemModal'),
      addItemSearchInput: getSelector(this.sel, 'OrderDetails.AddItemSearchInput'),
      addItemSearchSecondResult: getSelector(this.sel, 'OrderDetails.AddItemSearchSecondResult'),
      addItemQuantityIncreaseButton: getSelector(this.sel, 'OrderDetails.AddItemQuantityIncreaseButton'),
      addItemPriceInput: getSelector(this.sel, 'OrderDetails.AddItemPriceInput'),
      addItemConfirmButton: getSelector(this.sel, 'OrderDetails.AddItemConfirmButton'),
      quantityChangeModalMessage: getSelector(this.sel, 'OrderDetails.QuantityChangeModalMessage'),
      quantityChangeModalCloseButton: getSelector(this.sel, 'OrderDetails.QuantityChangeModalCloseButton'),
      requoteRequestModalMessage: getSelector(this.sel, 'OrderDetails.RequoteRequestModalMessage'),
      requoteRequestModalCloseButton: getSelector(this.sel, 'OrderDetails.RequoteRequestModalCloseButton'),
      pickupReadyButton: getSelector(this.sel, 'OrderDetails.PickupReadyButton'),
      pickListPrintButton: getSelector(this.sel, 'OrderDetails.PickListPrintButton'),
      statusPreparing: getSelector(this.sel, 'OrderDetails.StatusPreparing'),
      statusWaitingForRider: getSelector(this.sel, 'OrderDetails.StatusWaitingForRider'),
      statusWaitingForPatient: getSelector(this.sel, 'OrderDetails.StatusWaitingForPatient'),
      statusCompleted: getSelector(this.sel, 'OrderDetails.StatusCompleted'),
    };
  }

  async acceptOrder() {
    // Accepts the order and verifies next-stage quotation actions are available.
    console.log('Accepting order in merchant portal...');
    await this.clickAcceptOrder();
    await this.verifyQuoteActionsReady();
  }

  async clickAcceptOrder() {
    // Clicks the accept-order action from the details page.
    if (!(await safeWaitForElementVisible(this.page, this.s.acceptButton))) {
      markFailed('Accept order button is not visible');
    }
    if (!(await safeClick(this.page, this.s.acceptButton))) {
      markFailed('Unable to click accept order');
    }
  }

  async verifyQuoteActionsReady() {
    // Confirms the next-stage merchant quotation actions are available after acceptance.
    if (!(await safeWaitForPageLoad(this.page, [this.s.uploadQRButton, this.s.assignBranchButton]))) {
      markFailed('Neither Upload QR nor Assign Branch action appeared after accepting order');
    }
  }

  async acceptOrderForRiderQuote() {
    // Accepts order for rider-quote flows where payment QR is handled by rider, not merchant.
    await this.clickAcceptOrder();
  }

  async requestForRiderToQuote(askRiderToQuote = false) {
    // Requests rider; only toggles "Ask rider to quote" when explicitly enabled for rider-quote flows.
    await this.setAskRiderToQuote(Boolean(askRiderToQuote));
    await this.clickRequestForRider();
    await this.verifyQuoteActionsReady();
  }

  async setAskRiderToQuote(enabled) {
    // Enables the rider-quote toggle only when explicitly requested.
    if (!enabled) return;
    if (!(await safeWaitForElementVisible(this.page, this.s.askRiderToQuoteCheckbox))) {
      markFailed('Ask rider to quote toggle is not visible');
    }
    if (!(await safeClick(this.page, this.s.askRiderToQuoteCheckbox))) {
      markFailed('Unable to enable Ask rider to quote toggle');
    }
  }

  async clickRequestForRider() {
    // Clicks the merchant request-for-rider action.
    if (!(await safeWaitForElementVisible(this.page, this.s.requestForRiderButton))) {
      markFailed('Request for Rider button is not visible');
    }
    if (!(await safeClick(this.page, this.s.requestForRiderButton))) {
      markFailed('Unable to click Request for Rider');
    }
  }

  async assignBranchToFirstMatchingPharmacy(keyword = 'dev') {
    // Assigns branch using search and selects the first matching pharmacy result.
    const searchKeyword = String(keyword || '').trim();
    if (!searchKeyword) {
      markFailed('assignBranchToFirstMatchingPharmacy requires a non-empty keyword');
    }

    await this.openAssignBranchDialog();
    await this.searchAssignBranch(searchKeyword);
    await this.selectAssignBranchResult(searchKeyword);
    await this.confirmAssignBranch();
    await this.verifyBranchAssignmentApplied();
  }

  async openAssignBranchDialog() {
    // Opens the assign-branch dialog from order details.
    if (!(await safeWaitForElementVisible(this.page, this.s.assignBranchButton))) {
      markFailed('Assign branch button is not visible');
    }
    if (!(await safeClick(this.page, this.s.assignBranchButton))) {
      markFailed('Unable to open assign branch dialog');
    }
  }

  async searchAssignBranch(keyword) {
    // Searches the assign-branch dialog using the provided pharmacy keyword.
    if (!(await safeWaitForElementVisible(this.page, this.s.assignBranchSearchInput))) {
      markFailed('Assign branch search input is not visible');
    }
    if (!(await safeInput(this.page, this.s.assignBranchSearchInput, keyword))) {
      markFailed(`Unable to search branch keyword "${keyword}"`);
    }
  }

  async selectAssignBranchResult(keyword) {
    // Selects either the keyword-matched branch row or the first available result.
    const keywordForMatch = String(keyword || '').trim().toLowerCase();
    const assignBranchResultByKeyword = this.s.assignBranchResultByKeywordTemplate.replace(
      '{keyword}',
      keywordForMatch
    );

    const keywordResultVisible = await safeWaitForElementVisible(this.page, assignBranchResultByKeyword);
    if (keywordResultVisible) {
      if (!(await safeClick(this.page, assignBranchResultByKeyword))) {
        markFailed(`Unable to select assign-branch result for keyword "${keywordForMatch}"`);
      }
      return;
    }

    if (!(await safeWaitForElementVisible(this.page, this.s.assignBranchFirstResult))) {
      markFailed(`No assign-branch result found for keyword "${keyword}"`);
    }
    if (!(await safeClick(this.page, this.s.assignBranchFirstResult))) {
      markFailed(`Unable to select first assign-branch result after searching "${keyword}"`);
    }
  }

  async confirmAssignBranch() {
    // Confirms the currently selected branch in the assign dialog.
    if (!(await safeWaitForElementVisible(this.page, this.s.assignBranchConfirmButton))) {
      markFailed('Assign branch confirm button is not visible');
    }
    if (!(await safeClick(this.page, this.s.assignBranchConfirmButton))) {
      markFailed('Unable to confirm assign branch');
    }
  }

  async verifyBranchAssignmentApplied() {
    // Assignment should unlock quote actions through the Upload QR button.
    if (!(await safeWaitForElementVisible(this.page, this.s.uploadQRButton))) {
      markFailed('Upload QR button did not appear after assigning branch');
    }
  }

  async uploadQRCode(imagePath) {
    // Uploads QR code proof and validates request-payment CTA becomes visible.
    await this.openUploadQRDialog();
    await this.selectQRCodeFile(imagePath);
    await this.submitQRCodeUpload();
    await this.verifyRequestPaymentReady();
  }

  async openUploadQRDialog() {
    // Opens the QR upload dialog from order details.
    if (!(await safeWaitForElementVisible(this.page, this.s.uploadQRButton))) {
      markFailed('Upload QR button is not visible');
    }
    if (!(await safeClick(this.page, this.s.uploadQRButton))) {
      markFailed('Unable to open upload QR dialog');
    }
  }

  async selectQRCodeFile(imagePath) {
    // Selects the QR image file in the upload dialog.
    if (!(await safeUploadFile(this.page, this.s.qrCodeFileInput, imagePath))) {
      markFailed('Unable to set QR code file for upload');
    }
  }

  async submitQRCodeUpload() {
    // Submits the QR upload dialog.
    if (!(await safeWaitForElementVisible(this.page, this.s.uploadQRSubmitButton))) {
      markFailed('Upload submit button is not visible');
    }
    if (!(await safeClick(this.page, this.s.uploadQRSubmitButton))) {
      markFailed('Unable to upload QR code');
    }
  }

  async verifyRequestPaymentReady() {
    // Confirms request-payment CTA appears after QR upload or equivalent readiness transition.
    if (!(await safeWaitForElementVisible(this.page, this.s.requestPaymentButton))) {
      markFailed('Request Payment button did not appear after uploading QR code');
    }
  }

  async updatePriceItems(priceItems) {
    // Updates each editable item price; covers variable item counts from live orders.
    if (!Array.isArray(priceItems) || priceItems.length === 0) {
      markFailed('updatePriceItems requires at least one price item');
    }

    const editButtonCount = await this.waitForEditableItemsReady();
    if (editButtonCount === 0) {
      markFailed('No editable items found for pricing after retries');
    }

    for (let index = 0; index < editButtonCount; index += 1) {
      const fallbackPrice = priceItems[priceItems.length - 1]?.unitPrice ?? 10;
      const price = priceItems[index]?.unitPrice ?? fallbackPrice;

      await this.openEditItemByIndex(index);
      await this.setItemPrice(price, index);
      await this.submitItemUpdate(index);
    }
  }

  async waitForEditableItemsReady() {
    // Polls briefly for editable item buttons to appear while the quotation panel is still rendering.
    const firstEditButton = `(${this.s.editItemButtons})[1]`;
    if (!(await safeWaitForElementVisible(this.page, firstEditButton))) {
      markFailed('First edit button is not visible for pricing');
    }

    const deadline = Date.now() + Timeouts.short;
    const probeIntervalMs = 300;

    while (Date.now() < deadline) {
      const editButtonCount = await this.page.locator(this.s.editItemButtons).count();
      if (editButtonCount > 0) {
        return editButtonCount;
      }

      await this.page.waitForTimeout(probeIntervalMs);
    }

    return 0;
  }

  async openEditItemByIndex(index) {
    // Opens the edit dialog for the item at the given zero-based index.
    const editButtonByIndex = `(${this.s.editItemButtons})[${index + 1}]`;
    if (!(await safeWaitForElementVisible(this.page, editButtonByIndex))) {
      markFailed(`Edit button is not visible for item index ${index + 1}`);
    }
    if (!(await safeClick(this.page, editButtonByIndex))) {
      markFailed(`Unable to open edit modal for item index ${index + 1}`);
    }
  }

  async setItemPrice(price, index) {
    // Sets the price value inside the current edit-item dialog.
    if (!(await safeInput(this.page, this.s.priceInput, String(price)))) {
      markFailed(`Unable to set unit price for item index ${index + 1}`);
    }
  }

  async submitItemUpdate(index) {
    // Submits the current edit-item dialog with one retry for transient re-render/focus issues.
    let updated = await safeClick(this.page, this.s.updateItemButton);
    if (!updated) {
      if (!(await safeWaitForElementVisible(this.page, this.s.updateItemButton))) {
        markFailed(`Update item button is not visible for item index ${index + 1}`);
      }
      updated = await safeClick(this.page, this.s.updateItemButton);
    }
    if (!updated) {
      markFailed(`Unable to update item index ${index + 1}`);
    }
    if (!(await safeWaitForElementHidden(this.page, this.s.updateItemButton))) {
      markFailed(`Update item dialog did not close for item index ${index + 1}`);
    }
  }

  async addItemToOrder(medicineName, medicinePrice, medicineQty) {
    // Adds medicine from Add Item modal: search -> pick second result -> set qty/price -> add.
    const name = String(medicineName || '').trim();
    const price = String(medicinePrice ?? '').trim();
    const qty = Number(medicineQty);
    if (!name) {
      markFailed('addItemToOrder requires a non-empty medicineName');
    }
    if (!price) {
      markFailed(`addItemToOrder requires medicinePrice for ${name}`);
    }
    if (!Number.isFinite(qty) || qty < 1) {
      markFailed(`addItemToOrder requires medicineQty >= 1 for ${name}`);
    }

    await this.openAddItemModal();
    await this.searchMedicineForAddItem(name);
    await this.selectMedicineSearchResult(name);
    await this.setAddItemQuantity(qty, name);
    await this.setAddItemPrice(price, name);
    await this.confirmAddItem(name);
  }

  async openAddItemModal() {
    // Opens the Add Item modal from order details.
    if (!(await safeWaitForElementVisible(this.page, this.s.addItemsButton))) {
      markFailed('Add Items button is not visible');
    }
    if (!(await safeClick(this.page, this.s.addItemsButton))) {
      markFailed('Unable to open Add Item modal');
    }
    if (!(await safeWaitForElementVisible(this.page, this.s.addItemModal))) {
      markFailed('Add Item modal is not visible');
    }
  }

  async searchMedicineForAddItem(name) {
    // Searches a medicine name inside the Add Item modal.
    if (!(await safeWaitForElementVisible(this.page, this.s.addItemSearchInput))) {
      markFailed('Add Item search input is not visible');
    }
    if (!(await safeInput(this.page, this.s.addItemSearchInput, name))) {
      markFailed(`Unable to search medicine "${name}"`);
    }
  }

  async selectMedicineSearchResult(name) {
    // Selects the existing second-result locator from the Add Item search results.
    if (!(await safeWaitForElementVisible(this.page, this.s.addItemSearchSecondResult))) {
      markFailed(`Second search result is not visible for medicine "${name}"`);
    }
    if (!(await safeClick(this.page, this.s.addItemSearchSecondResult))) {
      markFailed(`Unable to select second search result for medicine "${name}"`);
    }
  }

  async setAddItemQuantity(qty, name) {
    // Increases medicine quantity from the default of one to the requested amount.
    for (let count = 1; count < qty; count += 1) {
      if (!(await safeClick(this.page, this.s.addItemQuantityIncreaseButton))) {
        markFailed(`Unable to increase quantity for medicine "${name}" to ${qty}`);
      }
    }
  }

  async setAddItemPrice(price, name) {
    // Sets the medicine price inside the Add Item modal.
    if (!(await safeClick(this.page, this.s.addItemPriceInput))) {
      markFailed(`Unable to focus price input for medicine "${name}"`);
    }
    const selectAllShortcut = process.platform === 'darwin' ? 'Meta+A' : 'Control+A';
    await this.page.keyboard.press(selectAllShortcut).catch(() => {});
    const typed = await this.page.keyboard
      .type(price)
      .then(() => true)
      .catch(() => false);
    if (!typed) {
      markFailed(`Unable to set price for medicine "${name}"`);
    }
  }

  async confirmAddItem(name) {
    // Submits the Add Item modal and verifies it closes.
    if (!(await safeClick(this.page, this.s.addItemConfirmButton))) {
      markFailed(`Unable to click Add for medicine "${name}"`);
    }
    if (!(await safeWaitForElementHidden(this.page, this.s.addItemModal))) {
      markFailed(`Add Item modal did not close after adding medicine "${name}"`);
    }
  }

  async sendQuote() {
    // Waits until request-payment is actionable, submits quote, and waits until loading state clears.
    if (!(await safeWaitForElementVisible(this.page, this.s.requestPaymentButton))) {
      markFailed('Request payment button is not visible');
    }
    if (!(await safeClick(this.page, this.s.requestPaymentButton))) {
      markFailed('Unable to click request payment');
    }
    if (!(await this.waitForQuoteSubmissionToSettle())) {
      markFailed('Request payment is still loading; quote submit did not finish');
    }
  }

  async prepareOrderForPickup() {
    // Generates the pick list and verifies the order advances to PREPARING with the next pickup action available.
    await this.clickPickupReadyButton('Generate Pick List');
    await this.dismissPickListOverlayIfPresent();
    await this.waitForPickupState({
      expectedStatusSelector: this.s.statusPreparing,
      expectedActionLabel: 'Ready for Pick Up',
      failureContext: 'PREPARING after generating pick list',
    });
  }

  async setOrderReadyForPickup() {
    // Marks the prepared order as ready for pickup and verifies the order advances to WAITING FOR RIDER.
    await this.clickPickupReadyButton('Ready for Pick Up');
    await this.waitForPickupState({
      expectedStatusSelector: this.s.statusWaitingForRider,
      expectedActionLabel: 'Order Picked Up',
      failureContext: 'WAITING FOR RIDER after setting ready for pickup',
    });
  }

  async setOrderReadyForPatientPickup() {
    // Marks the prepared pickup order as ready and verifies the patient-pickup state exposes the final pickup CTA.
    await this.clickPickupReadyButton('Ready for Pick Up');
    await this.waitForPickupState({
      expectedStatusSelector: this.s.statusWaitingForPatient,
      expectedActionLabel: 'Order Picked Up',
      failureContext: 'WAITING FOR PATIENT after setting ready for pickup',
    });
  }

  async confirmPatientPickupCompleted() {
    // Finalizes pickup-mode orders from the merchant UI and waits for Completed status on the details page.
    await this.clickPickupReadyButton('Order Picked Up');
    await this.waitForPickupState({
      expectedStatusSelector: this.s.statusCompleted,
      failureContext: 'COMPLETED after confirming patient pickup',
    });
  }

  async clickPickupReadyButton(expectedLabel) {
    // Clicks the pickup action button only when it matches the expected current merchant state label.
    if (!(await safeWaitForElementVisible(this.page, this.s.pickupReadyButton))) {
      markFailed(`Pickup action button is not visible for "${expectedLabel}"`);
    }

    const pickupReadyButton = this.page.locator(this.s.pickupReadyButton).first();
    const currentLabel = await pickupReadyButton.innerText().catch(() => '');
    if (!String(currentLabel || '').includes(expectedLabel)) {
      markFailed(`Expected pickup action "${expectedLabel}" but found "${String(currentLabel || '').trim() || 'unknown'}"`);
    }

    if (!(await safeClick(this.page, this.s.pickupReadyButton))) {
      markFailed(`Unable to click pickup action "${expectedLabel}"`);
    }
  }

  async dismissPickListOverlayIfPresent() {
    // Dismisses the pick-list preview overlay once it appears so the next pickup action becomes clickable.
    const deadline = Date.now() + Timeouts.short;
    const probeIntervalMs = 200;

    while (Date.now() < deadline) {
      const overlayVisible = await this.page
        .locator(this.s.pickListPrintButton)
        .first()
        .isVisible()
        .catch(() => false);
      if (overlayVisible) {
        await this.page.keyboard.press('Escape').catch(() => {});

        const overlayHidden = await safeWaitForElementHidden(this.page, this.s.pickListPrintButton, {
          timeout: Timeouts.short,
        });
        if (!overlayHidden) {
          markFailed('Pick-list overlay did not close after generating pick list');
        }
        return;
      }

      const pickupButtonVisible = await this.page
        .locator(this.s.pickupReadyButton)
        .first()
        .isVisible()
        .catch(() => false);
      if (pickupButtonVisible) {
        const currentLabel = await this.page.locator(this.s.pickupReadyButton).first().innerText().catch(() => '');
        if (String(currentLabel || '').includes('Ready for Pick Up')) {
          return;
        }
      }

      await this.page.waitForTimeout(probeIntervalMs);
    }
  }

  async waitForPickupState({ expectedStatusSelector, expectedActionLabel, failureContext }) {
    // Polls the live order-details view until either the expected status heading or the next pickup action label appears.
    const deadline = Date.now() + Timeouts.short;
    const probeIntervalMs = 300;

    while (Date.now() < deadline) {
      if (expectedStatusSelector) {
        const statusVisible = await this.page
          .locator(expectedStatusSelector)
          .first()
          .isVisible()
          .catch(() => false);
        if (statusVisible) {
          return;
        }
      }

      const pickupButtonVisible = await this.page
        .locator(this.s.pickupReadyButton)
        .first()
        .isVisible()
        .catch(() => false);
      if (pickupButtonVisible) {
        const pickupReadyButton = this.page.locator(this.s.pickupReadyButton).first();
        const currentLabel = await pickupReadyButton.innerText().catch(() => '');
        if (expectedActionLabel && String(currentLabel || '').includes(expectedActionLabel)) {
          return;
        }
      }

      await this.page.waitForTimeout(probeIntervalMs);
    }

    markFailed(`Order did not advance to ${failureContext}`);
  }

  async waitForQuoteSubmissionToSettle() {
    // Quote submission is complete once the loading-state request-payment control disappears.
    const loadingCleared = await safeWaitForElementHidden(this.page, this.s.requestPaymentLoadingButton);
    if (!loadingCleared) {
      return false;
    }

    return safeWaitForElementVisible(this.page, this.s.requestPaymentButton, {
      timeout: Timeouts.short,
    });
  }

  async verifyQuantityChangedModalAppeared() {
    // Verifies merchant receives the quantity-change modal after patient requote/payment update.
    console.log('Verifying quantity-change modal appears on merchant portal...');
    if (!(await safeWaitForElementVisible(this.page, this.s.quantityChangeModalMessage))) {
      markFailed('Expected quantity-change modal was not shown on merchant portal');
    }
    console.log('Quantity-change modal appeared as expected');

    const closeVisible = await safeWaitForElementVisible(this.page, this.s.quantityChangeModalCloseButton);
    if (!closeVisible) {
      markFailed('Quantity-change modal close button is not visible');
    }
    if (!(await safeClick(this.page, this.s.quantityChangeModalCloseButton))) {
      markFailed('Unable to close quantity-change modal');
    }
  }

  async closeRequoteRequestModal() {
    // Closes re-quote request modal when present; proceeds if it is not shown.
    const isModalVisible = await safeWaitForElementVisible(this.page, this.s.requoteRequestModalMessage);
    if (!isModalVisible) return;
    if (!(await safeClick(this.page, this.s.requoteRequestModalCloseButton))) {
      markFailed('Unable to close re-quote request modal');
    }
  }
}
