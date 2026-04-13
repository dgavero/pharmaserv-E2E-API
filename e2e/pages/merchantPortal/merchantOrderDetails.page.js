import { expect } from '@playwright/test';
import {
  safeClick,
  safeFill,
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
      editItemModal: getSelector(this.sel, 'OrderDetails.EditItemModal'),
      editItemReplaceRadio: getSelector(this.sel, 'OrderDetails.EditItemReplaceRadio'),
      editItemSearchInput: getSelector(this.sel, 'OrderDetails.EditItemSearchInput'),
      editItemSearchOptions: getSelector(this.sel, 'OrderDetails.EditItemSearchOptions'),
      editItemTypeDropdown: getSelector(this.sel, 'OrderDetails.EditItemTypeDropdown'),
      editItemTemperatureDropdown: getSelector(this.sel, 'OrderDetails.EditItemTemperatureDropdown'),
      editItemDiscountDropdown: getSelector(this.sel, 'OrderDetails.EditItemDiscountDropdown'),
      editItemDropdownOptionByLabelTemplate: getSelector(this.sel, 'OrderDetails.EditItemDropdownOptionByLabelTemplate'),
      editItemVATExemptCheckbox: getSelector(this.sel, 'OrderDetails.EditItemVATExemptCheckbox'),
      editItemDiscountedQtyInput: getSelector(this.sel, 'OrderDetails.EditItemDiscountedQtyInput'),
      editItemQtyInput: getSelector(this.sel, 'OrderDetails.EditItemQtyInput'),
      requestPaymentTotalText: getSelector(this.sel, 'OrderDetails.RequestPaymentTotalText'),
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
      pickupSuccessfulModalMessage: getSelector(this.sel, 'OrderDetails.PickupSuccessfulModalMessage'),
      pickupSuccessfulModalCloseButton: getSelector(this.sel, 'OrderDetails.PickupSuccessfulModalCloseButton'),
      requoteRequestModalMessage: getSelector(this.sel, 'OrderDetails.RequoteRequestModalMessage'),
      requoteRequestModalCloseButton: getSelector(this.sel, 'OrderDetails.RequoteRequestModalCloseButton'),
      pickupReadyButton: getSelector(this.sel, 'OrderDetails.PickupReadyButton'),
      printQROverlay: getSelector(this.sel, 'OrderDetails.PrintQROverlay'),
      printQROverlayCloseButton: getSelector(this.sel, 'OrderDetails.PrintQROverlayCloseButton'),
      printQROverlayPrintButton: getSelector(this.sel, 'OrderDetails.PrintQROverlayPrintButton'),
      pickListPrintButton: getSelector(this.sel, 'OrderDetails.PickListPrintButton'),
      statusPreparing: getSelector(this.sel, 'OrderDetails.StatusPreparing'),
      statusWaitingForRider: getSelector(this.sel, 'OrderDetails.StatusWaitingForRider'),
      statusWaitingForPatient: getSelector(this.sel, 'OrderDetails.StatusWaitingForPatient'),
      statusCompleted: getSelector(this.sel, 'OrderDetails.StatusCompleted'),
      declineButton: getSelector(this.sel, 'OrderDetails.DeclineButton'),
      declineConfirmModal: getSelector(this.sel, 'OrderDetails.DeclineConfirmModal'),
      declineReasonDropdown: getSelector(this.sel, 'OrderDetails.DeclineReasonDropdown'),
      declineReasonOptionByLabelTemplate: getSelector(this.sel, 'OrderDetails.DeclineReasonOptionByLabelTemplate'),
      declineReasonInput: getSelector(this.sel, 'OrderDetails.DeclineReasonInput'),
      declineConfirmButton: getSelector(this.sel, 'OrderDetails.DeclineConfirmButton'),
      declineResultModal: getSelector(this.sel, 'OrderDetails.DeclineResultModal'),
      declineResultModalCloseXButton: getSelector(this.sel, 'OrderDetails.DeclineResultModalCloseXButton'),
      cancelledStatusReasonContainsTemplate: getSelector(this.sel, 'OrderDetails.CancelledStatusReasonContainsTemplate'),
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
    const keywordForMatch = String(keyword || '')
      .trim()
      .toLowerCase();
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

    let editButtonCount = 0;
    try {
      await expect
        .poll(
          async () => {
            editButtonCount = await this.page.locator(this.s.editItemButtons).count();
            return editButtonCount > 0;
          },
          {
            timeout: Timeouts.short,
            intervals: [300],
          }
        )
        .toBe(true);
    } catch {}

    return editButtonCount;
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

  async replaceFirstItemAndApplyQuoteUpdates({
    medicineKeyword,
    fallbackMedicineKeyword,
    vatExempt = false,
    typeLabel,
    temperatureLabel,
    discountLabel,
    unitPrice,
    quantity,
    discountedQty,
  }) {
    // Updates first quotation row via replace flow and applies optional pricing/metadata fields.
    await this.openEditItemByIndex(0);
    if (!(await safeWaitForElementVisible(this.page, this.s.editItemModal))) {
      markFailed('Edit item modal is not visible');
    }

    await this.selectReplaceModeForEditItem();
    await this.searchAndSelectReplacementMedicine(medicineKeyword, {
      fallbackKeyword: fallbackMedicineKeyword,
    });
    await this.enableVATExempt(vatExempt);

    if (typeLabel) {
      await this.selectEditItemType(typeLabel);
    }
    if (temperatureLabel) {
      await this.selectEditItemTemperature(temperatureLabel);
    }
    if (discountLabel) {
      await this.selectEditItemDiscount(discountLabel);
    }
    if (unitPrice != null) {
      await this.setEditItemPrice(unitPrice);
    }
    if (quantity != null) {
      await this.setEditItemQuantity(quantity);
    }
    if (discountedQty != null) {
      await this.setEditItemDiscountedQuantity(discountedQty);
    }

    await this.submitItemUpdate(0);
  }

  async selectReplaceModeForEditItem() {
    // Switches the edit flow to replace mode so medicine search can change to a different item.
    if (!(await safeWaitForElementVisible(this.page, this.s.editItemReplaceRadio))) {
      markFailed('Replace option is not visible in edit item modal');
    }
    const replaceRadio = this.page.locator(this.s.editItemReplaceRadio).first();
    const alreadyChecked = (await replaceRadio.getAttribute('aria-checked').catch(() => '')) === 'true';
    if (alreadyChecked) {
      return;
    }
    if (!(await safeClick(this.page, this.s.editItemReplaceRadio))) {
      markFailed('Unable to select replace mode in edit item modal');
    }
  }

  async searchAndSelectReplacementMedicine(medicineKeyword, { fallbackKeyword } = {}) {
    // Searches medicine in replace mode and chooses the regular medicine result (preferred second result when present).
    const keyword = String(medicineKeyword || '').trim();
    if (!keyword) {
      markFailed('searchAndSelectReplacementMedicine requires a non-empty medicine keyword');
    }

    const trySelect = async (searchKeyword) => {
      const normalizedKeyword = String(searchKeyword || '').trim();
      if (!normalizedKeyword) {
        return false;
      }

      if (!(await safeWaitForElementVisible(this.page, this.s.editItemSearchInput))) {
        markFailed('Replace medicine search input is not visible');
      }

      const searchInput = this.page.locator(this.s.editItemSearchInput).first();
      const focused = await searchInput
        .click()
        .then(() => true)
        .catch(() => false);
      if (!focused) {
        markFailed(`Unable to focus replacement medicine input for keyword "${normalizedKeyword}"`);
      }
      const selectAllShortcut = process.platform === 'darwin' ? 'Meta+A' : 'Control+A';
      await this.page.keyboard.press(selectAllShortcut).catch(() => {});
      await this.page.keyboard.press('Backspace').catch(() => {});
      await this.page.keyboard.type(normalizedKeyword, { delay: 25 }).catch(() => {});

      const options = this.page.locator(this.s.editItemSearchOptions);
      let optionCount = 0;
      let candidateIndex = -1;
      try {
        await expect
          .poll(
            async () => {
              optionCount = await options.count().catch(() => 0);
              candidateIndex = -1;
              for (let index = 0; index < optionCount; index += 1) {
                const optionText = await options
                  .nth(index)
                  .innerText()
                  .catch(() => '');
                const normalizedOptionText = String(optionText || '')
                  .trim()
                  .toLowerCase();
                if (!normalizedOptionText) continue;
                if (normalizedOptionText.includes('add as custom')) continue;
                if (!normalizedOptionText.includes(normalizedKeyword.toLowerCase()) && normalizedOptionText.length < 8) {
                  continue;
                }
                candidateIndex = index;
                break;
              }
              return candidateIndex >= 0;
            },
            {
              timeout: Timeouts.standard,
              intervals: [300],
            }
          )
          .toBe(true);
      } catch {
        optionCount = await options.count().catch(() => 0);
      }

      if (optionCount > 0 && candidateIndex >= 0) {
        await options
          .nth(candidateIndex)
          .click()
          .catch(() => {});
        const selectedValue = await searchInput.inputValue().catch(() => normalizedKeyword);
        return String(selectedValue || '').trim().toLowerCase() !== normalizedKeyword.toLowerCase();
      }
      return false;
    };

    const primarySelected = await trySelect(keyword);
    if (primarySelected) {
      return;
    }

    const fallback = String(fallbackKeyword || '').trim();
    if (fallback) {
      const fallbackSelected = await trySelect(fallback);
      if (fallbackSelected) {
        return;
      }
    }

    markFailed(`Unable to select replacement medicine for keyword "${keyword}"`);
  }

  async enableVATExempt(enabled = false) {
    // Toggles VAT Exempt to the expected state; no-op when already in the target state.
    const targetEnabled = Boolean(enabled);
    if (!(await safeWaitForElementVisible(this.page, this.s.editItemVATExemptCheckbox))) {
      markFailed('VAT Exempt checkbox is not visible in edit item modal');
    }

    const vatCheckbox = this.page.locator(this.s.editItemVATExemptCheckbox).first();
    const isEnabled = (await vatCheckbox.getAttribute('aria-checked').catch(() => 'false')) === 'true';
    if (isEnabled === targetEnabled) {
      return;
    }

    if (!(await safeClick(this.page, this.s.editItemVATExemptCheckbox))) {
      markFailed(`Unable to set VAT Exempt checkbox to ${targetEnabled}`);
    }

    const finalState = (await vatCheckbox.getAttribute('aria-checked').catch(() => 'false')) === 'true';
    if (finalState !== targetEnabled) {
      markFailed(`VAT Exempt checkbox did not update to expected state ${targetEnabled}`);
    }
  }

  async selectEditItemType(typeLabel) {
    // Sets item type dropdown value in edit modal.
    await this.selectEditItemDropdownValue({
      dropdownSelector: this.s.editItemTypeDropdown,
      label: typeLabel,
      fieldName: 'Type',
    });
  }

  async selectEditItemTemperature(temperatureLabel) {
    // Sets item temperature dropdown value in edit modal.
    await this.selectEditItemDropdownValue({
      dropdownSelector: this.s.editItemTemperatureDropdown,
      label: temperatureLabel,
      fieldName: 'Temperature',
    });
  }

  async selectEditItemDiscount(discountLabel) {
    // Sets item discount dropdown value in edit modal.
    await this.selectEditItemDropdownValue({
      dropdownSelector: this.s.editItemDiscountDropdown,
      label: discountLabel,
      fieldName: 'Discount',
    });
  }

  async selectEditItemDropdownValue({ dropdownSelector, label, fieldName }) {
    // Reusable dropdown setter for edit-item modal select controls.
    const normalizedLabel = String(label || '').trim();
    if (!normalizedLabel) {
      markFailed(`${fieldName} dropdown requires a non-empty label`);
    }
    if (!(await safeWaitForElementVisible(this.page, dropdownSelector))) {
      markFailed(`${fieldName} dropdown is not visible in edit item modal`);
    }

    const dropdown = this.page.locator(dropdownSelector).first();
    const currentValue = String((await dropdown.innerText().catch(() => '')).trim());
    if (currentValue === normalizedLabel) {
      return;
    }

    const opened = await dropdown
      .click()
      .then(() => true)
      .catch(() => false);
    if (!opened) {
      markFailed(`Unable to open ${fieldName} dropdown`);
    }

    const optionSelector = this.s.editItemDropdownOptionByLabelTemplate.replace('{label}', normalizedLabel);
    if (!(await safeWaitForElementVisible(this.page, optionSelector))) {
      markFailed(`Option "${normalizedLabel}" is not visible in ${fieldName} dropdown`);
    }
    if (!(await safeClick(this.page, optionSelector))) {
      markFailed(`Unable to select ${fieldName} option "${normalizedLabel}"`);
    }
  }

  async setEditItemPrice(price) {
    // Sets edit-item price with full replacement semantics.
    if (!(await safeFill(this.page, this.s.priceInput, String(price)))) {
      markFailed(`Unable to set edit item price to ${price}`);
    }
  }

  async setEditItemQuantity(quantity) {
    // Sets edit-item quantity value under the Qty field.
    if (!(await safeFill(this.page, this.s.editItemQtyInput, String(quantity)))) {
      markFailed(`Unable to set edit item quantity to ${quantity}`);
    }
  }

  async setEditItemDiscountedQuantity(discountedQty) {
    // Sets edit-item discounted quantity value under the Discounted Qty field.
    if (!(await safeFill(this.page, this.s.editItemDiscountedQtyInput, String(discountedQty)))) {
      markFailed(`Unable to set edit item discounted quantity to ${discountedQty}`);
    }
  }

  async verifyRequestPaymentTotalAmount(expectedAmount) {
    // Verifies quotation total near Request Payment matches expected amount after item updates.
    const expected = Number(expectedAmount);
    if (!Number.isFinite(expected)) {
      markFailed(`verifyRequestPaymentTotalAmount requires numeric expectedAmount, got: ${expectedAmount}`);
    }

    if (!(await safeWaitForElementVisible(this.page, this.s.requestPaymentTotalText))) {
      markFailed('Request payment total text is not visible');
    }

    const parseAmount = (text) => {
      const amountText = String(text || '').replace(/[^\d.]/g, '');
      const parsed = Number(amountText);
      return Number.isFinite(parsed) ? parsed : NaN;
    };

    try {
      await expect
        .poll(
          async () => {
            const totalText = await this.page
              .locator(this.s.requestPaymentTotalText)
              .first()
              .innerText()
              .catch(() => '');
            return parseAmount(totalText);
          },
          {
            timeout: Timeouts.standard,
            intervals: [300],
          }
        )
        .toBe(expected);
    } catch {
      const actualText = await this.page
        .locator(this.s.requestPaymentTotalText)
        .first()
        .innerText()
        .catch(() => 'N/A');
      markFailed(`Expected request-payment total ${expected} but found "${String(actualText).trim()}"`);
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

  async setOrderReadyForPickup({ dismissQR = true } = {}) {
    // Marks the prepared order as ready for pickup and verifies the order advances to WAITING FOR RIDER.
    await this.clickPickupReadyButton('Ready for Pick Up');
    if (dismissQR) {
      await this.dismissPrintQROverlayIfPresent();
    }
    await this.waitForPickupState({
      expectedStatusSelector: this.s.statusWaitingForRider,
      expectedActionLabel: 'Order Picked Up',
      failureContext: 'WAITING FOR RIDER after setting ready for pickup',
    });
  }

  async setOrderReadyForPatientPickup({ dismissQR = true } = {}) {
    // Marks the prepared pickup order as ready and verifies the patient-pickup state exposes the final pickup CTA.
    await this.clickPickupReadyButton('Ready for Pick Up');
    if (dismissQR) {
      await this.dismissPrintQROverlayIfPresent();
    }
    await this.waitForPickupState({
      expectedStatusSelector: this.s.statusWaitingForPatient,
      expectedActionLabel: 'Order Picked Up',
      failureContext: 'WAITING FOR PATIENT after setting ready for pickup',
    });
  }

  async confirmPatientPickupCompleted({ expectPickupSuccessfulModal = false } = {}) {
    // Finalizes pickup-mode orders from the merchant UI and waits for Completed status on the details page.
    await this.clickPickupReadyButton('Order Picked Up');
    if (expectPickupSuccessfulModal) {
      await this.verifyPickupSuccessfulModalAppeared();
    }
    await this.waitForPickupState({
      expectedStatusSelector: this.s.statusCompleted,
      failureContext: 'COMPLETED after confirming patient pickup',
    });
  }

  async verifyPickupSuccessfulModalAppeared() {
    // Verifies the pickup-success confirmation appears after clicking Order Picked Up.
    if (!(await safeWaitForElementVisible(this.page, this.s.pickupSuccessfulModalMessage))) {
      markFailed('Expected pickup-success modal/toast was not shown after confirming order pickup');
    }

    const closeVisible = await this.page
      .locator(this.s.pickupSuccessfulModalCloseButton)
      .first()
      .isVisible()
      .catch(() => false);
    if (!closeVisible) {
      return;
    }

    if (!(await safeClick(this.page, this.s.pickupSuccessfulModalCloseButton))) {
      markFailed('Unable to close pickup-success modal');
    }
    await safeWaitForElementHidden(this.page, this.s.pickupSuccessfulModalMessage, {
      timeout: Timeouts.short,
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
      markFailed(
        `Expected pickup action "${expectedLabel}" but found "${String(currentLabel || '').trim() || 'unknown'}"`
      );
    }

    if (!(await safeClick(this.page, this.s.pickupReadyButton))) {
      markFailed(`Unable to click pickup action "${expectedLabel}"`);
    }
  }

  async dismissPickListOverlayIfPresent() {
    // After generating pick list, expect Print Pick List overlay and close it via shared dialog close button.
    if (!(await safeWaitForElementVisible(this.page, this.s.pickListPrintButton))) {
      markFailed('Print Pick List overlay did not appear after generating pick list');
    }
    if (!(await safeClick(this.page, this.s.printQROverlayCloseButton))) {
      markFailed('Unable to close Print Pick List overlay');
    }
    const pickListHidden = await safeWaitForElementHidden(this.page, this.s.pickListPrintButton, {
      timeout: Timeouts.short,
    });
    if (!pickListHidden) {
      markFailed('Print Pick List overlay did not close after clicking close button');
    }
  }

  async dismissPrintQROverlayIfPresent() {
    // After setting ready for pickup, expect Print QR overlay and close it via shared dialog close button.
    if (!(await safeWaitForElementVisible(this.page, this.s.printQROverlayPrintButton))) {
      markFailed('Print QR overlay did not appear after setting order ready for pickup');
    }
    if (!(await safeClick(this.page, this.s.printQROverlayCloseButton))) {
      markFailed('Unable to close Print QR overlay');
    }
    const printQRHidden = await safeWaitForElementHidden(this.page, this.s.printQROverlayPrintButton, {
      timeout: Timeouts.short,
    });
    if (!printQRHidden) {
      markFailed('Print QR overlay did not close after clicking close button');
    }
  }

  async waitForPickupState({ expectedStatusSelector, expectedActionLabel, failureContext }) {
    // Polls the live order-details view until either the expected status heading or the next pickup action label appears.
    try {
      await expect
        .poll(
          async () => {
            if (expectedStatusSelector) {
              const statusVisible = await this.page
                .locator(expectedStatusSelector)
                .first()
                .isVisible()
                .catch(() => false);
              if (statusVisible) {
                return true;
              }
            }

            const pickupButtonVisible = await this.page
              .locator(this.s.pickupReadyButton)
              .first()
              .isVisible()
              .catch(() => false);
            if (!pickupButtonVisible) {
              return false;
            }

            const pickupReadyButton = this.page.locator(this.s.pickupReadyButton).first();
            const currentLabel = await pickupReadyButton.innerText().catch(() => '');
            return expectedActionLabel ? String(currentLabel || '').includes(expectedActionLabel) : false;
          },
          {
            timeout: Timeouts.short,
            intervals: [300],
          }
        )
        .toBe(true);
    } catch {
      markFailed(`Order did not advance to ${failureContext}`);
    }
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

  async waitForRequestPaymentIdleBeforeResend() {
    // Ensures the request-payment control is out of loading state before re-sending the quote.
    if (!(await safeWaitForElementHidden(this.page, this.s.requestPaymentLoadingButton))) {
      markFailed('Request payment is still loading before re-send quote');
    }
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

  async declineOrderWithOthersReason(reasonText, { verifyReasonInDetails = true } = {}) {
    // Declines/cancels an order via UI using "Others" reason and optionally verifies updated cancelled reason text.
    const normalizedReason = String(reasonText || '').trim();
    if (!normalizedReason) {
      markFailed('declineOrderWithOthersReason requires a non-empty reason');
    }

    if (!(await safeWaitForElementVisible(this.page, this.s.declineButton, { timeout: Timeouts.standard }))) {
      markFailed('Decline button is not visible on order details');
    }
    if (!(await safeClick(this.page, this.s.declineButton))) {
      markFailed('Unable to click decline button');
    }

    if (!(await safeWaitForElementVisible(this.page, this.s.declineConfirmModal))) {
      markFailed('Decline confirmation modal did not appear');
    }
    if (!(await safeClick(this.page, this.s.declineReasonDropdown))) {
      markFailed('Unable to open decline reason dropdown');
    }

    const othersOption = this.s.declineReasonOptionByLabelTemplate.replace('{label}', 'Others');
    if (!(await safeWaitForElementVisible(this.page, othersOption))) {
      markFailed('Decline reason option "Others" is not visible');
    }
    if (!(await safeClick(this.page, othersOption))) {
      markFailed('Unable to select decline reason option "Others"');
    }

    if (!(await safeInput(this.page, this.s.declineReasonInput, normalizedReason))) {
      markFailed('Unable to fill decline reason input');
    }
    if (!(await safeClick(this.page, this.s.declineConfirmButton))) {
      markFailed('Unable to confirm decline action');
    }

    if (!(await safeWaitForElementVisible(this.page, this.s.declineResultModal))) {
      markFailed('Order cancelled result modal did not appear after decline confirmation');
    }
    if (!(await safeClick(this.page, this.s.declineResultModalCloseXButton))) {
      markFailed('Unable to close order cancelled result modal using close (x) button');
    }
    if (!(await safeWaitForElementHidden(this.page, this.s.declineResultModal))) {
      markFailed('Order cancelled result modal did not close');
    }

    if (verifyReasonInDetails) {
      const escapedReason = normalizedReason.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      try {
        await expect
          .poll(
            async () =>
              this.page
                .getByText(new RegExp(escapedReason, 'i'))
                .first()
                .isVisible()
                .catch(() => false),
            {
              timeout: Timeouts.standard,
              intervals: [300],
            }
          )
          .toBe(true);
      } catch {
        markFailed(`Cancelled status reason was not updated with "${normalizedReason}"`);
      }
    }
  }

  async verifyMedicinePromoBadge({ medicineName, freeQty }) {
    // Verifies promo badge is shown within the target medicine item block on quotation stage.
    const normalizedMedicineName = String(medicineName || '')
      .trim()
      .toLowerCase();
    const normalizedFreeQty = Number(freeQty);
    if (!normalizedMedicineName) {
      markFailed('verifyMedicinePromoBadge requires a non-empty medicineName');
    }
    if (!Number.isFinite(normalizedFreeQty) || normalizedFreeQty <= 0) {
      markFailed('verifyMedicinePromoBadge requires a positive freeQty');
    }

    try {
      await expect
        .poll(
          async () => {
            const mainText = await this.page
              .locator('main')
              .first()
              .innerText()
              .catch(() => '');
            const normalizedMainText = String(mainText || '')
              .toLowerCase()
              .replace(/\s+/g, ' ')
              .trim();
            return (
              normalizedMainText.includes(normalizedMedicineName) &&
              normalizedMainText.includes('patient access program') &&
              normalizedMainText.includes('free') &&
              normalizedMainText.includes('qty:') &&
              normalizedMainText.includes(String(normalizedFreeQty))
            );
          },
          {
            timeout: Timeouts.standard,
            intervals: [300],
          }
        )
        .toBe(true);
    } catch {
      markFailed(`Promo badge FREE Qty:${normalizedFreeQty} was not found for medicine "${medicineName}"`);
    }
  }
}
