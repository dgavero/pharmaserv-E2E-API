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

export default class MerchantOrderDetailsPage {
  constructor(page) {
    // Stores page handle and selector map for order-details actions.
    this.page = page;
    this.sel = loadSelectors('merchant');
  }

  async acceptOrder() {
    // Accepts the order and verifies next-stage quotation actions are available.
    console.log('Accepting order in merchant portal...');
    const acceptButton = getSelector(this.sel, 'OrderDetails.AcceptButton');
    if (!(await safeWaitForElementVisible(this.page, acceptButton))) {
      markFailed('Accept order button is not visible');
    }
    if (!(await safeClick(this.page, acceptButton))) {
      markFailed('Unable to click accept order');
    }

    const uploadQRButton = getSelector(this.sel, 'OrderDetails.UploadQRButton');
    const assignBranchButton = getSelector(this.sel, 'OrderDetails.AssignBranchButton');
    if (!(await safeWaitForPageLoad(this.page, [uploadQRButton, assignBranchButton]))) {
      markFailed('Neither Upload QR nor Assign Branch action appeared after accepting order');
    }
  }

  async acceptOrderForRiderQuote() {
    // Accepts order for rider-quote flows where payment QR is handled by rider, not merchant.
    const acceptButton = getSelector(this.sel, 'OrderDetails.AcceptButton');
    if (!(await safeWaitForElementVisible(this.page, acceptButton))) {
      markFailed('Accept order button is not visible for rider-quote flow');
    }
    if (!(await safeClick(this.page, acceptButton))) {
      markFailed('Unable to click accept order for rider-quote flow');
    }
  }

  async requestForRiderToQuote(askRiderToQuote = false) {
    // Requests rider; only toggles "Ask rider to quote" when explicitly enabled for rider-quote flows.
    const askRiderToQuoteCheckbox = getSelector(this.sel, 'OrderDetails.AskRiderToQuoteCheckbox');
    const requestForRiderButton = getSelector(this.sel, 'OrderDetails.RequestForRiderButton');
    const uploadQRButton = getSelector(this.sel, 'OrderDetails.UploadQRButton');

    if (Boolean(askRiderToQuote)) {
      if (!(await safeWaitForElementVisible(this.page, askRiderToQuoteCheckbox))) {
        markFailed('Ask rider to quote toggle is not visible');
      }
      if (!(await safeClick(this.page, askRiderToQuoteCheckbox))) {
        markFailed('Unable to enable Ask rider to quote toggle');
      }
    }

    if (!(await safeWaitForElementVisible(this.page, requestForRiderButton))) {
      markFailed('Request for Rider button is not visible');
    }
    if (!(await safeClick(this.page, requestForRiderButton))) {
      markFailed('Unable to click Request for Rider');
    }

    // Wait until quotation actions are ready after request rider transition.
    if (!(await safeWaitForElementVisible(this.page, uploadQRButton))) {
      markFailed('Quotation actions did not appear after requesting rider');
    }
  }

  async updatePriceItems(priceItems) {
    // Updates each editable item price; covers variable item counts from live orders.
    if (!Array.isArray(priceItems) || priceItems.length === 0) {
      markFailed('updatePriceItems requires at least one price item');
    }

    const editButtons = getSelector(this.sel, 'OrderDetails.EditItemButtons');
    const priceInput = getSelector(this.sel, 'OrderDetails.PriceInput');
    const updateItemButton = getSelector(this.sel, 'OrderDetails.UpdateItemButton');

    // Wait for the first EDIT button to be visible before validating counts.
    const firstEditButton = `(${editButtons})[1]`;
    if (!(await safeWaitForElementVisible(this.page, firstEditButton))) {
      markFailed('First edit button is not visible for pricing');
    }

    // Retry count briefly to avoid false negatives while quotation panel is still rendering.
    let editButtonCount = 0;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      editButtonCount = await this.page.locator(editButtons).count();
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

      const editButtonByIndex = `(${editButtons})[${index + 1}]`;
      if (!(await safeWaitForElementVisible(this.page, editButtonByIndex))) {
        markFailed(`Edit button is not visible for item index ${index + 1}`);
      }
      if (!(await safeClick(this.page, editButtonByIndex))) {
        markFailed(`Unable to open edit modal for item index ${index + 1}`);
      }
      if (!(await safeInput(this.page, priceInput, String(price)))) {
        markFailed(`Unable to set unit price for item index ${index + 1}`);
      }
      let updated = await safeClick(this.page, updateItemButton);
      if (!updated) {
        if (!(await safeWaitForElementVisible(this.page, updateItemButton))) {
          markFailed(`Update item button is not visible for item index ${index + 1}`);
        }
        // One retry for transient modal re-render/focus issues.
        updated = await safeClick(this.page, updateItemButton);
      }
      if (!updated) {
        markFailed(`Unable to update item index ${index + 1}`);
      }
      if (!(await safeWaitForElementHidden(this.page, updateItemButton))) {
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

    const assignBranchButton = getSelector(this.sel, 'OrderDetails.AssignBranchButton');
    const assignBranchSearchInput = getSelector(this.sel, 'OrderDetails.AssignBranchSearchInput');
    const assignBranchResultByKeywordTemplate = getSelector(
      this.sel,
      'OrderDetails.AssignBranchResultByKeywordTemplate'
    );
    const assignBranchFirstResult = getSelector(this.sel, 'OrderDetails.AssignBranchFirstResult');
    const assignBranchConfirmButton = getSelector(this.sel, 'OrderDetails.AssignBranchConfirmButton');
    const uploadQRButton = getSelector(this.sel, 'OrderDetails.UploadQRButton');

    if (!(await safeWaitForElementVisible(this.page, assignBranchButton))) {
      markFailed('Assign branch button is not visible');
    }
    if (!(await safeClick(this.page, assignBranchButton))) {
      markFailed('Unable to open assign branch dialog');
    }
    if (!(await safeWaitForElementVisible(this.page, assignBranchSearchInput))) {
      markFailed('Assign branch search input is not visible');
    }
    if (!(await safeInput(this.page, assignBranchSearchInput, searchKeyword))) {
      markFailed(`Unable to search branch keyword "${searchKeyword}"`);
    }

    const assignBranchResultByKeyword = assignBranchResultByKeywordTemplate.replace('{keyword}', keywordForMatch);
    const keywordResultVisible = await safeWaitForElementVisible(this.page, assignBranchResultByKeyword);
    if (keywordResultVisible) {
      if (!(await safeClick(this.page, assignBranchResultByKeyword))) {
        markFailed(`Unable to select assign-branch result for keyword "${keywordForMatch}"`);
      }
    } else {
      if (!(await safeWaitForElementVisible(this.page, assignBranchFirstResult))) {
        markFailed(`No assign-branch result found for keyword "${searchKeyword}"`);
      }
      if (!(await safeClick(this.page, assignBranchFirstResult))) {
        markFailed(`Unable to select first assign-branch result after searching "${searchKeyword}"`);
      }
    }
    if (!(await safeWaitForElementVisible(this.page, assignBranchConfirmButton))) {
      markFailed('Assign branch confirm button is not visible');
    }
    if (!(await safeClick(this.page, assignBranchConfirmButton))) {
      markFailed('Unable to confirm assign branch');
    }

    // Assignment should unlock quote actions (Upload QR).
    if (!(await safeWaitForElementVisible(this.page, uploadQRButton))) {
      markFailed('Upload QR button did not appear after assigning branch');
    }
    await delay(1, 'Waiting 1 second after assigning branch');
  }

  async sendQuote() {
    // Waits until request-payment is actionable, submits quote, and waits until loading state clears.
    const requestPaymentButton = getSelector(this.sel, 'OrderDetails.RequestPaymentButton');
    const requestPaymentLoadingButton = getSelector(this.sel, 'OrderDetails.RequestPaymentLoadingButton');
    if (!(await safeWaitForElementVisible(this.page, requestPaymentButton))) {
      markFailed('Request payment button is not visible');
    }
    if (!(await safeClick(this.page, requestPaymentButton))) {
      markFailed('Unable to click request payment');
    }
    if (!(await safeWaitForElementHidden(this.page, requestPaymentLoadingButton))) {
      markFailed('Request payment is still loading; quote submit did not finish');
    }
  }

  async uploadQRCode(imagePath) {
    // Uploads QR code proof and validates request-payment CTA becomes visible.
    const uploadQRButton = getSelector(this.sel, 'OrderDetails.UploadQRButton');
    if (!(await safeWaitForElementVisible(this.page, uploadQRButton))) {
      markFailed('Upload QR button is not visible');
    }
    if (!(await safeClick(this.page, uploadQRButton))) {
      markFailed('Unable to open upload QR dialog');
    }

    const fileInput = getSelector(this.sel, 'OrderDetails.QRCodeFileInput');
    if (!(await safeUploadFile(this.page, fileInput, imagePath))) {
      markFailed('Unable to set QR code file for upload');
    }

    const uploadButton = getSelector(this.sel, 'OrderDetails.UploadQRSubmitButton');
    if (!(await safeWaitForElementVisible(this.page, uploadButton))) {
      markFailed('Upload submit button is not visible');
    }
    if (!(await safeClick(this.page, uploadButton))) {
      markFailed('Unable to upload QR code');
    }

    const requestPaymentButton = getSelector(this.sel, 'OrderDetails.RequestPaymentButton');
    if (!(await safeWaitForElementVisible(this.page, requestPaymentButton))) {
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

    const addItemsButton = getSelector(this.sel, 'OrderDetails.AddItemsButton');
    const addItemModal = getSelector(this.sel, 'OrderDetails.AddItemModal');
    const addItemSearchInput = getSelector(this.sel, 'OrderDetails.AddItemSearchInput');
    const addItemSearchSecondResult = getSelector(this.sel, 'OrderDetails.AddItemSearchSecondResult');
    const addItemQuantityIncreaseButton = getSelector(this.sel, 'OrderDetails.AddItemQuantityIncreaseButton');
    const addItemPriceInput = getSelector(this.sel, 'OrderDetails.AddItemPriceInput');
    const addItemConfirmButton = getSelector(this.sel, 'OrderDetails.AddItemConfirmButton');

    if (!(await safeWaitForElementVisible(this.page, addItemsButton))) {
      markFailed('Add Items button is not visible');
    }
    if (!(await safeClick(this.page, addItemsButton))) {
      markFailed('Unable to open Add Item modal');
    }
    if (!(await safeWaitForElementVisible(this.page, addItemModal))) {
      markFailed('Add Item modal is not visible');
    }
    if (!(await safeWaitForElementVisible(this.page, addItemSearchInput))) {
      markFailed('Add Item search input is not visible');
    }
    if (!(await safeInput(this.page, addItemSearchInput, name))) {
      markFailed(`Unable to search medicine "${name}"`);
    }
    if (!(await safeWaitForElementVisible(this.page, addItemSearchSecondResult))) {
      markFailed(`Second search result is not visible for medicine "${name}"`);
    }
    if (!(await safeClick(this.page, addItemSearchSecondResult))) {
      markFailed(`Unable to select second search result for medicine "${name}"`);
    }

    for (let count = 1; count < qty; count += 1) {
      if (!(await safeClick(this.page, addItemQuantityIncreaseButton))) {
        markFailed(`Unable to increase quantity for medicine "${name}" to ${qty}`);
      }
    }

    if (!(await safeClick(this.page, addItemPriceInput))) {
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
    if (!(await safeClick(this.page, addItemConfirmButton))) {
      markFailed(`Unable to click Add for medicine "${name}"`);
    }
    if (!(await safeWaitForElementHidden(this.page, addItemModal))) {
      markFailed(`Add Item modal did not close after adding medicine "${name}"`);
    }
  }

  async verifyQuantityChangedModalAppeared() {
    // Verifies merchant receives the quantity-change modal after patient requote/payment update.
    const quantityChangeModalMessage = getSelector(this.sel, 'OrderDetails.QuantityChangeModalMessage');
    const quantityChangeModalCloseButton = getSelector(this.sel, 'OrderDetails.QuantityChangeModalCloseButton');

    if (!(await safeWaitForElementVisible(this.page, quantityChangeModalMessage))) {
      markFailed('Expected quantity-change modal was not shown on merchant portal');
    }
    console.log('Quantity-change modal appeared as expected');

    const closeVisible = await safeWaitForElementVisible(this.page, quantityChangeModalCloseButton);
    if (!closeVisible) {
      markFailed('Quantity-change modal close button is not visible');
    }
    if (!(await safeClick(this.page, quantityChangeModalCloseButton))) {
      markFailed('Unable to close quantity-change modal');
    }
  }

  async closeRequoteRequestModalIfVisible() {
    // Closes the re-quote request modal when present so later merchant actions/modal checks are not blocked.
    const requoteRequestModalMessage = getSelector(this.sel, 'OrderDetails.RequoteRequestModalMessage');
    const requoteRequestModalCloseButton = getSelector(this.sel, 'OrderDetails.RequoteRequestModalCloseButton');
    const modalVisible = await this.page
      .locator(requoteRequestModalMessage)
      .first()
      .isVisible()
      .catch(() => false);
    if (!modalVisible) {
      return;
    }
    if (!(await safeClick(this.page, requoteRequestModalCloseButton))) {
      markFailed('Unable to close re-quote request modal');
    }
  }
}
