import path from 'node:path';
import { test, expect } from '../../globalConfig.ui.js';
import { createMerchantPortalContext } from './merchantPortalContext.js';
import { buildBasePriceItems, HybridDeliveryTypes } from './generic.orderData.js';
import {
  PatientPayModes,
  acceptQuoteAsPatientWhenReady,
  createHybridOrderForBranch,
  ensurePatientPaymentQRCodeAccessible,
  payOrderAsPatientWithProof,
  rateRiderAsPatientForHybrid,
} from './actions/patientActions.js';
import {
  assignRiderToOrderAsAdminForHybrid,
  confirmPaymentAsAdminForHybrid,
  loginAsAdminForHybrid,
} from './actions/adminActions.js';
import { completeDeliveryAsRiderForHybrid } from './actions/riderActions.js';

test.describe('Merchant Portal | FindMyMeds Full Flow', () => {
  test(
    'E2E-10 | FindMyMeds Happy Path - Full Flow',
    {
      tag: ['@ui', '@merchant', '@positive', '@merchant-portal', '@e2e-10', '@workflow', '@hybrid', '@findmymeds'],
      // Flow summary: patient creates FindMyMeds order -> merchant accepts/uploads QR/updates prices/sends quote in UI ->
      // patient pays -> admin confirms payment and assigns rider -> pharmacist prepares and sets for pickup ->
      // rider completes delivery -> patient rates rider -> merchant verifies COMPLETED in details and Completed tab.
    },
    async ({ page, api }) => {
      const merchantPaymentQrImagePath = path.resolve('upload/images/qr1.png');
      const patientProofPaymentImagePath = path.resolve('upload/images/proof1.png');
      const riderPickupProofImagePath = path.resolve('upload/images/proofOfPickup.png');
      const riderDeliveryProofImagePath = path.resolve('upload/images/proofOfDelivery.png');
      const merchant = createMerchantPortalContext(page, { accountKey: 'e2e-pse01' });

      // API (patient): create order.
      const { patientAccessToken, orderId, bookingRef } = await createHybridOrderForBranch(api, {
        deliveryType: HybridDeliveryTypes.FIND_MY_MEDS,
        omitBranchId: true,
      });

      // UI (merchant): login, accept order, assign branch, upload QR, update prices, and send quote.
      await merchant.loginPage.open();
      await merchant.loginPage.login(merchant.account.username, merchant.account.password);
      await merchant.loginPage.assertSuccessLogin();

      await merchant.ordersPage.open();
      await merchant.ordersPage.openNewOrderByBookingRef(bookingRef);
      await merchant.orderDetailsPage.acceptOrder();
      await merchant.orderDetailsPage.assignBranchToFirstMatchingPharmacy('Pharmacy API');
      await merchant.orderDetailsPage.uploadQRCode(merchantPaymentQrImagePath);
      await merchant.orderDetailsPage.updatePriceItems(buildBasePriceItems());
      await merchant.orderDetailsPage.sendQuote();

      // API (patient): accept quote and pay.
      const { acceptQuoteNode } = await acceptQuoteAsPatientWhenReady(api, { patientAccessToken, orderId });
      const patientPaymentQRCodeId = acceptQuoteNode?.paymentQRCodeId;
      expect(patientPaymentQRCodeId, 'Missing paymentQRCodeId after patient accept quote').toBeTruthy();
      const { paymentQRCodeBranchId } = await ensurePatientPaymentQRCodeAccessible(api, {
        patientAccessToken,
        paymentQRCodeId: patientPaymentQRCodeId,
      });
      expect(paymentQRCodeBranchId, 'Missing branchId from patient payment QR code').toBeTruthy();
      await payOrderAsPatientWithProof(api, {
        patientAccessToken,
        orderId,
        proofImagePath: patientProofPaymentImagePath,
        mode: PatientPayModes.DEFAULT,
      });

      // API (admin): confirm payment and assign rider.
      const { adminAccessToken } = await loginAsAdminForHybrid(api);
      await confirmPaymentAsAdminForHybrid(api, { adminAccessToken, orderId });
      const { assignedRiderId } = await assignRiderToOrderAsAdminForHybrid(api, {
        adminAccessToken,
        orderId,
        riderId: process.env.RIDER_USERID,
      });

      // UI (merchant): prepare then set for pickup.
      await merchant.orderDetailsPage.prepareOrderForPickup();
      await merchant.orderDetailsPage.setOrderReadyForPickup();

      // API (rider): complete fulfillment.
      await completeDeliveryAsRiderForHybrid(api, {
        orderId,
        branchId: paymentQRCodeBranchId,
        pickupProofImagePath: riderPickupProofImagePath,
        deliveryProofImagePath: riderDeliveryProofImagePath,
        requireBranchQR: false,
      });

      // API (patient): rate rider.
      await rateRiderAsPatientForHybrid(api, {
        patientAccessToken,
        riderId: assignedRiderId || process.env.RIDER_USERID,
      });

      // UI (merchant): verify Completed in details + Orders > Completed tab.
      await merchant.ordersPage.verifyOrderCompletedInDetailsAndCompletedTab(bookingRef);
    }
  );
});
