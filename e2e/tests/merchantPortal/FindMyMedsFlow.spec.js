import path from 'node:path';
import { test, expect } from '../../globalConfig.ui.js';
import { markFailed } from '../../helpers/testFailure.js';
import MerchantPortalLoginPage from '../../pages/merchantPortal/merchantPortalLogin.page.js';
import MerchantOrdersPage from '../../pages/merchantPortal/merchantOrders.page.js';
import MerchantOrderDetailsPage from '../../pages/merchantPortal/merchantOrderDetails.page.js';
import { pharmacistLoginAndGetTokens } from '../../../api/helpers/auth.js';
import {
  prepareOrderAsPharmacist,
  setOrderForPickupAsPharmacist,
} from '../../../api/tests/e2e/shared/steps/pharmacist.steps.js';
import { buildBasePriceItems, HybridDeliveryTypes } from './generic.orderData.js';
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
import { riderCompleteDeliveryFlow } from './actions/riderActions.js';

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
      const portalUsername = process.env.MERCHANT_USERNAME_PSE;
      const portalPassword = process.env.MERCHANT_PASSWORD_PSE;
      if (!portalUsername || !portalPassword) {
        markFailed('Missing MERCHANT_USERNAME_PSE or MERCHANT_PASSWORD_PSE for FindMyMeds hybrid test');
      }

      const { accessToken: merchantAccessToken } = await pharmacistLoginAndGetTokens(api, {
        username: portalUsername,
        password: portalPassword,
      });

      // API (patient): create order.
      const { patientAccessToken, orderId, bookingRef } = await createHybridOrderForBranch(api, {
        deliveryType: HybridDeliveryTypes.FIND_MY_MEDS,
        omitBranchId: true,
      });

      // UI (merchant): login, accept order, assign branch, upload QR, update prices, and send quote.
      const login = new MerchantPortalLoginPage(page);
      const ordersPage = new MerchantOrdersPage(page);
      const orderDetailsPage = new MerchantOrderDetailsPage(page);

      await login.open();
      await login.login(portalUsername, portalPassword);
      await login.assertSuccessLogin();

      await ordersPage.open();
      await ordersPage.openNewOrderByBookingRef(bookingRef);
      await orderDetailsPage.acceptOrder();
      await orderDetailsPage.assignBranchToFirstMatchingPharmacy('Pharmacy API');
      await orderDetailsPage.uploadQRCode(merchantPaymentQrImagePath);
      await orderDetailsPage.updatePriceItems(buildBasePriceItems());
      await orderDetailsPage.sendQuote();

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
      const { adminAccessToken } = await loginAdminForHybrid(api);
      await confirmPaymentAsAdminAction(api, { adminAccessToken, orderId });
      const { assignedRiderId } = await assignRiderToOrderAsAdminAction(api, {
        adminAccessToken,
        orderId,
        riderId: process.env.RIDER_USERID,
      });

      // API (merchant/pharmacist): prepare then set for pickup.
      await prepareOrderAsPharmacist(api, { pharmacistAccessToken: merchantAccessToken, orderId });
      await setOrderForPickupAsPharmacist(api, { pharmacistAccessToken: merchantAccessToken, orderId });

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
      await ordersPage.verifyOrderCompletedInDetailsAndCompletedTab(bookingRef);
    }
  );
});
