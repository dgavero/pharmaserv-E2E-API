import { test, expect } from '../../../globalConfig.api.js';
import path from 'node:path';
import { randomAlphanumeric, randomNum } from '../../../../helpers/globalTestUtils.js';
import { getPatientAccount, getRiderAccount } from '../../../helpers/roleCredentials.js';
import {
  buildMedexOrderInput,
  buildMedexIdentificationCardInput,
  buildMedexPrescriptionItems,
  getMedexTestEnv,
  MEDEX_BRANCH_ID,
  MEDEX_DELIVERY_PROOF_IMAGE_PATH,
  MEDEX_PICKUP_PROOF_IMAGE_PATH,
  MEDEX_PROOF_OF_PAYMENT_IMAGE_PATH,
  MEDEX_RX_ATTACHMENT_IMAGE_PATH,
  MEDEX_RX_PRESCRIPTION_IMAGE_PATH,
  MEDEX_SENIOR_CARD_BACK_IMAGE_PATH,
  MEDEX_SENIOR_CARD_FRONT_IMAGE_PATH,
  MEDEX_SENIOR_RX_ATTACHMENT_IMAGE_PATH,
} from './medex.testData.js';
import {
  confirmOrderAsMedex,
  confirmOrderAsMedexWithRx,
  loginMedex,
  setOrderForPickupAsMedex,
  setOrderForPickupAsMedexWithRx,
  waitForMedexQuoteToBeAcceptable,
} from './medex.actions.js';
import {
  getIdentificationCardUploadUrlAsPatient,
  removeIdentificationCardAsPatient,
  saveIdentificationCardAsPatient,
} from './medex.identificationCard.js';
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
  assertMedexSeniorPwdDiscountApplied,
  assertNoMedexSeniorPwdDiscount,
  getMedexOrderSummary,
  getMedexQuotedOrderItems,
  waitForMedexOrderIsAccepted,
} from './medex.orderCheck.js';

const defaultRiderAccount = getRiderAccount('default');
const defaultPatientAccount = getPatientAccount('default');
const MED_EX_HAPPY_PATH_MEDICINE_IDS = Object.freeze([62020, 54077, 57973, 57974]);
const MED_EX_HAPPY_PATH_QUANTITY = 5;

test.describe('GraphQL E2E Workflow: MedEx Happy Paths', () => {
  test(
    'PHARMA-594 | MEDEX Happy Path No RX',
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

      // Wait until patient order leaves NEW_ORDER before MedEx confirm.
      await waitForMedexOrderIsAccepted(api, { patientAccessToken, orderId });

      // MedEx: Login.
      const { medexAccessToken } = await loginMedex(api);
      // MedEx: Confirm Order.
      await confirmOrderAsMedex(api, { medexAccessToken, trackingCode });

      // Patient: Accept Quote.
      await waitForMedexQuoteToBeAcceptable(api, { patientAccessToken, orderId });
      const { orderSummary } = await getMedexOrderSummary(api, { patientAccessToken, orderId });
      assertNoMedexSeniorPwdDiscount(orderSummary);
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
    'PHARMA-595 | MEDEX Happy Path With RX',
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

      // Wait until patient order leaves NEW_ORDER before MedEx confirm.
      await waitForMedexOrderIsAccepted(api, { patientAccessToken, orderId });

      // MedEx: Login.
      const { medexAccessToken } = await loginMedex(api);
      // MedEx: Confirm Order.
      await confirmOrderAsMedexWithRx(api, { medexAccessToken, trackingCode });

      // Patient: Accept Quote.
      await waitForMedexQuoteToBeAcceptable(api, { patientAccessToken, orderId });
      const { orderSummary } = await getMedexOrderSummary(api, { patientAccessToken, orderId });
      assertNoMedexSeniorPwdDiscount(orderSummary);
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

  test(
    'PHARMA-597 | MEDEX Happy Path with Senior Card',
    {
      tag: ['@api', '@workflow', '@medex', '@patient', '@rider', '@admin', '@positive', '@pharma-597'],
    },
    async ({ api }) => {
      const testEnv = getMedexTestEnv();
      test.skip(testEnv !== 'QA', `MedEx workflow is QA-only. Current TEST_ENV=${testEnv}`);

      const seniorCardFrontImagePath = path.resolve(MEDEX_SENIOR_CARD_FRONT_IMAGE_PATH);
      const seniorCardBackImagePath = path.resolve(MEDEX_SENIOR_CARD_BACK_IMAGE_PATH);
      const patientProofPaymentImagePath = path.resolve(MEDEX_PROOF_OF_PAYMENT_IMAGE_PATH);
      const pickupProofImagePath = path.resolve(MEDEX_PICKUP_PROOF_IMAGE_PATH);
      const deliveryProofImagePath = path.resolve(MEDEX_DELIVERY_PROOF_IMAGE_PATH);
      const submittedPrescriptionItems = buildMedexPrescriptionItems({
        medicineIds: [57973],
        quantity: MED_EX_HAPPY_PATH_QUANTITY,
      });
      const expectedQuotedItems = [
        { medicineId: 57973, quantity: MED_EX_HAPPY_PATH_QUANTITY, zeroTotal: false },
      ];
      const seniorCardSuffix = randomNum(6);
      let identificationCardId = null;
      let primaryError = null;

      // Patient: Login.
      const { patientAccessToken } = await loginPatient(api, { accountKey: 'default' });
      try {
        // Patient: Get Identification Card Front Upload URL.
        const { identificationCardUploadUrl: seniorCardFrontUploadUrl, identificationCardBlobName: seniorCardFrontBlobName } =
          await getIdentificationCardUploadUrlAsPatient(api, { patientAccessToken });
        // Patient: Upload Senior Card Front.
        await uploadImageToSignedUrl(api, {
          uploadUrl: seniorCardFrontUploadUrl,
          imagePath: seniorCardFrontImagePath,
        });
        // Patient: Get Identification Card Back Upload URL.
        const { identificationCardUploadUrl: seniorCardBackUploadUrl, identificationCardBlobName: seniorCardBackBlobName } =
          await getIdentificationCardUploadUrlAsPatient(api, { patientAccessToken });
        // Patient: Upload Senior Card Back.
        await uploadImageToSignedUrl(api, {
          uploadUrl: seniorCardBackUploadUrl,
          imagePath: seniorCardBackImagePath,
        });
        // Patient: Save Senior Card.
        const savedIdentificationCard = await saveIdentificationCardAsPatient(api, {
          patientAccessToken,
          patientId: defaultPatientAccount.patientId,
          identificationCard: buildMedexIdentificationCardInput({
            cardType: 'Senior ID',
            name: 'QA Senior Card',
            cardId: seniorCardSuffix,
            frontPhoto: seniorCardFrontBlobName,
            backPhoto: seniorCardBackBlobName,
          }),
        });
        identificationCardId = savedIdentificationCard.identificationCardId;
        // Patient: Submit Order.
        const { orderId, submitOrderNode } = await submitOrderAsPatient(api, {
          patientAccessToken,
          order: buildMedexOrderInput({
            identificationCardIds: [identificationCardId],
            prescriptionItems: submittedPrescriptionItems,
          }),
        });
        const trackingCode = submitOrderNode?.trackingCode;
        expect(trackingCode, 'Missing trackingCode from patient submit order response').toBeTruthy();

        await waitForMedexOrderIsAccepted(api, { patientAccessToken, orderId });

        // MedEx: Login.
        const { medexAccessToken } = await loginMedex(api);
        // MedEx: Confirm Order.
        await confirmOrderAsMedex(api, { medexAccessToken, trackingCode });

        // Patient: Accept Quote.
        await waitForMedexQuoteToBeAcceptable(api, { patientAccessToken, orderId });
        const { orderSummary } = await getMedexOrderSummary(api, { patientAccessToken, orderId });
        assertMedexSeniorPwdDiscountApplied(orderSummary);
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
      } catch (error) {
        primaryError = error;
        throw error;
      } finally {
        if (identificationCardId) {
          try {
            await removeIdentificationCardAsPatient(api, {
              patientAccessToken,
              identificationCardId,
            });
          } catch (cleanupError) {
            if (primaryError) {
              console.error(
                `[MEDEX CLEANUP] Failed to remove identification card ${identificationCardId}: ${cleanupError?.message || cleanupError}`
              );
            } else {
              throw cleanupError;
            }
          }
        }
      }
    }
  );

  test(
    'PHARMA-598 | MEDEX Happy Path with Senior Card and RX',
    {
      tag: ['@api', '@workflow', '@medex', '@patient', '@rider', '@admin', '@positive', '@pharma-598'],
    },
    async ({ api }) => {
      const testEnv = getMedexTestEnv();
      test.skip(testEnv !== 'QA', `MedEx workflow is QA-only. Current TEST_ENV=${testEnv}`);

      const seniorCardFrontImagePath = path.resolve(MEDEX_SENIOR_CARD_FRONT_IMAGE_PATH);
      const seniorCardBackImagePath = path.resolve(MEDEX_SENIOR_CARD_BACK_IMAGE_PATH);
      const attachmentImagePath = path.resolve(MEDEX_SENIOR_RX_ATTACHMENT_IMAGE_PATH);
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
      const seniorCardSuffix = randomNum(6);
      let identificationCardId = null;
      let primaryError = null;

      // Patient: Login.
      const { patientAccessToken } = await loginPatient(api, { accountKey: 'default' });
      try {
        // Patient: Get Identification Card Front Upload URL.
        const { identificationCardUploadUrl: seniorCardFrontUploadUrl, identificationCardBlobName: seniorCardFrontBlobName } =
          await getIdentificationCardUploadUrlAsPatient(api, { patientAccessToken });
        // Patient: Upload Senior Card Front.
        await uploadImageToSignedUrl(api, {
          uploadUrl: seniorCardFrontUploadUrl,
          imagePath: seniorCardFrontImagePath,
        });
        // Patient: Get Identification Card Back Upload URL.
        const { identificationCardUploadUrl: seniorCardBackUploadUrl, identificationCardBlobName: seniorCardBackBlobName } =
          await getIdentificationCardUploadUrlAsPatient(api, { patientAccessToken });
        // Patient: Upload Senior Card Back.
        await uploadImageToSignedUrl(api, {
          uploadUrl: seniorCardBackUploadUrl,
          imagePath: seniorCardBackImagePath,
        });
        // Patient: Save Senior Card.
        const savedIdentificationCard = await saveIdentificationCardAsPatient(api, {
          patientAccessToken,
          patientId: defaultPatientAccount.patientId,
          identificationCard: buildMedexIdentificationCardInput({
            cardType: 'Senior ID',
            name: 'QA Senior Card',
            cardId: seniorCardSuffix,
            frontPhoto: seniorCardFrontBlobName,
            backPhoto: seniorCardBackBlobName,
          }),
        });
        identificationCardId = savedIdentificationCard.identificationCardId;
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
            identificationCardIds: [identificationCardId],
            prescriptionItems: submittedPrescriptionItems,
            attachmentBlobName,
          }),
        });
        const trackingCode = submitOrderNode?.trackingCode;
        expect(trackingCode, 'Missing trackingCode from patient submit order response').toBeTruthy();

        await waitForMedexOrderIsAccepted(api, { patientAccessToken, orderId });

        // MedEx: Login.
        const { medexAccessToken } = await loginMedex(api);
        // MedEx: Confirm Order.
        await confirmOrderAsMedexWithRx(api, { medexAccessToken, trackingCode });

        // Patient: Accept Quote.
        await waitForMedexQuoteToBeAcceptable(api, { patientAccessToken, orderId });
        const { orderSummary } = await getMedexOrderSummary(api, { patientAccessToken, orderId });
        assertMedexSeniorPwdDiscountApplied(orderSummary);
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
      } catch (error) {
        primaryError = error;
        throw error;
      } finally {
        if (identificationCardId) {
          try {
            await removeIdentificationCardAsPatient(api, {
              patientAccessToken,
              identificationCardId,
            });
          } catch (cleanupError) {
            if (primaryError) {
              console.error(
                `[MEDEX CLEANUP] Failed to remove identification card ${identificationCardId}: ${cleanupError?.message || cleanupError}`
              );
            } else {
              throw cleanupError;
            }
          }
        }
      }
    }
  );

  test(
    'PHARMA-599 | MEDEX Happy Path with PWD Card',
    {
      tag: ['@api', '@workflow', '@medex', '@patient', '@rider', '@admin', '@positive', '@pharma-599'],
    },
    async ({ api }) => {
      const testEnv = getMedexTestEnv();
      test.skip(testEnv !== 'QA', `MedEx workflow is QA-only. Current TEST_ENV=${testEnv}`);

      const pwdCardFrontImagePath = path.resolve(MEDEX_SENIOR_CARD_FRONT_IMAGE_PATH);
      const pwdCardBackImagePath = path.resolve(MEDEX_SENIOR_CARD_BACK_IMAGE_PATH);
      const patientProofPaymentImagePath = path.resolve(MEDEX_PROOF_OF_PAYMENT_IMAGE_PATH);
      const pickupProofImagePath = path.resolve(MEDEX_PICKUP_PROOF_IMAGE_PATH);
      const deliveryProofImagePath = path.resolve(MEDEX_DELIVERY_PROOF_IMAGE_PATH);
      const submittedPrescriptionItems = buildMedexPrescriptionItems({
        medicineIds: [57973],
        quantity: MED_EX_HAPPY_PATH_QUANTITY,
      });
      const expectedQuotedItems = [
        { medicineId: 57973, quantity: MED_EX_HAPPY_PATH_QUANTITY, zeroTotal: false },
      ];
      const pwdCardSuffix = randomNum(6);
      let identificationCardId = null;
      let primaryError = null;

      // Patient: Login.
      const { patientAccessToken } = await loginPatient(api, { accountKey: 'default' });
      try {
        // Patient: Get Identification Card Front Upload URL.
        const { identificationCardUploadUrl: pwdCardFrontUploadUrl, identificationCardBlobName: pwdCardFrontBlobName } =
          await getIdentificationCardUploadUrlAsPatient(api, { patientAccessToken });
        // Patient: Upload PWD Card Front.
        await uploadImageToSignedUrl(api, {
          uploadUrl: pwdCardFrontUploadUrl,
          imagePath: pwdCardFrontImagePath,
        });
        // Patient: Get Identification Card Back Upload URL.
        const { identificationCardUploadUrl: pwdCardBackUploadUrl, identificationCardBlobName: pwdCardBackBlobName } =
          await getIdentificationCardUploadUrlAsPatient(api, { patientAccessToken });
        // Patient: Upload PWD Card Back.
        await uploadImageToSignedUrl(api, {
          uploadUrl: pwdCardBackUploadUrl,
          imagePath: pwdCardBackImagePath,
        });
        // Patient: Save PWD Card.
        const savedIdentificationCard = await saveIdentificationCardAsPatient(api, {
          patientAccessToken,
          patientId: defaultPatientAccount.patientId,
          identificationCard: buildMedexIdentificationCardInput({
            cardType: 'PWD ID',
            name: 'QA PWD Card',
            cardId: pwdCardSuffix,
            frontPhoto: pwdCardFrontBlobName,
            backPhoto: pwdCardBackBlobName,
          }),
        });
        identificationCardId = savedIdentificationCard.identificationCardId;
        // Patient: Submit Order.
        const { orderId, submitOrderNode } = await submitOrderAsPatient(api, {
          patientAccessToken,
          order: buildMedexOrderInput({
            identificationCardIds: [identificationCardId],
            prescriptionItems: submittedPrescriptionItems,
          }),
        });
        const trackingCode = submitOrderNode?.trackingCode;
        expect(trackingCode, 'Missing trackingCode from patient submit order response').toBeTruthy();

        await waitForMedexOrderIsAccepted(api, { patientAccessToken, orderId });

        // MedEx: Login.
        const { medexAccessToken } = await loginMedex(api);
        // MedEx: Confirm Order.
        await confirmOrderAsMedex(api, { medexAccessToken, trackingCode });

        // Patient: Accept Quote.
        await waitForMedexQuoteToBeAcceptable(api, { patientAccessToken, orderId });
        const { orderSummary } = await getMedexOrderSummary(api, { patientAccessToken, orderId });
        assertMedexSeniorPwdDiscountApplied(orderSummary);
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
      } catch (error) {
        primaryError = error;
        throw error;
      } finally {
        if (identificationCardId) {
          try {
            await removeIdentificationCardAsPatient(api, {
              patientAccessToken,
              identificationCardId,
            });
          } catch (cleanupError) {
            if (primaryError) {
              console.error(
                `[MEDEX CLEANUP] Failed to remove identification card ${identificationCardId}: ${cleanupError?.message || cleanupError}`
              );
            } else {
              throw cleanupError;
            }
          }
        }
      }
    }
  );

});
