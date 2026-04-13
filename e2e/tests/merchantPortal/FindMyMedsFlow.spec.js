import path from 'node:path';
import { test, expect } from '../../globalConfig.ui.js';
import { getPatientAccount, getRiderAccount } from '../../../api/helpers/roleCredentials.js';
import { createMerchantPortalContext } from './merchantPortalContext.js';
import { buildBasePriceItems, buildFindMyMedsHybridOrderInput } from './generic.orderData.js';
import {
  PatientPayModes,
  acceptQuoteAsPatientWhenReady,
  createHybridOrder,
  ensurePatientPaymentQRCodeAccessible,
  payOrderAsPatientWithProof,
  rateRiderAsPatientForHybrid,
} from './actions/patientActions.js';
import {
  assignRiderToOrderAsAdminForHybrid,
  confirmPaymentAsAdminForHybrid,
  loginAsAdminForHybrid,
} from './actions/adminActions.js';
import {
  completeDeliveryAsRiderForHybrid,
  startPickupAndArriveAtPharmacyAsRiderForHybrid,
} from './actions/riderActions.js';
import { uploadImageToSignedUrl } from '../../../api/tests/e2e/shared/steps/patient.steps.js';
import {
  getPickupProofUploadUrlAsRider,
  setPickupProofAsRider,
  pickupOrderAsRider,
  arrivedAtDropOffAsRider,
  getDeliveryProofUploadUrlAsRider,
  setDeliveryProofAsRider,
  completeOrderAsRider,
} from '../../../api/tests/e2e/shared/steps/rider.steps.js';

const defaultPatientAccount = getPatientAccount('default');
const defaultRiderAccount = getRiderAccount('default');

function resolveFuricMedicineId() {
  const testEnv = String(process.env.TEST_ENV || 'DEV').toUpperCase();
  if (testEnv === 'DEV') return 8;
  if (testEnv === 'QA') return 47383;
  throw new Error(`Unsupported TEST_ENV="${testEnv}" for Furic promo medicine ID`);
}

test.describe('Merchant Portal | FindMyMeds Full Flow', () => {
  test(
    'E2E-10 | FindMyMeds Happy Path - Full Flow',
    {
      tag: ['@ui', '@merchant', '@positive', '@merchant-portal', '@e2e-10', '@workflow', '@hybrid', '@findmymeds', '@smoke'],
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
      const { patientAccessToken, orderId, bookingRef } = await createHybridOrder(api, {
        order: buildFindMyMedsHybridOrderInput({
          patientId: defaultPatientAccount.patientId,
          allowMissingBranchId: true,
        }),
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
        riderId: defaultRiderAccount.riderId,
      });

      // UI (merchant): prepare then set for pickup.
      await merchant.orderDetailsPage.prepareOrderForPickup();
      await merchant.orderDetailsPage.setOrderReadyForPickup({ dismissQR: false });

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
        riderId: assignedRiderId || defaultRiderAccount.riderId,
      });

      // UI (merchant): verify Completed in details + Orders > Completed tab.
      await merchant.ordersPage.verifyOrderCompletedInDetailsAndCompletedTab(bookingRef);
    }
  );

  test(
    'E2E-19 | FindMyMeds Happy Path - Furic Promo',
    {
      tag: ['@ui', '@merchant', '@positive', '@merchant-portal', '@e2e-19', '@workflow', '@hybrid', '@findmymeds', '@promo'],
      // Flow summary: patient creates FindMyMeds order with Furic promo medicine -> merchant accepts and verifies promo badge in UI ->
      // merchant uploads QR/updates prices/sends quote in UI -> patient pays -> admin confirms payment and assigns rider ->
      // pharmacist prepares and sets for pickup -> rider completes delivery -> patient rates rider ->
      // merchant verifies COMPLETED in details and Completed tab.
    },
    async ({ page, api }) => {
      const merchantPaymentQrImagePath = path.resolve('upload/images/qr1.png');
      const patientProofPaymentImagePath = path.resolve('upload/images/proof1.png');
      const riderPickupProofImagePath = path.resolve('upload/images/proofOfPickup.png');
      const riderDeliveryProofImagePath = path.resolve('upload/images/proofOfDelivery.png');
      const merchant = createMerchantPortalContext(page, { accountKey: 'e2e-pse01' });
      const furicMedicineId = resolveFuricMedicineId();

      // API (patient): create FindMyMeds order with Furic promo item (qty 5).
      const { patientAccessToken, orderId, bookingRef } = await createHybridOrder(api, {
        order: buildFindMyMedsHybridOrderInput({
          patientId: defaultPatientAccount.patientId,
          allowMissingBranchId: true,
          prescriptionItems: [
            {
              medicineId: furicMedicineId,
              quantity: 5,
              source: 'SEARCH',
              specialInstructions: 'Furic promo verification',
            },
          ],
        }),
      });

      // UI (merchant): login, accept order, assign branch, upload QR, update prices.
      await merchant.loginPage.open();
      await merchant.loginPage.login(merchant.account.username, merchant.account.password);
      await merchant.loginPage.assertSuccessLogin();

      await merchant.ordersPage.open();
      await merchant.ordersPage.openNewOrderByBookingRef(bookingRef);
      await merchant.orderDetailsPage.acceptOrder();
      await merchant.orderDetailsPage.assignBranchToFirstMatchingPharmacy('Pharmacy API');
      await merchant.orderDetailsPage.uploadQRCode(merchantPaymentQrImagePath);
      await merchant.orderDetailsPage.updatePriceItems([{ medicineId: furicMedicineId, quantity: 5, unitPrice: 100 }]);

      // UI (merchant): verify Furic promo badge is shown in quotation page, then send quote.
      await merchant.orderDetailsPage.verifyMedicinePromoBadge({
        medicineName: 'furic',
        freeQty: 2,
      });
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
        riderId: defaultRiderAccount.riderId,
      });

      // UI (merchant): prepare then set for pickup.
      await merchant.orderDetailsPage.prepareOrderForPickup();
      await merchant.orderDetailsPage.setOrderReadyForPickup({ dismissQR: false });

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
        riderId: assignedRiderId || defaultRiderAccount.riderId,
      });

      // UI (merchant): verify Completed in details + Orders > Completed tab.
      await merchant.ordersPage.verifyOrderCompletedInDetailsAndCompletedTab(bookingRef);
    }
  );

  test(
    'E2E-13 | FindMyMeds Happy Path - Rider starts while merchant prepares',
    {
      tag: ['@ui', '@merchant', '@positive', '@merchant-portal', '@e2e-13', '@workflow', '@hybrid', '@findmymeds'],
      // Flow summary: patient creates FindMyMeds order -> merchant accepts/uploads QR/updates prices/sends quote in UI ->
      // patient pays -> admin confirms payment and assigns rider -> rider starts and arrives at pharmacy ->
      // pharmacist prepares and sets for pickup -> rider completes delivery -> patient rates rider ->
      // merchant verifies COMPLETED in details and Completed tab.
    },
    async ({ page, api }) => {
      const merchantPaymentQrImagePath = path.resolve('upload/images/qr1.png');
      const patientProofPaymentImagePath = path.resolve('upload/images/proof1.png');
      const riderPickupProofImagePath = path.resolve('upload/images/proofOfPickup.png');
      const riderDeliveryProofImagePath = path.resolve('upload/images/proofOfDelivery.png');
      const merchant = createMerchantPortalContext(page, { accountKey: 'e2e-pse01' });

      // API (patient): create order.
      const { patientAccessToken, orderId, bookingRef } = await createHybridOrder(api, {
        order: buildFindMyMedsHybridOrderInput({
          patientId: defaultPatientAccount.patientId,
          allowMissingBranchId: true,
        }),
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
        riderId: defaultRiderAccount.riderId,
      });

      // API (rider): start and arrive while merchant is preparing.
      const { riderAccessToken, branchQR } = await startPickupAndArriveAtPharmacyAsRiderForHybrid(api, {
        orderId,
        branchId: paymentQRCodeBranchId,
        requireBranchQR: false,
      });

      // UI (merchant): prepare then set for pickup.
      await merchant.orderDetailsPage.prepareOrderForPickup();
      await merchant.orderDetailsPage.setOrderReadyForPickup({ dismissQR: false });

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
        branchId: paymentQRCodeBranchId,
        proof: { photo: pickupProofBlobName },
      });
      await pickupOrderAsRider(api, {
        riderAccessToken,
        orderId,
        branchId: paymentQRCodeBranchId,
        branchQR,
        requireBranchQR: false,
      });
      await arrivedAtDropOffAsRider(api, {
        riderAccessToken,
        orderId,
      });
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
      await completeOrderAsRider(api, {
        riderAccessToken,
        orderId,
      });

      // API (patient): rate rider.
      await rateRiderAsPatientForHybrid(api, {
        patientAccessToken,
        riderId: assignedRiderId || defaultRiderAccount.riderId,
      });

      // UI (merchant): verify Completed in details + Orders > Completed tab.
      await merchant.ordersPage.verifyOrderCompletedInDetailsAndCompletedTab(bookingRef);
    }
  );
});
