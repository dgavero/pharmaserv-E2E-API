import path from 'node:path';
import { test, expect } from '../../globalConfig.ui.js';
import { markFailed } from '../../helpers/testUtilsUI.js';
import MerchantPortalLoginPage from '../../pages/merchantPortal/merchantPortalLogin.page.js';
import MerchantOrdersPage from '../../pages/merchantPortal/merchantOrders.page.js';
import MerchantOrderDetailsPage from '../../pages/merchantPortal/merchantOrderDetails.page.js';
import { buildPabiliBaseOrderInput, buildPabiliBasePriceItems } from '../../../api/tests/e2e/pabili/pabili.testData.js';
import { pharmacistLoginAndGetTokens } from '../../../api/helpers/testUtilsAPI.js';
import {
  loginPatient,
  submitOrderAsPatient,
  acceptQuoteAsPatient,
  getPaymentQRCodeAsPatient,
  getBlobTokenAsPatient,
  getProofOfPaymentUploadUrlAsPatient,
  payOrderAsPatient,
  rateRiderAsPatient,
  uploadImageToSignedUrl,
} from '../../../api/tests/e2e/shared/steps/patient.steps.js';
import {
  acceptOrderAsPharmacist,
  confirmOrderAsPharmacist,
  sendQuoteAsPharmacist,
} from '../../../api/tests/e2e/shared/steps/pharmacist.steps.js';
import { loginAdmin, assignRiderToOrderAsAdmin, confirmPaymentAsAdmin } from '../../../api/tests/e2e/shared/steps/admin.steps.js';
import {
  loginRider,
  startPickupOrderAsRider,
  arrivedAtPharmacyAsRider,
  updatePricesAsRider,
  getPaymentQRCodeUploadUrlAsRider,
  savePaymentQRCodeAsRider,
  sendQuoteAsRider,
  getPickupProofUploadUrlAsRider,
  setPickupProofAsRider,
  pickupOrderAsRider,
  arrivedAtDropOffAsRider,
  getDeliveryProofUploadUrlAsRider,
  setDeliveryProofAsRider,
  completeOrderAsRider,
} from '../../../api/tests/e2e/shared/steps/rider.steps.js';

async function createPabiliOrderForBranch(api, branchId) {
  const { patientAccessToken } = await loginPatient(api);
  const { orderId, submitOrderNode } = await submitOrderAsPatient(api, {
    patientAccessToken,
    order: {
      ...buildPabiliBaseOrderInput(),
      branchId: Number(branchId),
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

test.describe('Merchant Portal | Pabili Full Flow', () => {
  test(
    'E2E-8 | Pabili Happy Path - Rider to Quote',
    {
      tag: ['@ui', '@merchant', '@positive', '@merchant-portal', '@e2e-8', '@workflow', '@hybrid', '@pabili'],
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
      const pabiliOrder = buildPabiliBaseOrderInput();
      const pabiliBranchId = Number(pabiliOrder.branchId);
      if (!pabiliBranchId) {
        markFailed('Missing Pabili branch id');
      }

      const { accessToken: merchantAccessToken } = await pharmacistLoginAndGetTokens(api, {
        username: portalUsername,
        password: portalPassword,
      });

      // API (patient): create order.
      const { patientAccessToken, orderId, bookingRef } = await createPabiliOrderForBranch(api, pabiliBranchId);

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
      const { adminAccessToken } = await loginAdmin(api);
      const { assignedRiderId } = await assignRiderToOrderAsAdmin(api, {
        adminAccessToken,
        orderId,
        riderId: process.env.RIDER_USERID,
      });

      // API (rider): start flow and send rider quote.
      const { riderAccessToken } = await loginRider(api);
      await startPickupOrderAsRider(api, { riderAccessToken, orderId });
      const { branchQR } = await arrivedAtPharmacyAsRider(api, {
        riderAccessToken,
        orderId,
        branchId: pabiliBranchId,
        requireBranchQR: false,
      });
      await updatePricesAsRider(api, {
        riderAccessToken,
        orderId,
        branchId: pabiliBranchId,
        prices: buildPabiliBasePriceItems(),
      });
      const { riderPaymentQRCodeUploadUrl, riderPaymentQRCodeBlobName } = await getPaymentQRCodeUploadUrlAsRider(api, {
        riderAccessToken,
      });
      await uploadImageToSignedUrl(api, {
        uploadUrl: riderPaymentQRCodeUploadUrl,
        imagePath: riderPaymentQrImagePath,
      });
      const { riderPaymentQRCodeId } = await savePaymentQRCodeAsRider(api, {
        riderAccessToken,
        photo: riderPaymentQRCodeBlobName,
      });
      await sendQuoteAsRider(api, {
        riderAccessToken,
        orderId,
        branchId: pabiliBranchId,
        paymentQRCodeId: riderPaymentQRCodeId,
      });

      // API (merchant/pharmacist): send quote.
      const { paymentQRCodeId: quotedPaymentQRCodeId } = await sendQuoteAsPharmacist(api, {
        pharmacistAccessToken: merchantAccessToken,
        orderId,
      });
      expect(quotedPaymentQRCodeId, 'Missing paymentQRCodeId from pharmacist sendQuote response').toBeTruthy();

      // API (patient): accept quote and pay.
      const { acceptQuoteNode } = await acceptQuoteAsPatient(api, { patientAccessToken, orderId });
      const patientPaymentQRCodeId = acceptQuoteNode?.paymentQRCodeId || quotedPaymentQRCodeId;
      expect(patientPaymentQRCodeId, 'Missing paymentQRCodeId after patient accept quote').toBeTruthy();
      const { paymentQRCodePhoto } = await getPaymentQRCodeAsPatient(api, {
        patientAccessToken,
        paymentQRCodeId: patientPaymentQRCodeId,
      });
      await getBlobTokenAsPatient(api, {
        patientAccessToken,
        blobName: paymentQRCodePhoto,
      });
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
        proof: { photo: proofOfPaymentBlobName },
      });

      // API (admin): confirm payment.
      await confirmPaymentAsAdmin(api, { adminAccessToken, orderId });

      // API (rider): complete fulfillment.
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
        branchId: pabiliBranchId,
        proof: { photo: pickupProofBlobName },
      });
      await pickupOrderAsRider(api, {
        riderAccessToken,
        orderId,
        branchId: pabiliBranchId,
        branchQR,
        requireBranchQR: false,
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
    'E2E-9 | Pabili Happy Path - PharmaServ to Quote',
    {
      tag: ['@ui', '@merchant', '@positive', '@merchant-portal', '@e2e-9', '@workflow', '@hybrid', '@pabili'],
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
      const pabiliOrder = buildPabiliBaseOrderInput();
      const pabiliBranchId = Number(pabiliOrder.branchId);
      if (!pabiliBranchId) {
        markFailed('Missing Pabili branch id');
      }

      // API (patient): create order.
      const { patientAccessToken, orderId, bookingRef } = await createPabiliOrderForBranch(api, pabiliBranchId);

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
      const { adminAccessToken } = await loginAdmin(api);
      const { assignedRiderId } = await assignRiderToOrderAsAdmin(api, {
        adminAccessToken,
        orderId,
        riderId: process.env.RIDER_USERID,
      });

      await orderDetailsPage.updatePriceItems(buildPabiliBasePriceItems());
      await orderDetailsPage.uploadQRCode(merchantPaymentQrImagePath);
      await orderDetailsPage.sendQuote();

      // API (patient): accept quote and pay.
      const { acceptQuoteNode } = await acceptQuoteAsPatient(api, { patientAccessToken, orderId });
      const patientPaymentQRCodeId = acceptQuoteNode?.paymentQRCodeId;
      expect(patientPaymentQRCodeId, 'Missing paymentQRCodeId after patient accept quote').toBeTruthy();
      const { paymentQRCodePhoto } = await getPaymentQRCodeAsPatient(api, {
        patientAccessToken,
        paymentQRCodeId: patientPaymentQRCodeId,
      });
      await getBlobTokenAsPatient(api, {
        patientAccessToken,
        blobName: paymentQRCodePhoto,
      });
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
        proof: { photo: proofOfPaymentBlobName },
      });

      // API (admin): confirm payment.
      await confirmPaymentAsAdmin(api, { adminAccessToken, orderId });

      // API (rider): complete fulfillment.
      const { riderAccessToken } = await loginRider(api);
      await startPickupOrderAsRider(api, { riderAccessToken, orderId });
      const { branchQR } = await arrivedAtPharmacyAsRider(api, {
        riderAccessToken,
        orderId,
        branchId: pabiliBranchId,
        requireBranchQR: false,
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
        branchId: pabiliBranchId,
        proof: { photo: pickupProofBlobName },
      });
      await pickupOrderAsRider(api, {
        riderAccessToken,
        orderId,
        branchId: pabiliBranchId,
        branchQR,
        requireBranchQR: false,
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
