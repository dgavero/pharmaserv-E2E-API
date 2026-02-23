import { test, expect } from '../../../globalConfig.api.js';
import path from 'node:path';
import { buildFindMyMedsBaseOrderInput, buildFindMyMedsBasePriceItems } from './findMyMeds.testData.js';
import {
  loginPatient,
  submitOrderAsPatient,
  acceptQuoteAsPatient,
  getProofOfPaymentUploadUrlAsPatient,
  payOrderAsPatient,
  rateRiderAsPatient,
  uploadImageToSignedUrl,
} from '../shared/steps/patient.steps.js';
import {
  loginPsePharmacist,
  acceptOrderAsPharmacist,
  updatePricesAsPharmacist,
  assignBranchToOrderAsPharmacist,
  getPaymentQRCodeUploadUrlAsPharmacist,
  savePaymentQRCodeAsPharmacist,
  sendPaymentQRCodeAsPharmacist,
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

test.describe('GraphQL E2E Workflow: FindMyMeds Quantity Reduction', () => {
  test(
    'PHARMA-341 | FindMyMeds happy path with quantity reduction from pay order',
    {
      tag: [
        '@api',
        '@workflow',
        '@findmymeds',
        '@patient',
        '@pharmacist',
        '@rider',
        '@admin',
        '@positive',
        '@pharma-341',
      ],
    },
    async ({ api }) => {
      const paymentQrImagePath = path.resolve('upload/images/qr1.png');
      const patientProofPaymentImagePath = path.resolve('upload/images/proof1.png');
      const pickupProofImagePath = path.resolve('upload/images/proofOfPickup.png');
      const deliveryProofImagePath = path.resolve('upload/images/proofOfDelivery.png');

      // Patient: Login.
      const { patientAccessToken } = await loginPatient(api);
      // Patient: Submit Order.
      const { orderId } = await submitOrderAsPatient(api, {
        patientAccessToken,
        order: buildFindMyMedsBaseOrderInput(),
      });

      // PSE Pharmacist: Login.
      const { pharmacistAccessToken } = await loginPsePharmacist(api);
      // PSE Pharmacist: Accept Order.
      await acceptOrderAsPharmacist(api, { pharmacistAccessToken, orderId });
      // PSE Pharmacist: Update Prices.
      await updatePricesAsPharmacist(api, {
        pharmacistAccessToken,
        orderId,
        prices: buildFindMyMedsBasePriceItems({ quantity: 10 }),
      });
      // PSE Pharmacist: Assign Branch To Order.
      await assignBranchToOrderAsPharmacist(api, {
        pharmacistAccessToken,
        orderId,
        branchId: process.env.PHARMACIST_BRANCHID_REG02,
      });
      // PSE Pharmacist: Get Payment QR Code Upload URL.
      const { paymentQRCodeUploadUrl, paymentQRCodeBlobName } = await getPaymentQRCodeUploadUrlAsPharmacist(api, {
        pharmacistAccessToken,
      });
      // PSE Pharmacist: Upload Payment QR Code.
      await uploadImageToSignedUrl(api, {
        uploadUrl: paymentQRCodeUploadUrl,
        imagePath: paymentQrImagePath,
      });
      // PSE Pharmacist: Save Payment QR Code.
      const { paymentQRCodeId } = await savePaymentQRCodeAsPharmacist(api, {
        pharmacistAccessToken,
        photo: paymentQRCodeBlobName,
      });
      // PSE Pharmacist: Send Payment QR Code.
      await sendPaymentQRCodeAsPharmacist(api, {
        pharmacistAccessToken,
        orderId,
        paymentQRCodeId,
      });
      // PSE Pharmacist: Send Quote.
      await sendQuoteAsPharmacist(api, { pharmacistAccessToken, orderId });

      // Patient: Accept Quote and capture prescription item IDs for quantity reduction in pay order.
      const { acceptQuoteNode } = await acceptQuoteAsPatient(api, { patientAccessToken, orderId });
      const prescriptionItems = acceptQuoteNode?.legs?.[0]?.prescriptionItems || [];
      expect(prescriptionItems.length, 'Missing prescription items from patient acceptQuote').toBeGreaterThan(0);
      const reducedQuantities = prescriptionItems.map((item) => ({
        prescriptionItemId: Number(item?.id),
        quantity: 3,
      }));

      // Patient: Get Proof of Payment Upload URL.
      const { proofOfPaymentUploadUrl, proofOfPaymentBlobName } = await getProofOfPaymentUploadUrlAsPatient(api, {
        patientAccessToken,
      });
      // Patient: Upload Proof of Payment.
      await uploadImageToSignedUrl(api, {
        uploadUrl: proofOfPaymentUploadUrl,
        imagePath: patientProofPaymentImagePath,
      });
      // Patient: Pay Order with reduced quantities (force quantity=3 for each quoted medicine item).
      await payOrderAsPatient(api, {
        patientAccessToken,
        orderId,
        proof: {
          photo: proofOfPaymentBlobName,
          quantities: reducedQuantities,
        },
      });

      // Admin: Login.
      const { adminAccessToken } = await loginAdmin(api);
      // Admin: Confirm Payment.
      await confirmPaymentAsAdmin(api, { adminAccessToken, orderId });
      // Admin: Assign Rider To Order.
      const { assignedRiderId } = await assignRiderToOrderAsAdmin(api, {
        adminAccessToken,
        orderId,
        riderId: process.env.RIDER_USERID,
      });

      // PSE Pharmacist: Prepare Order.
      await prepareOrderAsPharmacist(api, { pharmacistAccessToken, orderId });

      // Rider: Login.
      const { riderAccessToken } = await loginRider(api);
      // Rider: Start Pickup Order.
      await startPickupOrderAsRider(api, { riderAccessToken, orderId });

      // PSE Pharmacist: Set For Pickup.
      await setOrderForPickupAsPharmacist(api, { pharmacistAccessToken, orderId });

      // Rider: Arrived at Pharmacy.
      const { branchQR } = await arrivedAtPharmacyAsRider(api, {
        riderAccessToken,
        orderId,
        branchId: process.env.PHARMACIST_BRANCHID_REG02,
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
        branchId: process.env.PHARMACIST_BRANCHID_REG02,
        proof: { photo: pickupProofBlobName },
      });
      // Rider: Pickup Order.
      await pickupOrderAsRider(api, {
        riderAccessToken,
        orderId,
        branchId: process.env.PHARMACIST_BRANCHID_REG02,
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
        riderId: assignedRiderId || process.env.RIDER_USERID,
      });
    }
  );
});
