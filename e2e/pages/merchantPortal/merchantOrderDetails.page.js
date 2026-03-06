import {
  delay,
  markFailed,
  safeClick,
  safeInput,
  safeUploadFile,
  safeWaitForElementHidden,
  safeWaitForElementVisible,
  safeWaitForPageLoad,
} from '../../helpers/testUtilsUI.js';
import { loadSelectors, getSelector } from '../../helpers/selectors.js';
import { Timeouts, TimeoutsSec } from '../../Timeouts.js';

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
    };
  }

  async acceptOrder() {
    // Accepts the order and verifies next-stage quotation actions are available.
    console.log('Accepting order in merchant portal...');
    if (!(await safeWaitForElementVisible(this.page, this.s.acceptButton))) {
      markFailed('Accept order button is not visible');
    }
    if (!(await safeClick(this.page, this.s.acceptButton))) {
      markFailed('Unable to click accept order');
    }

    if (!(await safeWaitForPageLoad(this.page, [this.s.uploadQRButton, this.s.assignBranchButton]))) {
      markFailed('Neither Upload QR nor Assign Branch action appeared after accepting order');
    }
  }

  async acceptOrderForRiderQuote() {
    // Accepts order for rider-quote flows where payment QR is handled by rider, not merchant.
    if (!(await safeWaitForElementVisible(this.page, this.s.acceptButton))) {
      markFailed('Accept order button is not visible for rider-quote flow');
    }
    if (!(await safeClick(this.page, this.s.acceptButton))) {
      markFailed('Unable to click accept order for rider-quote flow');
    }
  }

  async requestForRiderToQuote(askRiderToQuote = false) {
    // Requests rider; only toggles "Ask rider to quote" when explicitly enabled for rider-quote flows.
    if (Boolean(askRiderToQuote)) {
      if (!(await safeWaitForElementVisible(this.page, this.s.askRiderToQuoteCheckbox))) {
        markFailed('Ask rider to quote toggle is not visible');
      }
      if (!(await safeClick(this.page, this.s.askRiderToQuoteCheckbox))) {
        markFailed('Unable to enable Ask rider to quote toggle');
      }
    }

    if (!(await safeWaitForElementVisible(this.page, this.s.requestForRiderButton))) {
      markFailed('Request for Rider button is not visible');
    }
    if (!(await safeClick(this.page, this.s.requestForRiderButton))) {
      markFailed('Unable to click Request for Rider');
    }

    // Wait until quotation actions are ready after request rider transition.
    if (!(await safeWaitForElementVisible(this.page, this.s.uploadQRButton))) {
      markFailed('Quotation actions did not appear after requesting rider');
    }
  }

  async updatePriceItems(priceItems) {
    // Updates each editable item price; covers variable item counts from live orders.
    if (!Array.isArray(priceItems) || priceItems.length === 0) {
      markFailed('updatePriceItems requires at least one price item');
    }

    // Wait for the first EDIT button to be visible before validating counts.
    const firstEditButton = `(${this.s.editItemButtons})[1]`;
    if (!(await safeWaitForElementVisible(this.page, firstEditButton))) {
      markFailed('First edit button is not visible for pricing');
    }

    // Retry count briefly to avoid false negatives while quotation panel is still rendering.
    let editButtonCount = 0;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      editButtonCount = await this.page.locator(this.s.editItemButtons).count();
      if (editButtonCount > 0) {
        break;
      }
      await delay(2, `Waiting 2 seconds for editable items to render (attempt ${attempt}/3)`);
    }

    if (editButtonCount === 0) {
      markFailed('No editable items found for pricing after retries');
    }

    for (let index = 0; index < editButtonCount; index += 1) {
      const fallbackPrice = priceItems[priceItems.length - 1]?.unitPrice ?? 10;
      const price = priceItems[index]?.unitPrice ?? fallbackPrice;

      const editButtonByIndex = `(${this.s.editItemButtons})[${index + 1}]`;
      if (!(await safeWaitForElementVisible(this.page, editButtonByIndex))) {
        markFailed(`Edit button is not visible for item index ${index + 1}`);
      }
      if (!(await safeClick(this.page, editButtonByIndex))) {
        markFailed(`Unable to open edit modal for item index ${index + 1}`);
      }
      if (!(await safeInput(this.page, this.s.priceInput, String(price)))) {
        markFailed(`Unable to set unit price for item index ${index + 1}`);
      }
      let updated = await safeClick(this.page, this.s.updateItemButton);
      if (!updated) {
        if (!(await safeWaitForElementVisible(this.page, this.s.updateItemButton))) {
          markFailed(`Update item button is not visible for item index ${index + 1}`);
        }
        // One retry for transient modal re-render/focus issues.
        updated = await safeClick(this.page, this.s.updateItemButton);
      }
      if (!updated) {
        markFailed(`Unable to update item index ${index + 1}`);
      }
      if (!(await safeWaitForElementHidden(this.page, this.s.updateItemButton))) {
        markFailed(`Update item dialog did not close for item index ${index + 1}`);
      }
    }
  }

  async assignBranchToFirstMatchingPharmacy(keyword = 'dev') {
    // Assigns branch using search and selects the first matching pharmacy result.
    const searchKeyword = String(keyword || '').trim();
    const keywordForMatch = searchKeyword.toLowerCase();
    if (!searchKeyword) {
      markFailed('assignBranchToFirstMatchingPharmacy requires a non-empty keyword');
    }

    if (!(await safeWaitForElementVisible(this.page, this.s.assignBranchButton))) {
      markFailed('Assign branch button is not visible');
    }
    if (!(await safeClick(this.page, this.s.assignBranchButton))) {
      markFailed('Unable to open assign branch dialog');
    }
    if (!(await safeWaitForElementVisible(this.page, this.s.assignBranchSearchInput))) {
      markFailed('Assign branch search input is not visible');
    }
    if (!(await safeInput(this.page, this.s.assignBranchSearchInput, searchKeyword))) {
      markFailed(`Unable to search branch keyword "${searchKeyword}"`);
    }

    const assignBranchResultByKeyword = this.s.assignBranchResultByKeywordTemplate.replace(
      '{keyword}',
      keywordForMatch
    );
    const keywordResultVisible = await safeWaitForElementVisible(this.page, assignBranchResultByKeyword);
    if (keywordResultVisible) {
      if (!(await safeClick(this.page, assignBranchResultByKeyword))) {
        markFailed(`Unable to select assign-branch result for keyword "${keywordForMatch}"`);
      }
    } else {
      if (!(await safeWaitForElementVisible(this.page, this.s.assignBranchFirstResult))) {
        markFailed(`No assign-branch result found for keyword "${searchKeyword}"`);
      }
      if (!(await safeClick(this.page, this.s.assignBranchFirstResult))) {
        markFailed(`Unable to select first assign-branch result after searching "${searchKeyword}"`);
      }
    }
    if (!(await safeWaitForElementVisible(this.page, this.s.assignBranchConfirmButton))) {
      markFailed('Assign branch confirm button is not visible');
    }
    if (!(await safeClick(this.page, this.s.assignBranchConfirmButton))) {
      markFailed('Unable to confirm assign branch');
    }

    // Assignment should unlock quote actions (Upload QR).
    if (!(await safeWaitForElementVisible(this.page, this.s.uploadQRButton))) {
      markFailed('Upload QR button did not appear after assigning branch');
    }
    await delay(1, 'Waiting 1 second after assigning branch');
  }

  async sendQuote() {
    // Waits until request-payment is actionable, submits quote, and waits until loading state clears.
    if (!(await safeWaitForElementVisible(this.page, this.s.requestPaymentButton))) {
      markFailed('Request payment button is not visible');
    }
    if (!(await safeClick(this.page, this.s.requestPaymentButton))) {
      markFailed('Unable to click request payment');
    }
    if (!(await safeWaitForElementHidden(this.page, this.s.requestPaymentLoadingButton))) {
      markFailed('Request payment is still loading; quote submit did not finish');
    }
    await delay(TimeoutsSec.short, 'Waiting a bit before proceeding to next task');
  }

  async uploadQRCode(imagePath) {
    // Uploads QR code proof and validates request-payment CTA becomes visible.
    if (!(await safeWaitForElementVisible(this.page, this.s.uploadQRButton))) {
      markFailed('Upload QR button is not visible');
    }
    if (!(await safeClick(this.page, this.s.uploadQRButton))) {
      markFailed('Unable to open upload QR dialog');
    }

    if (!(await safeUploadFile(this.page, this.s.qrCodeFileInput, imagePath))) {
      markFailed('Unable to set QR code file for upload');
    }

    if (!(await safeWaitForElementVisible(this.page, this.s.uploadQRSubmitButton))) {
      markFailed('Upload submit button is not visible');
    }
    if (!(await safeClick(this.page, this.s.uploadQRSubmitButton))) {
      markFailed('Unable to upload QR code');
    }

    if (!(await safeWaitForElementVisible(this.page, this.s.requestPaymentButton))) {
      markFailed('Request Payment button did not appear after uploading QR code');
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

    if (!(await safeWaitForElementVisible(this.page, this.s.addItemsButton))) {
      markFailed('Add Items button is not visible');
    }
    if (!(await safeClick(this.page, this.s.addItemsButton))) {
      markFailed('Unable to open Add Item modal');
    }
    if (!(await safeWaitForElementVisible(this.page, this.s.addItemModal))) {
      markFailed('Add Item modal is not visible');
    }
    if (!(await safeWaitForElementVisible(this.page, this.s.addItemSearchInput))) {
      markFailed('Add Item search input is not visible');
    }
    if (!(await safeInput(this.page, this.s.addItemSearchInput, name))) {
      markFailed(`Unable to search medicine "${name}"`);
    }
    if (!(await safeWaitForElementVisible(this.page, this.s.addItemSearchSecondResult))) {
      markFailed(`Second search result is not visible for medicine "${name}"`);
    }
    if (!(await safeClick(this.page, this.s.addItemSearchSecondResult))) {
      markFailed(`Unable to select second search result for medicine "${name}"`);
    }

    for (let count = 1; count < qty; count += 1) {
      if (!(await safeClick(this.page, this.s.addItemQuantityIncreaseButton))) {
        markFailed(`Unable to increase quantity for medicine "${name}" to ${qty}`);
      }
    }

    if (!(await safeClick(this.page, this.s.addItemPriceInput))) {
      markFailed(`Unable to focus price input for medicine "${name}"`);
    }
    const selectAllShortcut = process.platform === 'darwin' ? 'Meta+A' : 'Control+A';
    await this.page.keyboard.press(selectAllShortcut).catch(() => {});
    if (
      !(await this.page.keyboard
        .type(price)
        .then(() => true)
        .catch(() => false))
    ) {
      markFailed(`Unable to set price for medicine "${name}"`);
    }
    if (!(await safeClick(this.page, this.s.addItemConfirmButton))) {
      markFailed(`Unable to click Add for medicine "${name}"`);
    }
    if (!(await safeWaitForElementHidden(this.page, this.s.addItemModal))) {
      markFailed(`Add Item modal did not close after adding medicine "${name}"`);
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
}
