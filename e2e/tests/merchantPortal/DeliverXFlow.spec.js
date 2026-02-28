import path from 'node:path';
import { request as playwrightRequest } from '@playwright/test';
import { test, expect } from '../../globalConfig.ui.js';
import { Timeouts } from '../../Timeouts.js';
import { markFailed, safeWaitForPageLoad } from '../../helpers/testUtilsUI.js';
import { loadSelectors, getSelector } from '../../helpers/selectors.js';
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

test.describe('Merchant Portal | DeliverX Full Flow', () => {
  test(
    '[P0] DeliverX Happy Path - DeliverNow',
    {
      tag: ['@ui', '@merchant', '@deliverx', '@workflow', '@hybrid', '@p0', '@smoke'],
    },
    async ({ page }) => {
      if (!process.env.API_BASE_URL) {
        markFailed('Missing API_BASE_URL environment variable');
      }

      const api = await playwrightRequest.newContext({
        baseURL: process.env.API_BASE_URL,
      });

      try {
        const sel = loadSelectors('merchant');
        const ordersReadySelectors = [
          getSelector(sel, 'Orders.PageRoot'),
          getSelector(sel, 'Orders.SearchInput'),
        ];
        const orderDetailsReadySelectors = [
          getSelector(sel, 'OrderDetails.PageRoot'),
          getSelector(sel, 'OrderDetails.AcceptButton'),
          getSelector(sel, 'OrderDetails.RequestPaymentButton'),
        ];
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

        // UI (merchant): accept, upload QR, update prices, request payment.
        const login = new MerchantPortalLoginPage(page);
        const ordersPage = new MerchantOrdersPage(page);
        const orderDetailsPage = new MerchantOrderDetailsPage(page);

        await login.open();
        await login.login(process.env.MERCHANT_USERNAME, process.env.MERCHANT_PASSWORD);
        await login.assertSuccessLogin();

        await ordersPage.open();
        await ordersPage.searchOrder(bookingRef);
        await ordersPage.openOrderById(bookingRef);
        if (!(await safeWaitForPageLoad(page, orderDetailsReadySelectors))) {
          markFailed('Order details page did not load');
        }
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

        // UI (merchant): final verification - order should be in Completed.
        await ordersPage.open();
        let isCompleted = await ordersPage.hasCompletedOrderByBookingRef(bookingRef);
        if (!isCompleted) {
          await page.reload();
          if (!(await safeWaitForPageLoad(page, ordersReadySelectors))) {
            markFailed('Orders page did not load after refresh');
          }
          isCompleted = await ordersPage.hasCompletedOrderByBookingRef(bookingRef);
        }
        if (!isCompleted) {
          markFailed(`Order ${bookingRef} is not COMPLETED on merchant portal after refresh`);
        }
      } finally {
        await api.dispose();
      }
    }
  );
});
