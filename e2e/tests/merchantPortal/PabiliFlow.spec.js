import path from 'node:path';
import { test, expect } from '../../globalConfig.ui.js';
import { markFailed } from '../../helpers/testUtilsUI.js';
import MerchantPortalLoginPage from '../../pages/merchantPortal/merchantPortalLogin.page.js';
import MerchantOrdersPage from '../../pages/merchantPortal/merchantOrders.page.js';
import MerchantOrderDetailsPage from '../../pages/merchantPortal/merchantOrderDetails.page.js';
import { pharmacistLoginAndGetTokens } from '../../../api/helpers/testUtilsAPI.js';
import {
  acceptOrderAsPharmacist,
  confirmOrderAsPharmacist,
  sendQuoteAsPharmacist,
} from '../../../api/tests/e2e/shared/steps/pharmacist.steps.js';
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
  getMerchantIdPSE,
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
      const portalUsername = process.env.MERCHANT_USERNAME_PSE;
      const portalPassword = process.env.MERCHANT_PASSWORD_PSE;
      if (!portalUsername || !portalPassword) {
        markFailed('Missing MERCHANT_USERNAME_PSE or MERCHANT_PASSWORD_PSE for Pabili hybrid test');
      }
      const { accessToken: merchantAccessToken } = await pharmacistLoginAndGetTokens(api, {
        username: portalUsername,
        password: portalPassword,
      });
      const merchantBranchId = await getMerchantIdPSE(api, merchantAccessToken);

      // API (patient): create order.
      const { patientAccessToken, orderId, bookingRef } = await createHybridOrderForBranch(api, {
        deliveryType: HybridDeliveryTypes.PABILI,
        branchId: merchantBranchId,
      });

      // UI (merchant): login and accept order.
      const login = new MerchantPortalLoginPage(page);
      const ordersPage = new MerchantOrdersPage(page);
      const orderDetailsPage = new MerchantOrderDetailsPage(page);

      await login.open();
      await login.login(portalUsername, portalPassword);
      await login.assertSuccessLogin();

      await ordersPage.open();
      await ordersPage.openNewOrderByBookingRef(bookingRef);
      await orderDetailsPage.acceptOrderForRiderQuote();
      await orderDetailsPage.requestForRiderToQuote(true);

      // API (merchant/pharmacist): ensure accepted state and enable rider quote mode.
      await acceptOrderAsPharmacist(api, {
        pharmacistAccessToken: merchantAccessToken,
        orderId,
      });
      await confirmOrderAsPharmacist(api, {
        pharmacistAccessToken: merchantAccessToken,
        orderId,
        riderQuoteEnabled: true,
      });

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
        branchId: merchantBranchId,
        requireBranchQR: false,
      });
      await riderSendQuoteFlow(api, {
        riderAccessToken,
        orderId,
        branchId: merchantBranchId,
        prices: buildBasePriceItems(),
        qrImagePath: riderPaymentQrImagePath,
      });

      // API (merchant/pharmacist): send quote.
      const { paymentQRCodeId: quotedPaymentQRCodeId } = await sendQuoteAsPharmacist(api, {
        pharmacistAccessToken: merchantAccessToken,
        orderId,
      });
      expect(quotedPaymentQRCodeId, 'Missing paymentQRCodeId from pharmacist sendQuote response').toBeTruthy();

      // API (patient): accept quote and pay.
      const { acceptQuoteNode } = await acceptQuoteAsPatientWhenReady(api, { patientAccessToken, orderId });
      const patientPaymentQRCodeId = acceptQuoteNode?.paymentQRCodeId || quotedPaymentQRCodeId;
      expect(patientPaymentQRCodeId, 'Missing paymentQRCodeId after patient accept quote').toBeTruthy();
      await ensurePatientPaymentQRCodeAccessible(api, {
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
        branchId: merchantBranchId,
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
      await ordersPage.verifyOrderCompletedInDetailsAndCompletedTab(bookingRef);
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
      const portalUsername = process.env.MERCHANT_USERNAME_PSE;
      const portalPassword = process.env.MERCHANT_PASSWORD_PSE;
      if (!portalUsername || !portalPassword) {
        markFailed('Missing MERCHANT_USERNAME_PSE or MERCHANT_PASSWORD_PSE for Pabili hybrid test');
      }
      const { accessToken: merchantAccessToken } = await pharmacistLoginAndGetTokens(api, {
        username: portalUsername,
        password: portalPassword,
      });
      const merchantBranchId = await getMerchantIdPSE(api, merchantAccessToken);

      // API (patient): create order.
      const { patientAccessToken, orderId, bookingRef } = await createHybridOrderForBranch(api, {
        deliveryType: HybridDeliveryTypes.PABILI,
        branchId: merchantBranchId,
      });

      // UI (merchant): login, accept order, update prices, upload QR, and send quote.
      const login = new MerchantPortalLoginPage(page);
      const ordersPage = new MerchantOrdersPage(page);
      const orderDetailsPage = new MerchantOrderDetailsPage(page);

      await login.open();
      await login.login(portalUsername, portalPassword);
      await login.assertSuccessLogin();

      await ordersPage.open();
      await ordersPage.openNewOrderByBookingRef(bookingRef);
      await orderDetailsPage.acceptOrderForRiderQuote();
      await orderDetailsPage.requestForRiderToQuote(false);

      // API (admin): assign rider right after merchant requests rider in UI flow.
      const { adminAccessToken } = await loginAdminForHybrid(api);
      const { assignedRiderId } = await assignRiderToOrderAsAdminAction(api, {
        adminAccessToken,
        orderId,
        riderId: process.env.RIDER_USERID,
      });

      await orderDetailsPage.updatePriceItems(buildBasePriceItems());
      await orderDetailsPage.uploadQRCode(merchantPaymentQrImagePath);
      await orderDetailsPage.sendQuote();

      // API (patient): accept quote and pay.
      const { acceptQuoteNode } = await acceptQuoteAsPatientWhenReady(api, { patientAccessToken, orderId });
      const patientPaymentQRCodeId = acceptQuoteNode?.paymentQRCodeId;
      expect(patientPaymentQRCodeId, 'Missing paymentQRCodeId after patient accept quote').toBeTruthy();
      await ensurePatientPaymentQRCodeAccessible(api, {
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
      const { riderAccessToken, branchQR } = await riderStartPickupAndArriveAtPharmacy(api, {
        orderId,
        branchId: merchantBranchId,
        requireBranchQR: false,
      });
      await riderCompleteDeliveryFlow(api, {
        riderAccessToken,
        orderId,
        branchId: merchantBranchId,
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
      await ordersPage.verifyOrderCompletedInDetailsAndCompletedTab(bookingRef);
    }
  );
});
