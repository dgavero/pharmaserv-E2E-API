import { test, expect } from '../../../globalConfig.api.js';
import path from 'node:path';
import { getRiderAccount } from '../../../helpers/roleCredentials.js';
import {
  buildMedexOrderInput,
  buildMedexPrescriptionItems,
  getMedexTestEnv,
  MEDEX_BRANCH_ID,
  MEDEX_DELIVERY_PROOF_IMAGE_PATH,
  MEDEX_PICKUP_PROOF_IMAGE_PATH,
  MEDEX_PROOF_OF_PAYMENT_IMAGE_PATH,
  MEDEX_RX_ATTACHMENT_IMAGE_PATH,
  MEDEX_RX_PRESCRIPTION_IMAGE_PATH,
} from './medex.testData.js';
import {
  acceptQuoteAsPatientForMedex,
  confirmOrderAsMedex,
  confirmOrderAsMedexWithRx,
  loginMedex,
  setOrderForPickupAsMedex,
  setOrderForPickupAsMedexWithRx,
} from './medex.client.js';
import {
  getAttachmentUploadUrlAsPatient,
  getPrescriptionUploadUrlAsPatient,
  loginPatient,
  savePrescriptionAsPatient,
  submitOrderAsPatient,
  getProofOfPaymentUploadUrlAsPatient,
  payOrderAsPatient,
  rateRiderAsPatient,
  uploadImageToSignedUrl,
} from '../shared/steps/patient.steps.js';
import { loginAdmin, assignRiderToOrderAsAdmin } from '../shared/steps/admin.steps.js';
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
} from '../shared/steps/rider.steps.js';
import {
  assertMedexQuotedOrderItems,
  getMedexQuotedOrderItems,
} from './medex.orderCheck.js';

const defaultRiderAccount = getRiderAccount('default');
const MEDEX_PRE_LOGIN_WAIT_MS = 30_000;
const MEDEX_ACCEPT_QUOTE_RETRY_WAIT_MS = 30_000;
const MED_EX_HAPPY_PATH_MEDICINE_IDS = Object.freeze([62020, 54077, 57973, 57974]);
const MED_EX_HAPPY_PATH_QUANTITY = 5;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

test.describe('GraphQL E2E Workflow: MedEx Happy Paths', () => {
  test(
    'PHARMA-594 | MedEx happy path no RX from patient order to rider completion',
    {
      tag: ['@api', '@workflow', '@medex', '@patient', '@rider', '@admin', '@positive', '@pharma-594'],
    },
    async ({ api }) => {
      const testEnv = getMedexTestEnv();
      test.skip(testEnv !== 'QA', `MedEx workflow is QA-only. Current TEST_ENV=${testEnv}`);

      const patientProofPaymentImagePath = path.resolve(MEDEX_PROOF_OF_PAYMENT_IMAGE_PATH);
      const pickupProofImagePath = path.resolve(MEDEX_PICKUP_PROOF_IMAGE_PATH);
      const deliveryProofImagePath = path.resolve(MEDEX_DELIVERY_PROOF_IMAGE_PATH);
      const submittedPrescriptionItems = buildMedexPrescriptionItems({
        medicineIds: MED_EX_HAPPY_PATH_MEDICINE_IDS,
        quantity: MED_EX_HAPPY_PATH_QUANTITY,
      });
      const expectedQuotedItems = [
        { medicineId: 57973, quantity: MED_EX_HAPPY_PATH_QUANTITY, zeroTotal: false },
        { medicineId: 54077, zeroTotal: true },
        { medicineId: 57974, zeroTotal: true },
        { medicineId: 62020, zeroTotal: true },
      ];

      // Patient: Login.
      const { patientAccessToken } = await loginPatient(api, { accountKey: 'default' });
      // Patient: Submit Order.
      const { orderId, submitOrderNode } = await submitOrderAsPatient(api, {
        patientAccessToken,
        order: buildMedexOrderInput({
          prescriptionItems: submittedPrescriptionItems,
        }),
      });
      const trackingCode = submitOrderNode?.trackingCode;
      expect(trackingCode, 'Missing trackingCode from patient submit order response').toBeTruthy();

      // MedEx flow requires a fixed wait before the external MedEx login/confirm sequence becomes usable.
      await wait(MEDEX_PRE_LOGIN_WAIT_MS);

      // MedEx: Login.
      const { medexAccessToken } = await loginMedex(api);
      // MedEx: Confirm Order.
      await confirmOrderAsMedex(api, { medexAccessToken, trackingCode });

      // Patient: Accept Quote.
      let acceptQuoteResult = await acceptQuoteAsPatientForMedex(api, { patientAccessToken, orderId });
      if (acceptQuoteResult.quoteNotSent) {
        await wait(MEDEX_ACCEPT_QUOTE_RETRY_WAIT_MS);
        acceptQuoteResult = await acceptQuoteAsPatientForMedex(api, { patientAccessToken, orderId });
      }
      expect(acceptQuoteResult.quoteNotSent, 'Patient accept quote failed after MedEx retry wait').toBe(false);
      const medexQuotedItems = await getMedexQuotedOrderItems(api, { patientAccessToken, orderId });
      assertMedexQuotedOrderItems(medexQuotedItems, expectedQuotedItems);
      // Patient: Get Proof of Payment Upload URL.
      const { proofOfPaymentUploadUrl, proofOfPaymentBlobName } = await getProofOfPaymentUploadUrlAsPatient(api, {
        patientAccessToken,
      });
      // Patient: Upload Proof of Payment.
      await uploadImageToSignedUrl(api, {
        uploadUrl: proofOfPaymentUploadUrl,
        imagePath: patientProofPaymentImagePath,
      });
      // Patient: Pay Order.
      await payOrderAsPatient(api, {
        patientAccessToken,
        orderId,
        proof: { photo: proofOfPaymentBlobName },
      });

      // MedEx: Set For Pickup.
      await setOrderForPickupAsMedex(api, { medexAccessToken, trackingCode });

      // Admin: Login.
      const { adminAccessToken } = await loginAdmin(api, { accountKey: 'default' });
      // Admin: Assign Rider To Order.
      const { assignedRiderId } = await assignRiderToOrderAsAdmin(api, {
        adminAccessToken,
        orderId,
        riderId: defaultRiderAccount.riderId,
      });

      // Rider: Login.
      const { riderAccessToken } = await loginRider(api, { accountKey: 'default' });
      // Rider: Start Pickup Order.
      await startPickupOrderAsRider(api, { riderAccessToken, orderId });
      // Rider: Arrived at Pharmacy.
      const { branchQR } = await arrivedAtPharmacyAsRider(api, {
        riderAccessToken,
        orderId,
        branchId: MEDEX_BRANCH_ID,
        requireBranchQR: false,
      });
      // Rider: Get Pickup Proof Upload URL.
      const { pickupProofUploadUrl, pickupProofBlobName } = await getPickupProofUploadUrlAsRider(api, {
        riderAccessToken,
      });
      // Rider: Upload Pickup Proof.
      await uploadImageToSignedUrl(api, {
        uploadUrl: pickupProofUploadUrl,
        imagePath: pickupProofImagePath,
      });
      // Rider: Set Pickup Proof.
      await setPickupProofAsRider(api, {
        riderAccessToken,
        orderId,
        branchId: MEDEX_BRANCH_ID,
        proof: { photo: pickupProofBlobName },
      });
      // Rider: Pickup Order.
      await pickupOrderAsRider(api, {
        riderAccessToken,
        orderId,
        branchId: MEDEX_BRANCH_ID,
        branchQR,
        requireBranchQR: false,
      });
      // Rider: Arrived at Drop Off.
      await arrivedAtDropOffAsRider(api, { riderAccessToken, orderId });
      // Rider: Get Delivery Proof Upload URL.
      const { deliveryProofUploadUrl, deliveryProofBlobName } = await getDeliveryProofUploadUrlAsRider(api, {
        riderAccessToken,
      });
      // Rider: Upload Delivery Proof.
      await uploadImageToSignedUrl(api, {
        uploadUrl: deliveryProofUploadUrl,
        imagePath: deliveryProofImagePath,
      });
      // Rider: Set Delivery Proof.
      await setDeliveryProofAsRider(api, {
        riderAccessToken,
        orderId,
        proof: { photo: deliveryProofBlobName },
      });
      // Rider: Complete Order.
      await completeOrderAsRider(api, { riderAccessToken, orderId });
      // Patient: Rate Rider.
      await rateRiderAsPatient(api, {
        patientAccessToken,
        riderId: assignedRiderId || defaultRiderAccount.riderId,
      });
    }
  );

  test(
    'PHARMA-595 | MedEx happy path with RX from patient order to rider completion',
    {
      tag: ['@api', '@workflow', '@medex', '@patient', '@rider', '@admin', '@positive', '@pharma-595'],
    },
    async ({ api }) => {
      const testEnv = getMedexTestEnv();
      test.skip(testEnv !== 'QA', `MedEx workflow is QA-only. Current TEST_ENV=${testEnv}`);

      const attachmentImagePath = path.resolve(MEDEX_RX_ATTACHMENT_IMAGE_PATH);
      const patientProofPaymentImagePath = path.resolve(MEDEX_PROOF_OF_PAYMENT_IMAGE_PATH);
      const pickupProofImagePath = path.resolve(MEDEX_PICKUP_PROOF_IMAGE_PATH);
      const deliveryProofImagePath = path.resolve(MEDEX_DELIVERY_PROOF_IMAGE_PATH);
      const submittedPrescriptionItems = buildMedexPrescriptionItems({
        medicineIds: MED_EX_HAPPY_PATH_MEDICINE_IDS,
        quantity: MED_EX_HAPPY_PATH_QUANTITY,
      });
      const expectedQuotedItems = [
        { medicineId: 57973, quantity: MED_EX_HAPPY_PATH_QUANTITY, zeroTotal: false },
        { medicineId: 54077, quantity: MED_EX_HAPPY_PATH_QUANTITY, zeroTotal: false },
        { medicineId: 57974, zeroTotal: true },
        { medicineId: 62020, zeroTotal: true },
      ];

      // Patient: Login.
      const { patientAccessToken } = await loginPatient(api, { accountKey: 'default' });
      // Patient: Get Attachment Upload URL.
      const { attachmentUploadUrl, attachmentBlobName } = await getAttachmentUploadUrlAsPatient(api, {
        patientAccessToken,
      });
      // Patient: Upload RX attachment.
      await uploadImageToSignedUrl(api, {
        uploadUrl: attachmentUploadUrl,
        imagePath: attachmentImagePath,
      });
      // Patient: Submit Order.
      const { orderId, submitOrderNode } = await submitOrderAsPatient(api, {
        patientAccessToken,
        order: buildMedexOrderInput({
          prescriptionItems: submittedPrescriptionItems,
          attachmentBlobName,
        }),
      });
      const trackingCode = submitOrderNode?.trackingCode;
      expect(trackingCode, 'Missing trackingCode from patient submit order response').toBeTruthy();

      // MedEx flow requires a fixed wait before the external MedEx login/confirm sequence becomes usable.
      await wait(MEDEX_PRE_LOGIN_WAIT_MS);

      // MedEx: Login.
      const { medexAccessToken } = await loginMedex(api);
      // MedEx: Confirm Order.
      await confirmOrderAsMedexWithRx(api, { medexAccessToken, trackingCode });

      // Patient: Accept Quote.
      let acceptQuoteResult = await acceptQuoteAsPatientForMedex(api, { patientAccessToken, orderId });
      if (acceptQuoteResult.quoteNotSent) {
        await wait(MEDEX_ACCEPT_QUOTE_RETRY_WAIT_MS);
        acceptQuoteResult = await acceptQuoteAsPatientForMedex(api, { patientAccessToken, orderId });
      }
      expect(acceptQuoteResult.quoteNotSent, 'Patient accept quote failed after MedEx retry wait').toBe(false);
      const medexQuotedItems = await getMedexQuotedOrderItems(api, { patientAccessToken, orderId });
      assertMedexQuotedOrderItems(medexQuotedItems, expectedQuotedItems);
      // Patient: Get Proof of Payment Upload URL.
      const { proofOfPaymentUploadUrl, proofOfPaymentBlobName } = await getProofOfPaymentUploadUrlAsPatient(api, {
        patientAccessToken,
      });
      // Patient: Upload Proof of Payment.
      await uploadImageToSignedUrl(api, {
        uploadUrl: proofOfPaymentUploadUrl,
        imagePath: patientProofPaymentImagePath,
      });
      // Patient: Pay Order.
      await payOrderAsPatient(api, {
        patientAccessToken,
        orderId,
        proof: { photo: proofOfPaymentBlobName },
      });

      // MedEx: Set For Pickup.
      await setOrderForPickupAsMedexWithRx(api, { medexAccessToken, trackingCode });

      // Admin: Login.
      const { adminAccessToken } = await loginAdmin(api, { accountKey: 'default' });
      // Admin: Assign Rider To Order.
      const { assignedRiderId } = await assignRiderToOrderAsAdmin(api, {
        adminAccessToken,
        orderId,
        riderId: defaultRiderAccount.riderId,
      });

      // Rider: Login.
      const { riderAccessToken } = await loginRider(api, { accountKey: 'default' });
      // Rider: Start Pickup Order.
      await startPickupOrderAsRider(api, { riderAccessToken, orderId });
      // Rider: Arrived at Pharmacy.
      const { branchQR } = await arrivedAtPharmacyAsRider(api, {
        riderAccessToken,
        orderId,
        branchId: MEDEX_BRANCH_ID,
        requireBranchQR: false,
      });
      // Rider: Get Pickup Proof Upload URL.
      const { pickupProofUploadUrl, pickupProofBlobName } = await getPickupProofUploadUrlAsRider(api, {
        riderAccessToken,
      });
      // Rider: Upload Pickup Proof.
      await uploadImageToSignedUrl(api, {
        uploadUrl: pickupProofUploadUrl,
        imagePath: pickupProofImagePath,
      });
      // Rider: Set Pickup Proof.
      await setPickupProofAsRider(api, {
        riderAccessToken,
        orderId,
        branchId: MEDEX_BRANCH_ID,
        proof: { photo: pickupProofBlobName },
      });
      // Rider: Pickup Order.
      await pickupOrderAsRider(api, {
        riderAccessToken,
        orderId,
        branchId: MEDEX_BRANCH_ID,
        branchQR,
        requireBranchQR: false,
      });
      // Rider: Arrived at Drop Off.
      await arrivedAtDropOffAsRider(api, { riderAccessToken, orderId });
      // Rider: Get Delivery Proof Upload URL.
      const { deliveryProofUploadUrl, deliveryProofBlobName } = await getDeliveryProofUploadUrlAsRider(api, {
        riderAccessToken,
      });
      // Rider: Upload Delivery Proof.
      await uploadImageToSignedUrl(api, {
        uploadUrl: deliveryProofUploadUrl,
        imagePath: deliveryProofImagePath,
      });
      // Rider: Set Delivery Proof.
      await setDeliveryProofAsRider(api, {
        riderAccessToken,
        orderId,
        proof: { photo: deliveryProofBlobName },
      });
      // Rider: Complete Order.
      await completeOrderAsRider(api, { riderAccessToken, orderId });
      // Patient: Rate Rider.
      await rateRiderAsPatient(api, {
        patientAccessToken,
        riderId: assignedRiderId || defaultRiderAccount.riderId,
      });
    }
  );

});
