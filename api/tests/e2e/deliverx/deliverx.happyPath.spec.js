import path from 'node:path';
import { safeGraphQL, bearer } from '../../../helpers/graphqlUtils.js';
import { test, expect } from '../../../globalConfig.api.js';
import { getRiderAccount, getPharmacistAccount } from '../../../helpers/roleCredentials.js';
import {
  buildDeliverXBaseOrderInput,
  buildDeliverXAttachmentNoPrescriptionOrderInput,
  buildDeliverXBasePriceItems,
  buildDeliverXAttachmentPrescriptionItemPayloads,
} from './deliverx.testData.js';
import { RIDER_START_PICKUP_ORDER_QUERY } from '../shared/queries/rider.queries.js';
import {
  loginPatient,
  submitOrderAsPatient,
  getProofOfPaymentUploadUrlAsPatient,
  uploadImageToSignedUrl,
  acceptQuoteAsPatient,
  payOrderAsPatient,
  payOrderAsPatientForPickupOrder,
  payOrderAsPatientForScheduledDelivery,
  rateRiderAsPatient,
} from '../shared/steps/patient.steps.js';
import {
  loginPharmacist,
  acceptOrderAsPharmacist,
  addPrescriptionItemAsPharmacist,
  replaceMedicineAsPharmacist,
  updatePricesAsPharmacist,
  sendQuoteAsPharmacist,
  prepareOrderAsPharmacist,
  setOrderForPickupAsPharmacist,
  confirmPickupAsPharmacist,
} from '../shared/steps/pharmacist.steps.js';
import { loginAdmin, confirmPaymentAsAdmin, assignRiderToOrderAsAdmin } from '../shared/steps/admin.steps.js';
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

const defaultRiderAccount = getRiderAccount('default');
const regularPharmacistAccount = getPharmacistAccount('reg01');

test.describe('GraphQL E2E Workflow: DeliverX Happy Path', () => {
  test(
    'PHARMA-334 | DeliverX happy path from patient order to rider completion and patient rating',
    {
      tag: [
        '@api',
        '@workflow',
        '@deliverx',
        '@patient',
        '@pharmacist',
        '@rider',
        '@admin',
        '@positive',
        '@pharma-334', '@smoke',
      ],
    },
    async ({ api }) => {
      const patientProofPaymentImagePath = path.resolve('upload/images/proof1.png');
      const riderPickupProofImagePath = path.resolve('upload/images/proofOfPickup.png');
      const riderDeliveryProofImagePath = path.resolve('upload/images/proofOfDelivery.png');
      // Login as patient and submit order.
      const { patientAccessToken } = await loginPatient(api, { accountKey: 'default' });
      const { orderId } = await submitOrderAsPatient(api, {
        patientAccessToken,
        order: buildDeliverXBaseOrderInput(),
      });

      // Login as pharmacist, accept order, update prices, and send quote.
      const { pharmacistAccessToken } = await loginPharmacist(api, { accountKey: 'reg01' });
      await acceptOrderAsPharmacist(api, { pharmacistAccessToken, orderId });
      await updatePricesAsPharmacist(api, {
        pharmacistAccessToken,
        orderId,
        prices: buildDeliverXBasePriceItems(),
      });
      await sendQuoteAsPharmacist(api, { pharmacistAccessToken, orderId });

      // Accept quote as patient.
      await acceptQuoteAsPatient(api, { patientAccessToken, orderId });

      // Get proof of payment upload URL as patient.
      const { proofOfPaymentUploadUrl, proofOfPaymentBlobName } = await getProofOfPaymentUploadUrlAsPatient(api, {
        patientAccessToken,
      });
      // Upload proof of payment as patient.
      await uploadImageToSignedUrl(api, {
        uploadUrl: proofOfPaymentUploadUrl,
        imagePath: patientProofPaymentImagePath,
      });
      // Pay order as patient.
      await payOrderAsPatient(api, {
        patientAccessToken,
        orderId,
        proof: {
          fulfillmentMode: 'DELIVERY',
          photo: proofOfPaymentBlobName,
        },
      });

      // Login as admin, confirm payment, prepare order, set for pickup, and assign rider.
      const { adminAccessToken } = await loginAdmin(api, { accountKey: 'default' });
      await confirmPaymentAsAdmin(api, { adminAccessToken, orderId });
      await prepareOrderAsPharmacist(api, { pharmacistAccessToken, orderId });
      await setOrderForPickupAsPharmacist(api, { pharmacistAccessToken, orderId });
      const { assignedRiderId } = await assignRiderToOrderAsAdmin(api, {
        adminAccessToken,
        orderId,
        riderId: defaultRiderAccount.riderId,
      });

      // Login as rider, start pickup, and arrive at pharmacy.
      const { riderAccessToken } = await loginRider(api, { accountKey: 'default' });
      await startPickupOrderAsRider(api, { riderAccessToken, orderId });
      const { branchQR } = await arrivedAtPharmacyAsRider(api, {
        riderAccessToken,
        orderId,
        branchId: regularPharmacistAccount.branchId,
      });

      // Get pickup proof upload URL as rider.
      const { pickupProofUploadUrl, pickupProofBlobName } = await getPickupProofUploadUrlAsRider(api, {
        riderAccessToken,
      });
      // Upload pickup proof as rider.
      await uploadImageToSignedUrl(api, {
        uploadUrl: pickupProofUploadUrl,
        imagePath: riderPickupProofImagePath,
      });
      // Set pickup proof as rider.
      await setPickupProofAsRider(api, {
        riderAccessToken,
        orderId,
        branchId: regularPharmacistAccount.branchId,
        proof: { photo: pickupProofBlobName },
      });

      // Pickup order as rider and arrive at drop off.
      await pickupOrderAsRider(api, {
        riderAccessToken,
        orderId,
        branchId: regularPharmacistAccount.branchId,
        branchQR,
      });
      await arrivedAtDropOffAsRider(api, { riderAccessToken, orderId });

      // Get delivery proof upload URL as rider.
      const { deliveryProofUploadUrl, deliveryProofBlobName } = await getDeliveryProofUploadUrlAsRider(api, {
        riderAccessToken,
      });
      // Upload delivery proof as rider.
      await uploadImageToSignedUrl(api, {
        uploadUrl: deliveryProofUploadUrl,
        imagePath: riderDeliveryProofImagePath,
      });
      // Set delivery proof as rider.
      await setDeliveryProofAsRider(api, {
        riderAccessToken,
        orderId,
        proof: { photo: deliveryProofBlobName },
      });

      // Complete order as rider and rate rider as patient.
      await completeOrderAsRider(api, { riderAccessToken, orderId });
      await rateRiderAsPatient(api, {
        patientAccessToken,
        riderId: assignedRiderId || defaultRiderAccount.riderId,
      });
    }
  );

  test(
    'PHARMA-335 | DeliverX with attachment and no prescription items',
    {
      tag: [
        '@api',
        '@workflow',
        '@deliverx',
        '@patient',
        '@pharmacist',
        '@rider',
        '@admin',
        '@positive',
        '@pharma-335',
      ],
    },
    async ({ api }) => {
      const patientProofPaymentImagePath = path.resolve('upload/images/proof1.png');
      const riderPickupProofImagePath = path.resolve('upload/images/proofOfPickup.png');
      const riderDeliveryProofImagePath = path.resolve('upload/images/proofOfDelivery.png');
      const attachmentPrescriptionItems = buildDeliverXAttachmentPrescriptionItemPayloads();
      // Login as patient.
      const { patientAccessToken } = await loginPatient(api, { accountKey: 'default' });
      // Submit order as patient.
      const { orderId } = await submitOrderAsPatient(api, {
        patientAccessToken,
        order: buildDeliverXAttachmentNoPrescriptionOrderInput(),
      });

      // Login as pharmacist.
      const { pharmacistAccessToken } = await loginPharmacist(api, { accountKey: 'reg01' });
      // Accept order as pharmacist.
      await acceptOrderAsPharmacist(api, { pharmacistAccessToken, orderId });

      // Add first prescription item as pharmacist.
      await addPrescriptionItemAsPharmacist(api, {
        pharmacistAccessToken,
        orderId,
        prescriptionItem: attachmentPrescriptionItems.addedPrimary,
      });

      // Add second prescription item as pharmacist.
      const { prescriptionItemId } = await addPrescriptionItemAsPharmacist(api, {
        pharmacistAccessToken,
        orderId,
        prescriptionItem: attachmentPrescriptionItems.addedSecondary,
      });

      // Replace medicine as pharmacist.
      await replaceMedicineAsPharmacist(api, {
        pharmacistAccessToken,
        orderId,
        prescriptionItemId,
        prescriptionItem: attachmentPrescriptionItems.replacement,
      });

      // Send quote as pharmacist.
      await sendQuoteAsPharmacist(api, { pharmacistAccessToken, orderId });
      // Accept quote as patient.
      await acceptQuoteAsPatient(api, { patientAccessToken, orderId });
      // Get proof of payment upload URL as patient.
      const { proofOfPaymentUploadUrl, proofOfPaymentBlobName } = await getProofOfPaymentUploadUrlAsPatient(api, {
        patientAccessToken,
      });
      // Upload proof of payment as patient.
      await uploadImageToSignedUrl(api, {
        uploadUrl: proofOfPaymentUploadUrl,
        imagePath: patientProofPaymentImagePath,
      });
      // Pay order as patient.
      await payOrderAsPatient(api, {
        patientAccessToken,
        orderId,
        proof: { fulfillmentMode: 'DELIVERY', photo: proofOfPaymentBlobName },
      });

      // Login as admin.
      const { adminAccessToken } = await loginAdmin(api, { accountKey: 'default' });
      // Confirm payment as admin.
      await confirmPaymentAsAdmin(api, { adminAccessToken, orderId });

      // Prepare order as pharmacist.
      await prepareOrderAsPharmacist(api, { pharmacistAccessToken, orderId });
      // Set order for pickup as pharmacist.
      await setOrderForPickupAsPharmacist(api, { pharmacistAccessToken, orderId });

      // Assign rider to order as admin.
      const { assignedRiderId } = await assignRiderToOrderAsAdmin(api, {
        adminAccessToken,
        orderId,
        riderId: defaultRiderAccount.riderId,
      });

      // Login as rider.
      const { riderAccessToken } = await loginRider(api, { accountKey: 'default' });
      // Start pickup order as rider.
      await startPickupOrderAsRider(api, { riderAccessToken, orderId });

      // Mark arrived at pharmacy as rider.
      const { branchQR } = await arrivedAtPharmacyAsRider(api, {
        riderAccessToken,
        orderId,
        branchId: regularPharmacistAccount.branchId,
      });

      // Get pickup proof upload URL as rider.
      const { pickupProofUploadUrl, pickupProofBlobName } = await getPickupProofUploadUrlAsRider(api, {
        riderAccessToken,
      });
      // Upload pickup proof as rider.
      await uploadImageToSignedUrl(api, {
        uploadUrl: pickupProofUploadUrl,
        imagePath: riderPickupProofImagePath,
      });
      // Set pickup proof as rider.
      await setPickupProofAsRider(api, {
        riderAccessToken,
        orderId,
        branchId: regularPharmacistAccount.branchId,
        proof: { photo: pickupProofBlobName },
      });

      // Pickup order as rider.
      await pickupOrderAsRider(api, {
        riderAccessToken,
        orderId,
        branchId: regularPharmacistAccount.branchId,
        branchQR,
      });

      // Mark arrived at drop off as rider.
      await arrivedAtDropOffAsRider(api, { riderAccessToken, orderId });
      // Get delivery proof upload URL as rider.
      const { deliveryProofUploadUrl, deliveryProofBlobName } = await getDeliveryProofUploadUrlAsRider(api, {
        riderAccessToken,
      });
      // Upload delivery proof as rider.
      await uploadImageToSignedUrl(api, {
        uploadUrl: deliveryProofUploadUrl,
        imagePath: riderDeliveryProofImagePath,
      });
      // Set delivery proof as rider.
      await setDeliveryProofAsRider(api, {
        riderAccessToken,
        orderId,
        proof: { photo: deliveryProofBlobName },
      });
      // Complete order as rider.
      await completeOrderAsRider(api, { riderAccessToken, orderId });

      // Rate rider as patient.
      await rateRiderAsPatient(api, {
        patientAccessToken,
        riderId: assignedRiderId || defaultRiderAccount.riderId,
      });
    }
  );

  test(
    'PHARMA-336 | DeliverX pickup order fulfillment happy path',
    {
      tag: ['@api', '@workflow', '@deliverx', '@patient', '@pharmacist', '@admin', '@positive', '@pharma-336', '@smoke'],
    },
    async ({ api }) => {
      const patientProofPaymentImagePath = path.resolve('upload/images/proof1.png');
      const riderPickupProofImagePath = path.resolve('upload/images/proofOfPickup.png');
      const riderDeliveryProofImagePath = path.resolve('upload/images/proofOfDelivery.png');
      // Login as patient.
      const { patientAccessToken } = await loginPatient(api, { accountKey: 'default' });
      // Submit order as patient.
      const { orderId } = await submitOrderAsPatient(api, {
        patientAccessToken,
        order: buildDeliverXBaseOrderInput(),
      });

      // Login as pharmacist.
      const { pharmacistAccessToken } = await loginPharmacist(api, { accountKey: 'reg01' });
      // Accept order as pharmacist.
      await acceptOrderAsPharmacist(api, { pharmacistAccessToken, orderId });
      // Update prices as pharmacist.
      await updatePricesAsPharmacist(api, {
        pharmacistAccessToken,
        orderId,
        prices: buildDeliverXBasePriceItems(),
      });
      // Send quote as pharmacist.
      await sendQuoteAsPharmacist(api, { pharmacistAccessToken, orderId });

      // Accept quote as patient.
      await acceptQuoteAsPatient(api, { patientAccessToken, orderId });
      // Get proof of payment upload URL as patient.
      const { proofOfPaymentUploadUrl, proofOfPaymentBlobName } = await getProofOfPaymentUploadUrlAsPatient(api, {
        patientAccessToken,
      });
      // Upload proof of payment as patient.
      await uploadImageToSignedUrl(api, {
        uploadUrl: proofOfPaymentUploadUrl,
        imagePath: patientProofPaymentImagePath,
      });
      // Pay order as patient (pickup mode).
      await payOrderAsPatientForPickupOrder(api, { patientAccessToken, orderId, proofPhoto: proofOfPaymentBlobName });

      // Login as admin.
      const { adminAccessToken } = await loginAdmin(api, { accountKey: 'default' });
      // Confirm payment as admin.
      await confirmPaymentAsAdmin(api, { adminAccessToken, orderId });

      // Prepare order as pharmacist.
      await prepareOrderAsPharmacist(api, { pharmacistAccessToken, orderId });
      // Set order for pickup as pharmacist.
      const { patientQR } = await setOrderForPickupAsPharmacist(api, { pharmacistAccessToken, orderId });
      expect(patientQR, 'Missing patientQR from setForPickup response').toBeTruthy();
      // Confirm pickup as pharmacist.
      await confirmPickupAsPharmacist(api, {
        pharmacistAccessToken,
        orderId,
        qrCode: patientQR,
      });
    }
  );

  test(
    'PHARMA-337 | DeliverX scheduled fulfillment happy path',
    {
      tag: [
        '@api',
        '@workflow',
        '@deliverx',
        '@patient',
        '@pharmacist',
        '@rider',
        '@admin',
        '@positive',
        '@pharma-337', '@smoke',
      ],
    },
    async ({ api }) => {
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
      // Login as patient.
      const { patientAccessToken } = await loginPatient(api, { accountKey: 'default' });
      // Submit order as patient.
      const { orderId } = await submitOrderAsPatient(api, {
        patientAccessToken,
        order: buildDeliverXBaseOrderInput(),
      });

      // Login as pharmacist.
      const { pharmacistAccessToken } = await loginPharmacist(api, { accountKey: 'reg01' });
      // Accept order as pharmacist.
      await acceptOrderAsPharmacist(api, { pharmacistAccessToken, orderId });
      // Update prices as pharmacist.
      await updatePricesAsPharmacist(api, {
        pharmacistAccessToken,
        orderId,
        prices: buildDeliverXBasePriceItems(),
      });
      // Send quote as pharmacist.
      await sendQuoteAsPharmacist(api, { pharmacistAccessToken, orderId });

      // Accept quote as patient.
      await acceptQuoteAsPatient(api, { patientAccessToken, orderId });
      // Get proof of payment upload URL as patient.
      const { proofOfPaymentUploadUrl, proofOfPaymentBlobName } = await getProofOfPaymentUploadUrlAsPatient(api, {
        patientAccessToken,
      });
      // Upload proof of payment as patient.
      await uploadImageToSignedUrl(api, {
        uploadUrl: proofOfPaymentUploadUrl,
        imagePath: patientProofPaymentImagePath,
      });
      // Pay order as patient (scheduled delivery mode).
      await payOrderAsPatientForScheduledDelivery(api, {
        patientAccessToken,
        orderId,
        proofPhoto: proofOfPaymentBlobName,
      });

      // Login as admin.
      const { adminAccessToken } = await loginAdmin(api, { accountKey: 'default' });
      // Confirm payment as admin.
      await confirmPaymentAsAdmin(api, { adminAccessToken, orderId });

      // Prepare order as pharmacist.
      await prepareOrderAsPharmacist(api, { pharmacistAccessToken, orderId });
      // Set order for pickup as pharmacist.
      await setOrderForPickupAsPharmacist(api, { pharmacistAccessToken, orderId });

      // Assign rider to order as admin.
      const { assignedRiderId } = await assignRiderToOrderAsAdmin(api, {
        adminAccessToken,
        orderId,
        riderId: defaultRiderAccount.riderId,
      });

      // Login as rider.
      const { riderAccessToken } = await loginRider(api, { accountKey: 'default' });
      // Start pickup order as rider.
      await startPickupOrderAsRider(api, { riderAccessToken, orderId });

      // Mark arrived at pharmacy as rider.
      const { branchQR } = await arrivedAtPharmacyAsRider(api, {
        riderAccessToken,
        orderId,
        branchId: regularPharmacistAccount.branchId,
      });

      // Get pickup proof upload URL as rider.
      const { pickupProofUploadUrl, pickupProofBlobName } = await getPickupProofUploadUrlAsRider(api, {
        riderAccessToken,
      });
      // Upload pickup proof as rider.
      await uploadImageToSignedUrl(api, {
        uploadUrl: pickupProofUploadUrl,
        imagePath: riderPickupProofImagePath,
      });
      // Set pickup proof as rider.
      await setPickupProofAsRider(api, {
        riderAccessToken,
        orderId,
        branchId: regularPharmacistAccount.branchId,
        proof: { photo: pickupProofBlobName },
      });

      // Pickup order as rider.
      await pickupOrderAsRider(api, {
        riderAccessToken,
        orderId,
        branchId: regularPharmacistAccount.branchId,
        branchQR,
      });

      // Mark arrived at drop off as rider.
      await arrivedAtDropOffAsRider(api, { riderAccessToken, orderId });
      // Get delivery proof upload URL as rider.
      const { deliveryProofUploadUrl, deliveryProofBlobName } = await getDeliveryProofUploadUrlAsRider(api, {
        riderAccessToken,
      });
      // Upload delivery proof as rider.
      await uploadImageToSignedUrl(api, {
        uploadUrl: deliveryProofUploadUrl,
        imagePath: riderDeliveryProofImagePath,
      });
      // Set delivery proof as rider.
      await setDeliveryProofAsRider(api, {
        riderAccessToken,
        orderId,
        proof: { photo: deliveryProofBlobName },
      });
      // Complete order as rider.
      await completeOrderAsRider(api, { riderAccessToken, orderId });

      // Rate rider as patient.
      await rateRiderAsPatient(api, {
        patientAccessToken,
        riderId: assignedRiderId || defaultRiderAccount.riderId,
      });
    }
  );
});
