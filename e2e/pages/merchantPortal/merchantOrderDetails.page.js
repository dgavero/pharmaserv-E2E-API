import { expect } from '@playwright/test';
import {
  markFailed,
  safeClick,
  safeInput,
  safeWaitForElementVisible,
} from '../../helpers/testUtilsUI.js';
import { Timeouts } from '../../Timeouts.js';
import { loadSelectors, getSelector } from '../../helpers/selectors.js';

export default class MerchantOrderDetailsPage {
  constructor(page) {
    this.page = page;
    this.sel = loadSelectors('merchant');
  }

  async acceptOrder() {
    const acceptButton = getSelector(this.sel, 'OrderDetails.AcceptButton');
    if (!(await safeClick(this.page, acceptButton))) {
      markFailed('Unable to click accept order');
    }

    const uploadQRButton = getSelector(this.sel, 'OrderDetails.UploadQRButton');
    if (!(await safeWaitForElementVisible(this.page, uploadQRButton))) {
      markFailed('Upload QR button did not appear after accepting order');
    }
  }

  async updatePriceItems(priceItems) {
    if (!Array.isArray(priceItems) || priceItems.length === 0) {
      markFailed('updatePriceItems requires at least one price item');
    }

    const editButtons = getSelector(this.sel, 'OrderDetails.EditItemButtons');
    const priceInput = getSelector(this.sel, 'OrderDetails.PriceInput');
    const updateItemButton = getSelector(this.sel, 'OrderDetails.UpdateItemButton');

    const editButtonCount = await this.page.locator(editButtons).count();
    if (editButtonCount === 0) {
      markFailed('No editable items found for pricing');
    }

    for (let index = 0; index < editButtonCount; index += 1) {
      const fallbackPrice = priceItems[priceItems.length - 1]?.unitPrice ?? 10;
      const price = priceItems[index]?.unitPrice ?? fallbackPrice;

      if (!(await safeClick(this.page, `(${editButtons})[${index + 1}]`))) {
        markFailed(`Unable to open edit modal for item index ${index + 1}`);
      }
      if (!(await safeInput(this.page, priceInput, String(price)))) {
        markFailed(`Unable to set unit price for item index ${index + 1}`);
      }
      let updated = await safeClick(this.page, updateItemButton, { timeout: Timeouts.long });
      if (!updated) {
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
    const requestPaymentButton = getSelector(this.sel, 'OrderDetails.RequestPaymentButton');
    await expect
      .poll(
        async () => this.page.locator(requestPaymentButton).isEnabled().catch(() => false),
        { timeout: Timeouts.long }
      )
      .toBe(true);
    if (!(await safeClick(this.page, requestPaymentButton))) {
      markFailed('Unable to click request payment');
    }
  }

  async uploadQRCode(imagePath) {
    const uploadQRButton = getSelector(this.sel, 'OrderDetails.UploadQRButton');
    if (!(await safeClick(this.page, uploadQRButton))) {
      markFailed('Unable to open upload QR dialog');
    }

    const fileInput = getSelector(this.sel, 'OrderDetails.QRCodeFileInput');
    await this.page.locator(fileInput).setInputFiles(imagePath);

    const uploadButton = getSelector(this.sel, 'OrderDetails.UploadQRSubmitButton');
    if (!(await safeClick(this.page, uploadButton))) {
      markFailed('Unable to upload QR code');
    }

    const requestPaymentButton = getSelector(this.sel, 'OrderDetails.RequestPaymentButton');
    if (!(await safeWaitForElementVisible(this.page, requestPaymentButton))) {
      markFailed('Request Payment button did not appear after uploading QR code');
    }
  }
}
