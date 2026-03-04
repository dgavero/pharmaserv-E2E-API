import {
  delay,
  markFailed,
  safeClick,
  safeInput,
  safeWaitForElementVisible,
} from '../../helpers/testUtilsUI.js';
import { Timeouts } from '../../Timeouts.js';
import { loadSelectors, getSelector } from '../../helpers/selectors.js';

export default class MerchantOrderDetailsPage {
  constructor(page) {
    // Stores page handle and selector map for order-details actions.
    this.page = page;
    this.sel = loadSelectors('merchant');
  }

  async acceptOrder() {
    // Accepts the order and verifies next-stage UI (QR upload) is available.
    const acceptButton = getSelector(this.sel, 'OrderDetails.AcceptButton');
    if (!(await safeWaitForElementVisible(this.page, acceptButton))) {
      markFailed('Accept order button is not visible');
    }
    if (!(await safeClick(this.page, acceptButton))) {
      markFailed('Unable to click accept order');
    }

    const uploadQRButton = getSelector(this.sel, 'OrderDetails.UploadQRButton');
    if (!(await safeWaitForElementVisible(this.page, uploadQRButton))) {
      markFailed('Upload QR button did not appear after accepting order');
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
      if (!(await safeWaitForElementVisible(this.page, askRiderToQuoteCheckbox, { timeout: Timeouts.standard }))) {
        markFailed('Ask rider to quote toggle is not visible');
      }
      if (!(await safeClick(this.page, askRiderToQuoteCheckbox, { timeout: Timeouts.standard }))) {
        markFailed('Unable to enable Ask rider to quote toggle');
      }
    }

    if (!(await safeWaitForElementVisible(this.page, requestForRiderButton, { timeout: Timeouts.standard }))) {
      markFailed('Request for Rider button is not visible');
    }
    if (!(await safeClick(this.page, requestForRiderButton))) {
      markFailed('Unable to click Request for Rider');
    }

    // Wait until quotation actions are ready after request rider transition.
    if (!(await safeWaitForElementVisible(this.page, uploadQRButton, { timeout: Timeouts.long }))) {
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
    if (!(await safeWaitForElementVisible(this.page, firstEditButton, { timeout: Timeouts.standard }))) {
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
      let updated = await safeClick(this.page, updateItemButton, { timeout: Timeouts.long });
      if (!updated) {
        if (!(await safeWaitForElementVisible(this.page, updateItemButton, { timeout: Timeouts.long }))) {
          markFailed(`Update item button is not visible for item index ${index + 1}`);
        }
        // One retry for transient modal re-render/focus issues.
        updated = await safeClick(this.page, updateItemButton, { timeout: Timeouts.long });
      }
      if (!updated) {
        markFailed(`Unable to update item index ${index + 1}`);
      }
      await this.page.locator(updateItemButton).waitFor({ state: 'hidden' });
    }
  }

  async sendQuote() {
    // Waits until request-payment is actionable, then submits quote to patient.
    const requestPaymentButton = getSelector(this.sel, 'OrderDetails.RequestPaymentButton');
    if (!(await safeWaitForElementVisible(this.page, requestPaymentButton))) {
      markFailed('Request payment button is not visible');
    }
    if (!(await safeClick(this.page, requestPaymentButton, { timeout: Timeouts.long }))) {
      markFailed('Unable to click request payment');
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
    await this.page.locator(fileInput).setInputFiles(imagePath);

    const uploadButton = getSelector(this.sel, 'OrderDetails.UploadQRSubmitButton');
    if (!(await safeWaitForElementVisible(this.page, uploadButton, { timeout: Timeouts.long }))) {
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
}
