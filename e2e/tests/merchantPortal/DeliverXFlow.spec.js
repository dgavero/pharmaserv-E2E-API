import path from 'node:path';
import { test, expect } from '../../globalConfig.ui.js';
import { Timeouts } from '../../Timeouts.js';
import { markFailed } from '../../helpers/testFailure.js';
import { safeWaitForElementHidden } from '../../helpers/uiActions.js';
import { loadSelectors, getSelector } from '../../helpers/selectors.js';
import MerchantPortalLoginPage from '../../pages/merchantPortal/merchantPortalLogin.page.js';
import MerchantOrdersPage from '../../pages/merchantPortal/merchantOrders.page.js';
import MerchantOrderDetailsPage from '../../pages/merchantPortal/merchantOrderDetails.page.js';
import { pharmacistLoginAndGetTokens } from '../../../api/helpers/auth.js';
import {
  prepareOrderAsPharmacist,
  setOrderForPickupAsPharmacist,
  confirmPickupAsPharmacist,
} from '../../../api/tests/e2e/shared/steps/pharmacist.steps.js';
import {
  buildBasePriceItems,
  buildBasePrescriptionItems,
  buildDeliverXAttachmentNoPrescriptionHybridOrderInput,
  buildHybridOrderInput,
  HybridDeliveryTypes,
} from './generic.orderData.js';
import {
  PatientPayModes,
  acceptQuoteAsPatientWhenReady,
  createHybridOrder,
  createHybridOrderForBranch,
  ensurePatientPaymentQRCodeAccessible,
  payOrderAsPatientWithProof,
  requestReQuoteAsPatientAction,
  rateRiderAsPatientAction,
} from './actions/patientActions.js';
import {
  assignRiderToOrderAsAdminAction,
  confirmPaymentAsAdminAction,
  getMerchantIdRegular,
  loginAdminForHybrid,
} from './actions/adminActions.js';
import {
  getDeliverXStartPickupStatus,
  loginRiderForHybrid,
  riderCompleteDeliveryFlow,
} from './actions/riderActions.js';

test.describe('Merchant Portal | DeliverX Full Flow', () => {
  test(
    'E2E-5 | DeliverX Happy Path - DeliverNow',
    {
      tag: ['@ui', '@merchant', '@positive', '@merchant-portal', '@e2e-5', '@workflow', '@hybrid'],
      // Flow summary: patient creates DeliverX order -> merchant accepts/quotes in UI -> patient pays ->
      // admin confirms + assigns rider -> pharmacist sets for pickup -> rider completes delivery -> patient rates ->
      // merchant verifies COMPLETED in details and Completed tab.
    },
    async ({ page, api }) => {
      const patientProofPaymentImagePath = path.resolve('upload/images/proof1.png');
      const riderPickupProofImagePath = path.resolve('upload/images/proofOfPickup.png');
      const riderDeliveryProofImagePath = path.resolve('upload/images/proofOfDelivery.png');
      const { accessToken: merchantAccessToken } = await pharmacistLoginAndGetTokens(api, {
        username: process.env.MERCHANT_USERNAME,
        password: process.env.MERCHANT_PASSWORD,
      });
      const merchantBranchId = await getMerchantIdRegular(api, merchantAccessToken);

      // API (patient): create order with higher submitted quantities (5, 7).
      const submittedPrescriptionItems = buildBasePrescriptionItems().map((item, index) => ({
        ...item,
        quantity: index === 0 ? 5 : 7,
      }));
      const { patientAccessToken, orderId, bookingRef } = await createHybridOrder(api, {
        order: buildHybridOrderInput({
          deliveryType: HybridDeliveryTypes.DELIVER_X,
          branchId: merchantBranchId,
          prescriptionItems: submittedPrescriptionItems,
        }),
      });

      // UI (merchant): accept, upload QR, update prices, request payment.
      const login = new MerchantPortalLoginPage(page);
      const ordersPage = new MerchantOrdersPage(page);
      const orderDetailsPage = new MerchantOrderDetailsPage(page);

      await login.open();
      await login.login(process.env.MERCHANT_USERNAME, process.env.MERCHANT_PASSWORD);
      await login.assertSuccessLogin();

      await ordersPage.open();
      await ordersPage.openNewOrderByBookingRef(bookingRef);
      await orderDetailsPage.acceptOrder();
      await orderDetailsPage.uploadQRCode(path.resolve('upload/images/qr1.png'));
      await orderDetailsPage.updatePriceItems(buildBasePriceItems());
      await orderDetailsPage.sendQuote();

      // API (patient): accept quote and pay.
      const { acceptQuoteNode } = await acceptQuoteAsPatientWhenReady(api, {
        patientAccessToken,
        orderId,
        timeout: Timeouts.long,
      });
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
        mode: PatientPayModes.DELIVERY,
      });

      // API (admin): confirm payment.
      const { adminAccessToken } = await loginAdminForHybrid(api);
      await confirmPaymentAsAdminAction(api, { adminAccessToken, orderId });

      // API (merchant/pharmacist): prepare then set for pickup.
      await prepareOrderAsPharmacist(api, { pharmacistAccessToken: merchantAccessToken, orderId });
      await setOrderForPickupAsPharmacist(api, { pharmacistAccessToken: merchantAccessToken, orderId });

      // API (admin): assign rider.
      const { assignedRiderId } = await assignRiderToOrderAsAdminAction(api, {
        adminAccessToken,
        orderId,
        riderId: process.env.RIDER_USERID,
      });

      // API (rider): complete fulfillment.
      const { riderAccessToken } = await loginRiderForHybrid(api);
      const { startPickupOrderRes, isOutOfScheduleBlocked } = await getDeliverXStartPickupStatus(api, {
        riderAccessToken,
        orderId,
      });
      if (isOutOfScheduleBlocked) {
        test.info().annotations.push({
          type: 'info',
          description: 'Expected scheduled-window stop: outside delivery schedule during 12AM-6AM (+08).',
        });
        return;
      }
      expect(startPickupOrderRes.ok, startPickupOrderRes.error || 'Rider start pickup order failed').toBe(true);
      expect(startPickupOrderRes.body?.data?.rider?.order?.start?.id).toBe(orderId);
      await riderCompleteDeliveryFlow(api, {
        riderAccessToken,
        orderId,
        branchId: paymentQRCodeBranchId,
        pickupProofImagePath: riderPickupProofImagePath,
        deliveryProofImagePath: riderDeliveryProofImagePath,
        skipStartPickup: true,
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
    'E2E-6 | DeliverX Happy Path - Pickup',
    {
      tag: ['@ui', '@merchant', '@positive', '@merchant-portal', '@e2e-6', '@workflow', '@hybrid', '@pickup'],
      // Flow summary: patient creates DeliverX pickup order -> merchant accepts/quotes in UI -> patient pays ->
      // admin confirms payment -> pharmacist prepares/sets for pickup/confirms pickup via patient QR ->
      // merchant verifies COMPLETED in details and Completed tab.
    },
    async ({ page, api }) => {
      const patientProofPaymentImagePath = path.resolve('upload/images/proof1.png');
      const { accessToken: merchantAccessToken } = await pharmacistLoginAndGetTokens(api, {
        username: process.env.MERCHANT_USERNAME,
        password: process.env.MERCHANT_PASSWORD,
      });
      const merchantBranchId = await getMerchantIdRegular(api, merchantAccessToken);

      // API (patient): create order.
      const { patientAccessToken, orderId, bookingRef } = await createHybridOrderForBranch(api, {
        deliveryType: HybridDeliveryTypes.DELIVER_X,
        branchId: merchantBranchId,
      });

      // UI (merchant): accept, upload QR, update prices, request payment.
      const login = new MerchantPortalLoginPage(page);
      const ordersPage = new MerchantOrdersPage(page);
      const orderDetailsPage = new MerchantOrderDetailsPage(page);

      await login.open();
      await login.login(process.env.MERCHANT_USERNAME, process.env.MERCHANT_PASSWORD);
      await login.assertSuccessLogin();

      await ordersPage.open();
      await ordersPage.openNewOrderByBookingRef(bookingRef);
      await orderDetailsPage.acceptOrder();
      await orderDetailsPage.uploadQRCode(path.resolve('upload/images/qr1.png'));
      await orderDetailsPage.updatePriceItems(buildBasePriceItems());
      await orderDetailsPage.sendQuote();

      // API (patient): accept quote and pay (pickup mode).
      const { acceptQuoteNode } = await acceptQuoteAsPatientWhenReady(api, {
        patientAccessToken,
        orderId,
        timeout: Timeouts.long,
      });
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
        mode: PatientPayModes.PICKUP,
      });

      // API (admin): confirm payment.
      const { adminAccessToken } = await loginAdminForHybrid(api);
      await confirmPaymentAsAdminAction(api, { adminAccessToken, orderId });

      // API (merchant/pharmacist): prepare, set for pickup, and confirm pickup.
      await prepareOrderAsPharmacist(api, { pharmacistAccessToken: merchantAccessToken, orderId });
      const { patientQR } = await setOrderForPickupAsPharmacist(api, {
        pharmacistAccessToken: merchantAccessToken,
        orderId,
      });
      if (!patientQR) {
        markFailed('Missing patientQR from set-for-pickup response');
      }
      await confirmPickupAsPharmacist(api, {
        pharmacistAccessToken: merchantAccessToken,
        orderId,
        qrCode: patientQR,
      });

      // UI (merchant): verify Completed in details + Orders > Completed tab.
      await ordersPage.verifyOrderCompletedInDetailsAndCompletedTab(bookingRef);
    }
  );

  test(
    'E2E-7 | DeliverX Happy Path - Scheduled',
    {
      tag: ['@ui', '@merchant', '@positive', '@merchant-portal', '@e2e-7', '@workflow', '@hybrid', '@scheduled'],
      // Flow summary: patient creates DeliverX scheduled order -> merchant accepts/quotes in UI -> patient pays ->
      // admin confirms + assigns rider -> pharmacist sets order for pickup -> rider completes delivery -> patient rates ->
      // merchant verifies COMPLETED in details and Completed tab.
    },
    async ({ page, api }) => {
      const manilaHourRaw = Number(
        new Intl.DateTimeFormat('en-US', {
          timeZone: 'Asia/Manila',
          hour: '2-digit',
          hour12: false,
        }).format(new Date())
      );
      const manilaHour = Number.isFinite(manilaHourRaw) ? manilaHourRaw % 24 : 0;
      test.skip(manilaHour >= 0 && manilaHour < 6, 'Skipped - Time is out of schedule');

      const patientProofPaymentImagePath = path.resolve('upload/images/proof1.png');
      const riderPickupProofImagePath = path.resolve('upload/images/proofOfPickup.png');
      const riderDeliveryProofImagePath = path.resolve('upload/images/proofOfDelivery.png');
      const { accessToken: merchantAccessToken } = await pharmacistLoginAndGetTokens(api, {
        username: process.env.MERCHANT_USERNAME,
        password: process.env.MERCHANT_PASSWORD,
      });
      const merchantBranchId = await getMerchantIdRegular(api, merchantAccessToken);

      // API (patient): create order.
      const { patientAccessToken, orderId, bookingRef } = await createHybridOrderForBranch(api, {
        deliveryType: HybridDeliveryTypes.DELIVER_X,
        branchId: merchantBranchId,
      });

      // UI (merchant): accept, upload QR, update prices, request payment.
      const login = new MerchantPortalLoginPage(page);
      const ordersPage = new MerchantOrdersPage(page);
      const orderDetailsPage = new MerchantOrderDetailsPage(page);

      await login.open();
      await login.login(process.env.MERCHANT_USERNAME, process.env.MERCHANT_PASSWORD);
      await login.assertSuccessLogin();

      await ordersPage.open();
      await ordersPage.openNewOrderByBookingRef(bookingRef);
      await orderDetailsPage.acceptOrder();
      await orderDetailsPage.uploadQRCode(path.resolve('upload/images/qr1.png'));
      await orderDetailsPage.updatePriceItems(buildBasePriceItems());
      await orderDetailsPage.sendQuote();

      // API (patient): accept quote and pay (scheduled mode).
      const { acceptQuoteNode } = await acceptQuoteAsPatientWhenReady(api, {
        patientAccessToken,
        orderId,
        timeout: Timeouts.long,
      });
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
        mode: PatientPayModes.SCHEDULED,
      });

      // API (admin): confirm payment.
      const { adminAccessToken } = await loginAdminForHybrid(api);
      await confirmPaymentAsAdminAction(api, { adminAccessToken, orderId });

      // API (merchant/pharmacist): prepare then set for pickup.
      await prepareOrderAsPharmacist(api, { pharmacistAccessToken: merchantAccessToken, orderId });
      await setOrderForPickupAsPharmacist(api, { pharmacistAccessToken: merchantAccessToken, orderId });

      // API (admin): assign rider.
      const { assignedRiderId } = await assignRiderToOrderAsAdminAction(api, {
        adminAccessToken,
        orderId,
        riderId: process.env.RIDER_USERID,
      });

      // API (rider): complete fulfillment.
      await riderCompleteDeliveryFlow(api, {
        orderId,
        branchId: paymentQRCodeBranchId,
        pickupProofImagePath: riderPickupProofImagePath,
        deliveryProofImagePath: riderDeliveryProofImagePath,
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
    'E2E-11 | DeliverX - Patient only sends an attachment for submitted order',
    {
      tag: ['@ui', '@merchant', '@positive', '@merchant-portal', '@e2e-11', '@workflow', '@hybrid', '@deliverx'],
      // Flow summary: patient submits DeliverX attachment-only order -> merchant accepts in UI ->
      // pharmacist adds/replaces items and sends quote via API -> patient pays -> admin confirms and assigns rider ->
      // pharmacist sets for pickup -> rider completes -> patient rates -> merchant verifies COMPLETED in UI.
    },
    async ({ page, api }) => {
      const patientProofPaymentImagePath = path.resolve('upload/images/proof1.png');
      const riderPickupProofImagePath = path.resolve('upload/images/proofOfPickup.png');
      const riderDeliveryProofImagePath = path.resolve('upload/images/proofOfDelivery.png');

      const { accessToken: merchantAccessToken } = await pharmacistLoginAndGetTokens(api, {
        username: process.env.MERCHANT_USERNAME,
        password: process.env.MERCHANT_PASSWORD,
      });
      const merchantBranchId = await getMerchantIdRegular(api, merchantAccessToken);

      // API (patient): create attachment-only order with no prescription items.
      const { patientAccessToken, orderId, bookingRef } = await createHybridOrder(api, {
        order: buildDeliverXAttachmentNoPrescriptionHybridOrderInput({
          branchId: merchantBranchId,
        }),
      });

      // UI (merchant): login and accept order.
      const login = new MerchantPortalLoginPage(page);
      const ordersPage = new MerchantOrdersPage(page);
      const orderDetailsPage = new MerchantOrderDetailsPage(page);

      await login.open();
      await login.login(process.env.MERCHANT_USERNAME, process.env.MERCHANT_PASSWORD);
      await login.assertSuccessLogin();

      await ordersPage.open();
      await ordersPage.openNewOrderByBookingRef(bookingRef);
      await orderDetailsPage.acceptOrder();

      // UI (merchant): add medicines with qty/price, upload QR, then send quote.
      await orderDetailsPage.addItemToOrder('Biogesic', 200, 2);
      await orderDetailsPage.addItemToOrder('Maalox', 400, 5);
      await orderDetailsPage.uploadQRCode(path.resolve('upload/images/qr1.png'));
      await orderDetailsPage.sendQuote();

      // API (patient): accept quote and pay.
      const { acceptQuoteNode } = await acceptQuoteAsPatientWhenReady(api, {
        patientAccessToken,
        orderId,
        timeout: Timeouts.long,
      });
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
        mode: PatientPayModes.DELIVERY,
      });

      // API (admin): confirm payment.
      const { adminAccessToken } = await loginAdminForHybrid(api);
      await confirmPaymentAsAdminAction(api, { adminAccessToken, orderId });

      // API (merchant/pharmacist): prepare then set for pickup.
      await prepareOrderAsPharmacist(api, { pharmacistAccessToken: merchantAccessToken, orderId });
      await setOrderForPickupAsPharmacist(api, { pharmacistAccessToken: merchantAccessToken, orderId });

      // API (admin): assign rider.
      const { assignedRiderId } = await assignRiderToOrderAsAdminAction(api, {
        adminAccessToken,
        orderId,
        riderId: process.env.RIDER_USERID,
      });

      // API (rider): complete fulfillment.
      await riderCompleteDeliveryFlow(api, {
        orderId,
        branchId: paymentQRCodeBranchId,
        pickupProofImagePath: riderPickupProofImagePath,
        deliveryProofImagePath: riderDeliveryProofImagePath,
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
    'E2E-12 | DeliverX - Patient to request requote and reduce item quantity before paying',
    {
      tag: ['@ui', '@merchant', '@positive', '@merchant-portal', '@e2e-12', '@workflow', '@hybrid', '@deliverx'],
      // Flow summary: patient creates DeliverX order -> merchant accepts/quotes in UI -> patient requests requote ->
      // merchant re-sends quote in UI -> patient accepts and pays -> merchant verifies quantity-change modal ->
      // admin confirms/assigns rider -> pharmacist sets for pickup -> rider completes -> patient rates ->
      // merchant verifies COMPLETED in details and Completed tab.
    },
    async ({ page, api }) => {
      const patientProofPaymentImagePath = path.resolve('upload/images/proof1.png');
      const riderPickupProofImagePath = path.resolve('upload/images/proofOfPickup.png');
      const riderDeliveryProofImagePath = path.resolve('upload/images/proofOfDelivery.png');

      const { accessToken: merchantAccessToken } = await pharmacistLoginAndGetTokens(api, {
        username: process.env.MERCHANT_USERNAME,
        password: process.env.MERCHANT_PASSWORD,
      });
      const merchantBranchId = await getMerchantIdRegular(api, merchantAccessToken);

      // API (patient): create order.
      const { patientAccessToken, orderId, bookingRef } = await createHybridOrderForBranch(api, {
        deliveryType: HybridDeliveryTypes.DELIVER_X,
        branchId: merchantBranchId,
      });

      // UI (merchant): accept, upload QR, update prices, request payment.
      const login = new MerchantPortalLoginPage(page);
      const ordersPage = new MerchantOrdersPage(page);
      const orderDetailsPage = new MerchantOrderDetailsPage(page);

      await login.open();
      await login.login(process.env.MERCHANT_USERNAME, process.env.MERCHANT_PASSWORD);
      await login.assertSuccessLogin();

      await ordersPage.open();
      await ordersPage.openNewOrderByBookingRef(bookingRef);
      await orderDetailsPage.acceptOrder();
      await orderDetailsPage.uploadQRCode(path.resolve('upload/images/qr1.png'));
      await orderDetailsPage.updatePriceItems(buildBasePriceItems());
      await orderDetailsPage.sendQuote();

      // API (patient): accept initial quote, then request requote.
      await acceptQuoteAsPatientWhenReady(api, { patientAccessToken, orderId, timeout: Timeouts.long });
      await requestReQuoteAsPatientAction(api, { patientAccessToken, orderId });
      await orderDetailsPage.closeRequoteRequestModal();

      // UI (merchant): re-send quote after patient requote/quantity change.
      const sel = loadSelectors('merchant');
      const requestPaymentLoadingButton = getSelector(sel, 'OrderDetails.RequestPaymentLoadingButton');
      if (!(await safeWaitForElementHidden(page, requestPaymentLoadingButton))) {
        markFailed('Request payment is still loading before re-send quote');
      }
      await orderDetailsPage.sendQuote();

      // API (patient): accept updated quote, reduce quantities (3, 4), then pay.
      const { acceptQuoteNode: reQuotedAcceptNode } = await acceptQuoteAsPatientWhenReady(api, {
        patientAccessToken,
        orderId,
        timeout: Timeouts.long,
      });
      const reQuotedPaymentQRCodeId = reQuotedAcceptNode?.paymentQRCodeId;
      expect(reQuotedPaymentQRCodeId, 'Missing paymentQRCodeId after patient accept quote').toBeTruthy();
      const { paymentQRCodeBranchId } = await ensurePatientPaymentQRCodeAccessible(api, {
        patientAccessToken,
        paymentQRCodeId: reQuotedPaymentQRCodeId,
      });
      expect(paymentQRCodeBranchId, 'Missing branchId from patient payment QR code').toBeTruthy();
      const reQuotedPrescriptionItems = reQuotedAcceptNode?.legs?.[0]?.prescriptionItems || [];
      if (reQuotedPrescriptionItems.length < 2) {
        markFailed('Missing prescription items from updated quote for quantity reduction');
      }
      const firstPrescriptionItemId = Number(reQuotedPrescriptionItems[0]?.id);
      const secondPrescriptionItemId = Number(reQuotedPrescriptionItems[1]?.id);
      if (!firstPrescriptionItemId || !secondPrescriptionItemId) {
        markFailed('Missing prescription item IDs from updated quote for quantity reduction');
      }
      await payOrderAsPatientWithProof(api, {
        patientAccessToken,
        orderId,
        proofImagePath: patientProofPaymentImagePath,
        mode: PatientPayModes.DELIVERY,
        quantities: [
          {
            prescriptionItemId: firstPrescriptionItemId,
            quantity: 3,
          },
          {
            prescriptionItemId: secondPrescriptionItemId,
            quantity: 4,
          },
        ],
      });

      // UI (merchant): verify quantity-change modal appears and close it.
      await orderDetailsPage.verifyQuantityChangedModalAppeared();

      // API (admin): confirm payment.
      const { adminAccessToken } = await loginAdminForHybrid(api);
      await confirmPaymentAsAdminAction(api, { adminAccessToken, orderId });

      // API (merchant/pharmacist): prepare then set for pickup.
      await prepareOrderAsPharmacist(api, { pharmacistAccessToken: merchantAccessToken, orderId });
      await setOrderForPickupAsPharmacist(api, { pharmacistAccessToken: merchantAccessToken, orderId });

      // API (admin): assign rider.
      const { assignedRiderId } = await assignRiderToOrderAsAdminAction(api, {
        adminAccessToken,
        orderId,
        riderId: process.env.RIDER_USERID,
      });

      // API (rider): complete fulfillment.
      await riderCompleteDeliveryFlow(api, {
        orderId,
        branchId: paymentQRCodeBranchId,
        pickupProofImagePath: riderPickupProofImagePath,
        deliveryProofImagePath: riderDeliveryProofImagePath,
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
