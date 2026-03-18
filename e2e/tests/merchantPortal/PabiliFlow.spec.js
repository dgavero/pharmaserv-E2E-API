import path from 'node:path';
import { test, expect } from '../../globalConfig.ui.js';
import { createMerchantPortalContext } from './merchantPortalContext.js';
import {
  buildBasePriceItems,
  HybridDeliveryTypes,
} from './generic.orderData.js';
import {
  PatientPayModes,
  acceptQuoteAsPatientWhenReady,
  createHybridOrderForBranch,
  ensurePatientPaymentQRCodeAccessible,
  payOrderAsPatientWithProof,
  rateRiderAsPatientAction,
} from './actions/patientActions.js';
import {
  assignRiderToOrderAsAdminAction,
  confirmPaymentAsAdminAction,
  loginAdminForHybrid,
} from './actions/adminActions.js';
import {
  riderCompleteDeliveryFlow,
  riderSendQuoteFlow,
  riderStartPickupAndArriveAtPharmacy,
} from './actions/riderActions.js';

test.describe('Merchant Portal | Pabili Full Flow', () => {
  test(
    'E2E-8 | Pabili Happy Path - Rider to Quote',
    {
      tag: ['@ui', '@merchant', '@positive', '@merchant-portal', '@e2e-8', '@workflow', '@hybrid', '@pabili'],
      // Flow summary: patient creates Pabili order -> merchant accepts and requests rider quote in UI ->
      // pharmacist confirms riderQuoteEnabled -> admin assigns rider -> rider quotes -> pharmacist sends quote ->
      // patient pays -> admin confirms payment -> rider completes delivery -> patient rates ->
      // merchant verifies COMPLETED in details and Completed tab.
    },
    async ({ page, api }) => {
      const riderPaymentQrImagePath = path.resolve('upload/images/qr1.png');
      const patientProofPaymentImagePath = path.resolve('upload/images/proof1.png');
      const riderPickupProofImagePath = path.resolve('upload/images/proofOfPickup.png');
      const riderDeliveryProofImagePath = path.resolve('upload/images/proofOfDelivery.png');
      const merchant = createMerchantPortalContext(page, { accountKey: 'e2e-pse01' });

      // API (patient): create order.
      const { patientAccessToken, orderId, bookingRef } = await createHybridOrderForBranch(api, {
        deliveryType: HybridDeliveryTypes.PABILI,
        branchId: merchant.account.assignedBranchId,
      });

      // UI (merchant): login and accept order.
      await merchant.loginPage.open();
      await merchant.loginPage.login(merchant.account.username, merchant.account.password);
      await merchant.loginPage.assertSuccessLogin();

      await merchant.ordersPage.open();
      await merchant.ordersPage.openNewOrderByBookingRef(bookingRef);
      await merchant.orderDetailsPage.acceptOrderForRiderQuote();
      await merchant.orderDetailsPage.requestForRiderToQuote(true);

      // API (admin): assign rider.
      const { adminAccessToken } = await loginAdminForHybrid(api);
      const { assignedRiderId } = await assignRiderToOrderAsAdminAction(api, {
        adminAccessToken,
        orderId,
        riderId: process.env.RIDER_USERID,
      });

      // API (rider): start flow and send rider quote.
      const { riderAccessToken, branchQR } = await riderStartPickupAndArriveAtPharmacy(api, {
        orderId,
        branchId: merchant.account.assignedBranchId,
        requireBranchQR: false,
      });
      await riderSendQuoteFlow(api, {
        riderAccessToken,
        orderId,
        branchId: merchant.account.assignedBranchId,
        prices: buildBasePriceItems(),
        qrImagePath: riderPaymentQrImagePath,
      });

      // UI (merchant): send quote after rider quote is ready.
      await merchant.orderDetailsPage.sendQuote();

      // API (patient): accept quote and pay.
      const { acceptQuoteNode } = await acceptQuoteAsPatientWhenReady(api, { patientAccessToken, orderId });
      const patientPaymentQRCodeId = acceptQuoteNode?.paymentQRCodeId;
      expect(patientPaymentQRCodeId, 'Missing paymentQRCodeId after patient accept quote').toBeTruthy();
      const { paymentQRCodeBranchId } = await ensurePatientPaymentQRCodeAccessible(api, {
        patientAccessToken,
        paymentQRCodeId: patientPaymentQRCodeId,
      });
      await payOrderAsPatientWithProof(api, {
        patientAccessToken,
        orderId,
        proofImagePath: patientProofPaymentImagePath,
        mode: PatientPayModes.DEFAULT,
      });

      // API (admin): confirm payment.
      await confirmPaymentAsAdminAction(api, { adminAccessToken, orderId });

      // API (rider): complete fulfillment.
      await riderCompleteDeliveryFlow(api, {
        riderAccessToken,
        orderId,
        branchId: merchant.account.assignedBranchId,
        branchQR,
        pickupProofImagePath: riderPickupProofImagePath,
        deliveryProofImagePath: riderDeliveryProofImagePath,
        requireBranchQR: false,
      });

      // API (patient): rate rider.
      await rateRiderAsPatientAction(api, {
        patientAccessToken,
        riderId: assignedRiderId || process.env.RIDER_USERID,
      });

      // UI (merchant): verify Completed in details + Orders > Completed tab.
      await merchant.ordersPage.verifyOrderCompletedInDetailsAndCompletedTab(bookingRef);
    }
  );

  test(
    'E2E-9 | Pabili Happy Path - PharmaServ to Quote',
    {
      tag: ['@ui', '@merchant', '@positive', '@merchant-portal', '@e2e-9', '@workflow', '@hybrid', '@pabili'],
      // Flow summary: patient creates Pabili order -> merchant accepts and requests rider (no rider quote) in UI ->
      // admin assigns rider -> merchant updates prices/uploads QR/sends quote in UI -> patient pays ->
      // admin confirms payment -> rider completes delivery -> patient rates ->
      // merchant verifies COMPLETED in details and Completed tab.
    },
    async ({ page, api }) => {
      const merchantPaymentQrImagePath = path.resolve('upload/images/qr1.png');
      const patientProofPaymentImagePath = path.resolve('upload/images/proof1.png');
      const riderPickupProofImagePath = path.resolve('upload/images/proofOfPickup.png');
      const riderDeliveryProofImagePath = path.resolve('upload/images/proofOfDelivery.png');
      const merchant = createMerchantPortalContext(page, { accountKey: 'e2e-pse01' });

      // API (patient): create order.
      const { patientAccessToken, orderId, bookingRef } = await createHybridOrderForBranch(api, {
        deliveryType: HybridDeliveryTypes.PABILI,
        branchId: merchant.account.assignedBranchId,
      });

      // UI (merchant): login, accept order, update prices, upload QR, and send quote.
      await merchant.loginPage.open();
      await merchant.loginPage.login(merchant.account.username, merchant.account.password);
      await merchant.loginPage.assertSuccessLogin();

      await merchant.ordersPage.open();
      await merchant.ordersPage.openNewOrderByBookingRef(bookingRef);
      await merchant.orderDetailsPage.acceptOrderForRiderQuote();
      await merchant.orderDetailsPage.requestForRiderToQuote(false);

      // API (admin): assign rider right after merchant requests rider in UI flow.
      const { adminAccessToken } = await loginAdminForHybrid(api);
      const { assignedRiderId } = await assignRiderToOrderAsAdminAction(api, {
        adminAccessToken,
        orderId,
        riderId: process.env.RIDER_USERID,
      });

      await merchant.orderDetailsPage.updatePriceItems(buildBasePriceItems());
      await merchant.orderDetailsPage.uploadQRCode(merchantPaymentQrImagePath);
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

      // API (admin): confirm payment.
      await confirmPaymentAsAdminAction(api, { adminAccessToken, orderId });

      // API (rider): complete fulfillment.
      await riderCompleteDeliveryFlow(api, {
        orderId,
        branchId: paymentQRCodeBranchId,
        pickupProofImagePath: riderPickupProofImagePath,
        deliveryProofImagePath: riderDeliveryProofImagePath,
        requireBranchQR: false,
      });

      // API (patient): rate rider.
      await rateRiderAsPatientAction(api, {
        patientAccessToken,
        riderId: assignedRiderId || process.env.RIDER_USERID,
      });

      // UI (merchant): verify Completed in details + Orders > Completed tab.
      await merchant.ordersPage.verifyOrderCompletedInDetailsAndCompletedTab(bookingRef);
    }
  );
});
