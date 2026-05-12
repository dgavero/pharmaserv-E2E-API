import path from 'node:path';
import { test, expect } from '../../../globalConfig.api.js';
import { randomAlphanumeric, randomNum } from '../../../../helpers/globalTestUtils.js';
import { getPatientAccount, getRiderAccount } from '../../../helpers/roleCredentials.js';
import {
  MEDEX_BRANCH_ID,
  buildMedexIdentificationCardInput,
  buildMedexOrderInput,
  buildMedexPrescriptionItems,
  getMedexTestEnv,
  MEDEX_DELIVERY_PROOF_IMAGE_PATH,
  MEDEX_PICKUP_PROOF_IMAGE_PATH,
  MEDEX_PROOF_OF_PAYMENT_IMAGE_PATH,
  MEDEX_SENIOR_CARD_BACK_IMAGE_PATH,
  MEDEX_SENIOR_CARD_FRONT_IMAGE_PATH,
} from './medex.testData.js';
import {
  cancelOrderAsMedex,
  cancelOrderAsPatientForMedex,
  confirmOrderAsMedex,
  loginMedex,
  setOrderForPickupAsMedex,
  waitForMedexQuoteToBeAcceptable,
} from './medex.actions.js';
import { MEDEX_CANCEL_ORDER_PAYLOAD } from './medex.queries.js';
import {
  getIdentificationCardUploadUrlAsPatient,
  removeIdentificationCardAsPatient,
  saveIdentificationCardAsPatient,
} from './medex.identificationCard.js';
import {
  getProofOfPaymentUploadUrlAsPatient,
  loginPatient,
  payOrderAsPatient,
  rateRiderAsPatient,
  submitOrderAsPatient,
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
  assertNoMedexSeniorPwdDiscount,
  getMedexOrderDetail,
  getMedexOrderHistoryEntry,
  getMedexOrderSummary,
  waitForMedexOrderIsAccepted,
} from './medex.orderCheck.js';

const defaultPatientAccount = getPatientAccount('default');
const defaultRiderAccount = getRiderAccount('default');
const MED_EX_HAPPY_PATH_QUANTITY = 5;

test.describe('GraphQL E2E Workflow: MedEx Negative Paths', () => {
  test(
    'PHARMA-600 | MEDEX Edge Case With Incorect Senior/PWD Card',
    {
      tag: ['@api', '@workflow', '@medex', '@patient', '@negative', '@edgecase', '@pharma-600'],
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
      const invalidSeniorCardSuffix = randomAlphanumeric(5);
      const seniorCardIdSuffix = randomNum(6);
      let identificationCardId = null;
      let primaryError = null;

      const { patientAccessToken } = await loginPatient(api, { accountKey: 'default' });

      try {
        const {
          identificationCardUploadUrl: seniorCardFrontUploadUrl,
          identificationCardBlobName: seniorCardFrontBlobName,
        } = await getIdentificationCardUploadUrlAsPatient(api, { patientAccessToken });
        await uploadImageToSignedUrl(api, {
          uploadUrl: seniorCardFrontUploadUrl,
          imagePath: seniorCardFrontImagePath,
        });

        const {
          identificationCardUploadUrl: seniorCardBackUploadUrl,
          identificationCardBlobName: seniorCardBackBlobName,
        } = await getIdentificationCardUploadUrlAsPatient(api, { patientAccessToken });
        await uploadImageToSignedUrl(api, {
          uploadUrl: seniorCardBackUploadUrl,
          imagePath: seniorCardBackImagePath,
        });

        const savedIdentificationCard = await saveIdentificationCardAsPatient(api, {
          patientAccessToken,
          patientId: defaultPatientAccount.patientId,
          identificationCard: buildMedexIdentificationCardInput({
            cardType: `PWD ID-${invalidSeniorCardSuffix}`,
            name: 'QA Invalid Senior/PWD Card',
            cardId: seniorCardIdSuffix,
            frontPhoto: seniorCardFrontBlobName,
            backPhoto: seniorCardBackBlobName,
          }),
        });
        identificationCardId = savedIdentificationCard.identificationCardId;

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

        const { medexAccessToken } = await loginMedex(api);
        await confirmOrderAsMedex(api, { medexAccessToken, trackingCode });

        await waitForMedexQuoteToBeAcceptable(api, { patientAccessToken, orderId });

        const { orderNode, orderSummary } = await getMedexOrderSummary(api, { patientAccessToken, orderId });
        assertNoMedexSeniorPwdDiscount(orderSummary);
        expect(orderNode?.status, 'Missing patient order status after accept quote').toBe('QUOTE_ACCEPTED');

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

        await setOrderForPickupAsMedex(api, { medexAccessToken, trackingCode });

        const { adminAccessToken } = await loginAdmin(api, { accountKey: 'default' });
        const { assignedRiderId } = await assignRiderToOrderAsAdmin(api, {
          adminAccessToken,
          orderId,
          riderId: defaultRiderAccount.riderId,
        });

        const { riderAccessToken } = await loginRider(api, { accountKey: 'default' });
        await startPickupOrderAsRider(api, { riderAccessToken, orderId });
        const { branchQR } = await arrivedAtPharmacyAsRider(api, {
          riderAccessToken,
          orderId,
          branchId: MEDEX_BRANCH_ID,
          requireBranchQR: false,
        });
        const { pickupProofUploadUrl, pickupProofBlobName } = await getPickupProofUploadUrlAsRider(api, {
          riderAccessToken,
        });
        await uploadImageToSignedUrl(api, {
          uploadUrl: pickupProofUploadUrl,
          imagePath: pickupProofImagePath,
        });
        await setPickupProofAsRider(api, {
          riderAccessToken,
          orderId,
          branchId: MEDEX_BRANCH_ID,
          proof: { photo: pickupProofBlobName },
        });
        await pickupOrderAsRider(api, {
          riderAccessToken,
          orderId,
          branchId: MEDEX_BRANCH_ID,
          branchQR,
          requireBranchQR: false,
        });
        await arrivedAtDropOffAsRider(api, { riderAccessToken, orderId });
        const { deliveryProofUploadUrl, deliveryProofBlobName } = await getDeliveryProofUploadUrlAsRider(api, {
          riderAccessToken,
        });
        await uploadImageToSignedUrl(api, {
          uploadUrl: deliveryProofUploadUrl,
          imagePath: deliveryProofImagePath,
        });
        await setDeliveryProofAsRider(api, {
          riderAccessToken,
          orderId,
          proof: { photo: deliveryProofBlobName },
        });
        await completeOrderAsRider(api, { riderAccessToken, orderId });
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
    'PHARMA-601 | MEDEX Webhook Cancel Order',
    {
      tag: ['@api', '@workflow', '@medex', '@patient', '@negative', '@pharma-601'],
    },
    async ({ api }) => {
      const testEnv = getMedexTestEnv();
      test.skip(testEnv !== 'QA', `MedEx workflow is QA-only. Current TEST_ENV=${testEnv}`);

      const submittedPrescriptionItems = buildMedexPrescriptionItems({
        medicineIds: [57973],
        quantity: MED_EX_HAPPY_PATH_QUANTITY,
      });

      const { patientAccessToken } = await loginPatient(api, { accountKey: 'default' });
      const { orderId, submitOrderNode } = await submitOrderAsPatient(api, {
        patientAccessToken,
        order: buildMedexOrderInput({
          prescriptionItems: submittedPrescriptionItems,
        }),
      });
      const trackingCode = submitOrderNode?.trackingCode;
      expect(trackingCode, 'Missing trackingCode from patient submit order response').toBeTruthy();

      await waitForMedexOrderIsAccepted(api, { patientAccessToken, orderId });

      const { medexAccessToken } = await loginMedex(api);
      await confirmOrderAsMedex(api, { medexAccessToken, trackingCode });
      await cancelOrderAsMedex(api, { medexAccessToken, trackingCode });

      const postCancelOrderNode = await getMedexOrderDetail(api, { patientAccessToken, orderId });
      const postCancelHistoryEntry = await getMedexOrderHistoryEntry(api, { patientAccessToken, orderId });

      expect(postCancelOrderNode?.status, 'Expected patient order status to become CANCELLED after MedEx webhook cancel').toBe(
        'CANCELLED'
      );
      expect(postCancelHistoryEntry, 'Missing patient order history entry after MedEx webhook cancel').toBeTruthy();
      expect(
        postCancelHistoryEntry?.status,
        'Expected patient order history status to become CANCELLED after MedEx webhook cancel'
      ).toBe('CANCELLED');
      expect(
        String(postCancelHistoryEntry?.reasonForDeclining || ''),
        'Expected MedEx webhook cancel reason to match the MedEx cancel remarks'
      ).toBe(MEDEX_CANCEL_ORDER_PAYLOAD.REMARKS);
    }
  );

  test(
    'PHARMA-602 | MEDEX Patient Cancel Order',
    {
      tag: ['@api', '@workflow', '@medex', '@patient', '@negative', '@pharma-602'],
    },
    async ({ api }) => {
      const testEnv = getMedexTestEnv();
      test.skip(testEnv !== 'QA', `MedEx workflow is QA-only. Current TEST_ENV=${testEnv}`);

      const submittedPrescriptionItems = buildMedexPrescriptionItems({
        medicineIds: [57973],
        quantity: MED_EX_HAPPY_PATH_QUANTITY,
      });

      const { patientAccessToken } = await loginPatient(api, { accountKey: 'default' });
      const { orderId, submitOrderNode } = await submitOrderAsPatient(api, {
        patientAccessToken,
        order: buildMedexOrderInput({
          prescriptionItems: submittedPrescriptionItems,
        }),
      });
      const trackingCode = submitOrderNode?.trackingCode;
      expect(trackingCode, 'Missing trackingCode from patient submit order response').toBeTruthy();

      await waitForMedexOrderIsAccepted(api, { patientAccessToken, orderId });

      const { medexAccessToken } = await loginMedex(api);
      await confirmOrderAsMedex(api, { medexAccessToken, trackingCode });
      await cancelOrderAsPatientForMedex(api, { patientAccessToken, orderId });

      const postCancelOrderNode = await getMedexOrderDetail(api, { patientAccessToken, orderId });
      const postCancelHistoryEntry = await getMedexOrderHistoryEntry(api, { patientAccessToken, orderId });

      expect(postCancelOrderNode?.status, 'Expected patient order status to become CANCELLED after patient cancel').toBe(
        'CANCELLED'
      );
      expect(postCancelHistoryEntry, 'Missing patient order history entry after patient cancel').toBeTruthy();
      expect(
        postCancelHistoryEntry?.status,
        'Expected patient order history status to become CANCELLED after patient cancel'
      ).toBe('CANCELLED');
    }
  );
});
