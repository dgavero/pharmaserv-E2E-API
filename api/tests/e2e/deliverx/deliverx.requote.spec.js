import { test } from '../../../globalConfig.api.js';
import path from 'node:path';
import {
  loginPatient,
  submitOrderAsPatient,
  getPrescriptionUploadUrlAsPatient,
  uploadImageToSignedUrl,
  savePrescriptionAsPatient,
  getDiscountUploadUrlAsPatient,
  saveDiscountCardAsPatient,
  getAttachmentUploadUrlAsPatient,
  getProofOfPaymentUploadUrlAsPatient,
  acceptQuoteAsPatient,
  requestReQuoteAsPatient,
  payOrderAsPatient,
  rateRiderAsPatient,
} from '../shared/steps/patient.steps.js';
import {
  loginPharmacist,
  acceptOrderAsPharmacist,
  addPrescriptionItemAsPharmacist,
  updateAvailablePrescriptionItemAsPharmacist,
  replaceMedicineAsPharmacist,
  updatePricesAsPharmacist,
  sendQuoteAsPharmacist,
  prepareOrderAsPharmacist,
  setOrderForPickupAsPharmacist,
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
import {
  buildDeliverXRequoteData,
} from './deliverx.testData.js';

test.describe('GraphQL E2E Workflow: DeliverX Requote', () => {
  test(
    'PHARMA-338 | DeliverX delivery fulfillment happy path with requote',
    {
      tag: ['@api', '@workflow', '@deliverx', '@patient', '@pharmacist', '@rider', '@admin', '@positive', '@pharma-338'],
    },
    async ({ api }) => {
      const prescriptionImagePath = path.resolve('upload/images/prescription1.png');
      const discountImagePath = path.resolve('upload/images/prescription2.png');
      const attachmentImagePath = path.resolve('upload/images/prescription1.png');
      const proofPaymentImagePath = path.resolve('upload/images/proof1.png');
      const riderPickupProofImagePath = path.resolve('upload/images/proofOfPickup.png');
      const riderDeliveryProofImagePath = path.resolve('upload/images/proofOfDelivery.png');

      // Patient: Login.
      const { patientAccessToken } = await loginPatient(api);

      // Patient: Get Prescription Upload URL.
      const { prescriptionUploadUrl, prescriptionBlobName } = await getPrescriptionUploadUrlAsPatient(api, {
        patientAccessToken,
      });
      // Patient: Upload Prescription.
      await uploadImageToSignedUrl(api, {
        uploadUrl: prescriptionUploadUrl,
        imagePath: prescriptionImagePath,
      });
      // Patient: Save Prescription.
      const { prescriptionId } = await savePrescriptionAsPatient(api, {
        patientAccessToken,
        patientId: process.env.PATIENT_USER_USERNAME_ID,
        photo: prescriptionBlobName,
      });

      // Patient: Get Discount Upload URL.
      const { discountUploadUrl, discountBlobName } = await getDiscountUploadUrlAsPatient(api, {
        patientAccessToken,
      });
      // Patient: Upload Discount Card.
      await uploadImageToSignedUrl(api, {
        uploadUrl: discountUploadUrl,
        imagePath: discountImagePath,
      });
      // Patient: Save Discount Card.
      const { discountCardId } = await saveDiscountCardAsPatient(api, {
        patientAccessToken,
        patientId: process.env.PATIENT_USER_USERNAME_ID,
        photo: discountBlobName,
      });

      // Patient: Get Attachment URL.
      const { attachmentUploadUrl, attachmentBlobName } = await getAttachmentUploadUrlAsPatient(api, {
        patientAccessToken,
      });
      // Patient: Upload Attachment.
      await uploadImageToSignedUrl(api, {
        uploadUrl: attachmentUploadUrl,
        imagePath: attachmentImagePath,
      });
      const requoteData = buildDeliverXRequoteData({ prescriptionId, discountCardId, attachmentBlobName });

      // Patient: Submit Order.
      const { orderId } = await submitOrderAsPatient(api, {
        patientAccessToken,
        order: requoteData.orderInput,
      });

      // Pharmacist: Login.
      const { pharmacistAccessToken } = await loginPharmacist(api);
      // Pharmacist: Accept Order.
      await acceptOrderAsPharmacist(api, { pharmacistAccessToken, orderId });

      // Pharmacist: Add Prescription Item.
      const { prescriptionItemId: firstPrescriptionItemId } = await addPrescriptionItemAsPharmacist(api, {
        pharmacistAccessToken,
        orderId,
        prescriptionItem: requoteData.firstAddedPrescriptionItem,
      });
      const firstAddedMedicineId = requoteData.firstAddedPrescriptionItem.medicineId;
      // Pharmacist: Update Available Prescription Item.
      await updateAvailablePrescriptionItemAsPharmacist(api, {
        pharmacistAccessToken,
        orderId,
        prescriptionItemId: firstPrescriptionItemId,
        medicineId: firstAddedMedicineId,
        ...requoteData.availablePrescriptionItemUpdate,
      });
      // Pharmacist: Replace Medicine.
      const replacementPrescriptionItem = requoteData.replacementPrescriptionItem;
      await replaceMedicineAsPharmacist(api, {
        pharmacistAccessToken,
        orderId,
        prescriptionItemId: firstPrescriptionItemId,
        prescriptionItem: replacementPrescriptionItem,
      });
      // Pharmacist: Update Prices.
      await updatePricesAsPharmacist(api, {
        pharmacistAccessToken,
        orderId,
        prices: requoteData.priceItems,
      });
      // Pharmacist: Send Quote.
      await sendQuoteAsPharmacist(api, { pharmacistAccessToken, orderId });

      // Patient: Accept Quote.
      await acceptQuoteAsPatient(api, { patientAccessToken, orderId });
      // Patient: Request Re-quote.
      await requestReQuoteAsPatient(api, { patientAccessToken, orderId });

      // Pharmacist: Add Prescription Item (re-quote path).
      await addPrescriptionItemAsPharmacist(api, {
        pharmacistAccessToken,
        orderId,
        prescriptionItem: requoteData.postRequotePrescriptionItem,
      });
      // Pharmacist: Send Quote (re-quote path).
      await sendQuoteAsPharmacist(api, { pharmacistAccessToken, orderId });

      // Patient: Accept Quote (re-quote path).
      await acceptQuoteAsPatient(api, { patientAccessToken, orderId });
      // Patient: Get Proof of Payment Upload URL.
      const { proofOfPaymentUploadUrl, proofOfPaymentBlobName } = await getProofOfPaymentUploadUrlAsPatient(api, {
        patientAccessToken,
      });
      // Patient: Upload Proof of Payment.
      await uploadImageToSignedUrl(api, {
        uploadUrl: proofOfPaymentUploadUrl,
        imagePath: proofPaymentImagePath,
      });
      // Patient: Pay Order.
      await payOrderAsPatient(api, {
        patientAccessToken,
        orderId,
        proof: {
          fulfillmentMode: 'DELIVERY',
          photo: proofOfPaymentBlobName,
        },
      });

      // Admin: Login.
      const { adminAccessToken } = await loginAdmin(api);
      // Admin: Confirm Payment.
      await confirmPaymentAsAdmin(api, { adminAccessToken, orderId });

      // Pharmacist: Prepare Order.
      await prepareOrderAsPharmacist(api, { pharmacistAccessToken, orderId });
      // Pharmacist: Set For Pickup.
      await setOrderForPickupAsPharmacist(api, { pharmacistAccessToken, orderId });

      // Admin: Assign Rider To Order.
      const { assignedRiderId } = await assignRiderToOrderAsAdmin(api, {
        adminAccessToken,
        orderId,
        riderId: process.env.RIDER_USERID,
      });

      // Rider: Login.
      const { riderAccessToken } = await loginRider(api);
      // Rider: Start Pickup Order.
      await startPickupOrderAsRider(api, { riderAccessToken, orderId });
      // Rider: Arrived at Pharmacy.
      const { branchQR } = await arrivedAtPharmacyAsRider(api, {
        riderAccessToken,
        orderId,
        branchId: process.env.PHARMACIST_BRANCHID_REG01,
      });
      // Rider: Get Pickup Proof Upload URL.
      const { pickupProofUploadUrl, pickupProofBlobName } = await getPickupProofUploadUrlAsRider(api, {
        riderAccessToken,
      });
      // Rider: Upload Pickup Proof.
      await uploadImageToSignedUrl(api, {
        uploadUrl: pickupProofUploadUrl,
        imagePath: riderPickupProofImagePath,
      });
      // Rider: Set Pickup Proof.
      await setPickupProofAsRider(api, {
        riderAccessToken,
        orderId,
        branchId: process.env.PHARMACIST_BRANCHID_REG01,
        proof: { photo: pickupProofBlobName },
      });
      // Rider: Pickup Order.
      await pickupOrderAsRider(api, {
        riderAccessToken,
        orderId,
        branchId: process.env.PHARMACIST_BRANCHID_REG01,
        branchQR,
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
        imagePath: riderDeliveryProofImagePath,
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
        riderId: assignedRiderId || process.env.RIDER_USERID,
      });
    }
  );
});
