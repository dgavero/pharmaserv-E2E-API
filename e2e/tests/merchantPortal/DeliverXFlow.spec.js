import path from 'node:path';
import { test, expect } from '../../globalConfig.ui.js';
import { Timeouts } from '../../Timeouts.js';
import { markFailed } from '../../helpers/testUtilsUI.js';
import MerchantPortalLoginPage from '../../pages/merchantPortal/merchantPortalLogin.page.js';
import MerchantOrdersPage from '../../pages/merchantPortal/merchantOrders.page.js';
import MerchantOrderDetailsPage from '../../pages/merchantPortal/merchantOrderDetails.page.js';
import {
  buildDeliverXBaseOrderInput,
  buildDeliverXBasePriceItems,
} from '../../../api/tests/e2e/deliverx/deliverx.testData.js';
import { safeGraphQL, bearer, pharmacistLoginAndGetTokens } from '../../../api/helpers/testUtilsAPI.js';
import {
  loginPatient,
  submitOrderAsPatient,
  getProofOfPaymentUploadUrlAsPatient,
  payOrderAsPatient,
  payOrderAsPatientForPickupOrder,
  payOrderAsPatientForScheduledDelivery,
  rateRiderAsPatient,
  uploadImageToSignedUrl,
} from '../../../api/tests/e2e/shared/steps/patient.steps.js';
import { PATIENT_ACCEPT_QUOTE_QUERY } from '../../../api/tests/e2e/shared/queries/patient.queries.js';
import {
  loginAdmin,
  confirmPaymentAsAdmin,
  assignRiderToOrderAsAdmin,
} from '../../../api/tests/e2e/shared/steps/admin.steps.js';
import {
  prepareOrderAsPharmacist,
  setOrderForPickupAsPharmacist,
  confirmPickupAsPharmacist,
} from '../../../api/tests/e2e/shared/steps/pharmacist.steps.js';
import {
  loginRider,
  startPickupOrderAsRider,
  arrivedAtPharmacyAsRider,
  getPickupProofUploadUrlAsRider,
  setPickupProofAsRider,
  pickupOrderAsRider,
  arrivedAtDropOffAsRider,
  getDeliveryProofUploadUrlAsRider,
  setDeliveryProofAsRider,
  completeOrderAsRider,
} from '../../../api/tests/e2e/shared/steps/rider.steps.js';
import { MERCHANT_MY_BRANCH_QUERY } from './merchantPortal.queries.js';
import { RIDER_START_PICKUP_ORDER_QUERY } from '../../../api/tests/e2e/shared/queries/rider.queries.js';

async function createOrderForMerchantBranch(api, merchantBranchId) {
  const { patientAccessToken } = await loginPatient(api);
  const { orderId, submitOrderNode } = await submitOrderAsPatient(api, {
    patientAccessToken,
    order: {
      ...buildDeliverXBaseOrderInput(),
      branchId: merchantBranchId,
    },
  });

  const bookingRef = submitOrderNode?.trackingCode;
  if (!bookingRef) {
    markFailed('Missing trackingCode from submit order response');
  }

  return {
    patientAccessToken,
    orderId,
    bookingRef,
  };
}

test.describe('Merchant Portal | DeliverX Full Flow', () => {
  test(
    'E2E-5 | DeliverX Happy Path - DeliverNow',
    {
      tag: ['@ui', '@merchant', '@positive', '@merchant-portal', '@e2e-5', '@workflow', '@hybrid'],
    },
    async ({ page, api }) => {
      const patientProofPaymentImagePath = path.resolve('upload/images/proof1.png');
      const riderPickupProofImagePath = path.resolve('upload/images/proofOfPickup.png');
      const riderDeliveryProofImagePath = path.resolve('upload/images/proofOfDelivery.png');
      const { accessToken: merchantAccessToken } = await pharmacistLoginAndGetTokens(api, {
        username: process.env.MERCHANT_USERNAME,
        password: process.env.MERCHANT_PASSWORD,
      });
      const merchantBranchRes = await safeGraphQL(api, {
        query: MERCHANT_MY_BRANCH_QUERY,
        headers: bearer(merchantAccessToken),
      });
      if (!merchantBranchRes.ok) {
        markFailed(`Failed to fetch merchant branch: ${merchantBranchRes.error || 'unknown error'}`);
      }
      const merchantBranchId = Number(merchantBranchRes.body?.data?.pharmacy?.branch?.myBranch?.id);
      if (!merchantBranchId) {
        markFailed('Missing merchant branch id');
      }

      // API (patient): create order.
      const { patientAccessToken, orderId, bookingRef } = await createOrderForMerchantBranch(api, merchantBranchId);

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
      await orderDetailsPage.updatePriceItems(buildDeliverXBasePriceItems());
      await orderDetailsPage.sendQuote();

      // API (patient): accept quote and pay.
      await expect
        .poll(
          async () => {
            const acceptQuoteRes = await safeGraphQL(api, {
              query: PATIENT_ACCEPT_QUOTE_QUERY,
              variables: { orderId },
              headers: bearer(patientAccessToken),
            });
            return acceptQuoteRes.ok ? 'ok' : String(acceptQuoteRes.error || 'not ready');
          },
          { timeout: Timeouts.long }
        )
        .toBe('ok');
      const { proofOfPaymentUploadUrl, proofOfPaymentBlobName } = await getProofOfPaymentUploadUrlAsPatient(api, {
        patientAccessToken,
      });
      await uploadImageToSignedUrl(api, {
        uploadUrl: proofOfPaymentUploadUrl,
        imagePath: patientProofPaymentImagePath,
      });
      await payOrderAsPatient(api, {
        patientAccessToken,
        orderId,
        proof: {
          fulfillmentMode: 'DELIVERY',
          photo: proofOfPaymentBlobName,
        },
      });

      // API (admin): confirm payment.
      const { adminAccessToken } = await loginAdmin(api);
      await confirmPaymentAsAdmin(api, { adminAccessToken, orderId });

      // API (merchant/pharmacist): prepare then set for pickup.
      await prepareOrderAsPharmacist(api, { pharmacistAccessToken: merchantAccessToken, orderId });
      await setOrderForPickupAsPharmacist(api, { pharmacistAccessToken: merchantAccessToken, orderId });

      // API (admin): assign rider.
      const { assignedRiderId } = await assignRiderToOrderAsAdmin(api, {
        adminAccessToken,
        orderId,
        riderId: process.env.RIDER_USERID,
      });

      // API (rider): complete fulfillment.
      const { riderAccessToken } = await loginRider(api);
      const startPickupOrderRes = await safeGraphQL(api, {
        query: RIDER_START_PICKUP_ORDER_QUERY,
        variables: { orderId },
        headers: bearer(riderAccessToken),
      });
      const manilaHour = Number(
        new Intl.DateTimeFormat('en-US', {
          timeZone: 'Asia/Manila',
          hour: '2-digit',
          hour12: false,
        }).format(new Date())
      );
      const isBlockedWindow = manilaHour >= 0 && manilaHour < 6;
      const outOfScheduleMsg = 'Order cannot be started since time is outside the schedule for delivery';
      if (
        isBlockedWindow &&
        !startPickupOrderRes.ok &&
        String(startPickupOrderRes.error || '').includes(outOfScheduleMsg)
      ) {
        test.info().annotations.push({
          type: 'info',
          description: 'Expected scheduled-window stop: outside delivery schedule during 12AM-6AM (+08).',
        });
        return;
      }
      expect(startPickupOrderRes.ok, startPickupOrderRes.error || 'Rider start pickup order failed').toBe(true);
      expect(startPickupOrderRes.body?.data?.rider?.order?.start?.id).toBe(orderId);
      const { branchQR } = await arrivedAtPharmacyAsRider(api, {
        riderAccessToken,
        orderId,
        branchId: merchantBranchId,
      });
      const { pickupProofUploadUrl, pickupProofBlobName } = await getPickupProofUploadUrlAsRider(api, {
        riderAccessToken,
      });
      await uploadImageToSignedUrl(api, {
        uploadUrl: pickupProofUploadUrl,
        imagePath: riderPickupProofImagePath,
      });
      await setPickupProofAsRider(api, {
        riderAccessToken,
        orderId,
        branchId: merchantBranchId,
        proof: { photo: pickupProofBlobName },
      });
      await pickupOrderAsRider(api, {
        riderAccessToken,
        orderId,
        branchId: merchantBranchId,
        branchQR,
      });
      await arrivedAtDropOffAsRider(api, { riderAccessToken, orderId });
      const { deliveryProofUploadUrl, deliveryProofBlobName } = await getDeliveryProofUploadUrlAsRider(api, {
        riderAccessToken,
      });
      await uploadImageToSignedUrl(api, {
        uploadUrl: deliveryProofUploadUrl,
        imagePath: riderDeliveryProofImagePath,
      });
      await setDeliveryProofAsRider(api, {
        riderAccessToken,
        orderId,
        proof: { photo: deliveryProofBlobName },
      });
      await completeOrderAsRider(api, { riderAccessToken, orderId });

      // API (patient): rate rider.
      await rateRiderAsPatient(api, {
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
    },
    async ({ page, api }) => {
      const patientProofPaymentImagePath = path.resolve('upload/images/proof1.png');
      const { accessToken: merchantAccessToken } = await pharmacistLoginAndGetTokens(api, {
        username: process.env.MERCHANT_USERNAME,
        password: process.env.MERCHANT_PASSWORD,
      });
      const merchantBranchRes = await safeGraphQL(api, {
        query: MERCHANT_MY_BRANCH_QUERY,
        headers: bearer(merchantAccessToken),
      });
      if (!merchantBranchRes.ok) {
        markFailed(`Failed to fetch merchant branch: ${merchantBranchRes.error || 'unknown error'}`);
      }
      const merchantBranchId = Number(merchantBranchRes.body?.data?.pharmacy?.branch?.myBranch?.id);
      if (!merchantBranchId) {
        markFailed('Missing merchant branch id');
      }

      // API (patient): create order.
      const { patientAccessToken, orderId, bookingRef } = await createOrderForMerchantBranch(api, merchantBranchId);

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
      await orderDetailsPage.updatePriceItems(buildDeliverXBasePriceItems());
      await orderDetailsPage.sendQuote();

      // API (patient): accept quote and pay (pickup mode).
      await expect
        .poll(
          async () => {
            const acceptQuoteRes = await safeGraphQL(api, {
              query: PATIENT_ACCEPT_QUOTE_QUERY,
              variables: { orderId },
              headers: bearer(patientAccessToken),
            });
            return acceptQuoteRes.ok ? 'ok' : String(acceptQuoteRes.error || 'not ready');
          },
          { timeout: Timeouts.long }
        )
        .toBe('ok');
      const { proofOfPaymentUploadUrl, proofOfPaymentBlobName } = await getProofOfPaymentUploadUrlAsPatient(api, {
        patientAccessToken,
      });
      await uploadImageToSignedUrl(api, {
        uploadUrl: proofOfPaymentUploadUrl,
        imagePath: patientProofPaymentImagePath,
      });
      await payOrderAsPatientForPickupOrder(api, {
        patientAccessToken,
        orderId,
        proofPhoto: proofOfPaymentBlobName,
      });

      // API (admin): confirm payment.
      const { adminAccessToken } = await loginAdmin(api);
      await confirmPaymentAsAdmin(api, { adminAccessToken, orderId });

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
    },
    async ({ page, api }) => {
      const patientProofPaymentImagePath = path.resolve('upload/images/proof1.png');
      const riderPickupProofImagePath = path.resolve('upload/images/proofOfPickup.png');
      const riderDeliveryProofImagePath = path.resolve('upload/images/proofOfDelivery.png');
      const { accessToken: merchantAccessToken } = await pharmacistLoginAndGetTokens(api, {
        username: process.env.MERCHANT_USERNAME,
        password: process.env.MERCHANT_PASSWORD,
      });
      const merchantBranchRes = await safeGraphQL(api, {
        query: MERCHANT_MY_BRANCH_QUERY,
        headers: bearer(merchantAccessToken),
      });
      if (!merchantBranchRes.ok) {
        markFailed(`Failed to fetch merchant branch: ${merchantBranchRes.error || 'unknown error'}`);
      }
      const merchantBranchId = Number(merchantBranchRes.body?.data?.pharmacy?.branch?.myBranch?.id);
      if (!merchantBranchId) {
        markFailed('Missing merchant branch id');
      }

      // API (patient): create order.
      const { patientAccessToken, orderId, bookingRef } = await createOrderForMerchantBranch(api, merchantBranchId);

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
      await orderDetailsPage.updatePriceItems(buildDeliverXBasePriceItems());
      await orderDetailsPage.sendQuote();

      // API (patient): accept quote and pay (scheduled mode).
      await expect
        .poll(
          async () => {
            const acceptQuoteRes = await safeGraphQL(api, {
              query: PATIENT_ACCEPT_QUOTE_QUERY,
              variables: { orderId },
              headers: bearer(patientAccessToken),
            });
            return acceptQuoteRes.ok ? 'ok' : String(acceptQuoteRes.error || 'not ready');
          },
          { timeout: Timeouts.long }
        )
        .toBe('ok');
      const { proofOfPaymentUploadUrl, proofOfPaymentBlobName } = await getProofOfPaymentUploadUrlAsPatient(api, {
        patientAccessToken,
      });
      await uploadImageToSignedUrl(api, {
        uploadUrl: proofOfPaymentUploadUrl,
        imagePath: patientProofPaymentImagePath,
      });
      await payOrderAsPatientForScheduledDelivery(api, {
        patientAccessToken,
        orderId,
        proofPhoto: proofOfPaymentBlobName,
      });

      // API (admin): confirm payment.
      const { adminAccessToken } = await loginAdmin(api);
      await confirmPaymentAsAdmin(api, { adminAccessToken, orderId });

      // API (merchant/pharmacist): prepare then set for pickup.
      await prepareOrderAsPharmacist(api, { pharmacistAccessToken: merchantAccessToken, orderId });
      await setOrderForPickupAsPharmacist(api, { pharmacistAccessToken: merchantAccessToken, orderId });

      // API (admin): assign rider.
      const { assignedRiderId } = await assignRiderToOrderAsAdmin(api, {
        adminAccessToken,
        orderId,
        riderId: process.env.RIDER_USERID,
      });

      // API (rider): complete fulfillment.
      const { riderAccessToken } = await loginRider(api);
      await startPickupOrderAsRider(api, { riderAccessToken, orderId });
      const { branchQR } = await arrivedAtPharmacyAsRider(api, {
        riderAccessToken,
        orderId,
        branchId: merchantBranchId,
      });
      const { pickupProofUploadUrl, pickupProofBlobName } = await getPickupProofUploadUrlAsRider(api, {
        riderAccessToken,
      });
      await uploadImageToSignedUrl(api, {
        uploadUrl: pickupProofUploadUrl,
        imagePath: riderPickupProofImagePath,
      });
      await setPickupProofAsRider(api, {
        riderAccessToken,
        orderId,
        branchId: merchantBranchId,
        proof: { photo: pickupProofBlobName },
      });
      await pickupOrderAsRider(api, {
        riderAccessToken,
        orderId,
        branchId: merchantBranchId,
        branchQR,
      });
      await arrivedAtDropOffAsRider(api, { riderAccessToken, orderId });
      const { deliveryProofUploadUrl, deliveryProofBlobName } = await getDeliveryProofUploadUrlAsRider(api, {
        riderAccessToken,
      });
      await uploadImageToSignedUrl(api, {
        uploadUrl: deliveryProofUploadUrl,
        imagePath: riderDeliveryProofImagePath,
      });
      await setDeliveryProofAsRider(api, {
        riderAccessToken,
        orderId,
        proof: { photo: deliveryProofBlobName },
      });
      await completeOrderAsRider(api, { riderAccessToken, orderId });

      // API (patient): rate rider.
      await rateRiderAsPatient(api, {
        patientAccessToken,
        riderId: assignedRiderId || process.env.RIDER_USERID,
      });

      // UI (merchant): verify Completed in details + Orders > Completed tab.
      await ordersPage.verifyOrderCompletedInDetailsAndCompletedTab(bookingRef);
    }
  );
});
