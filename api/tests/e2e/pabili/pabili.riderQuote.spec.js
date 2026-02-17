import { test, expect } from '../../../globalConfig.api.js';
import path from 'node:path';
import { buildPabiliHappyPathOrderInput } from './pabili.testData.js';
import {
  loginPatient,
  submitOrderAsPatient,
  acceptQuoteAsPatient,
  getPaymentQRCodeAsPatient,
  getBlobTokenAsPatient,
  getProofOfPaymentUploadUrlAsPatient,
  payOrderAsPatient,
  uploadImageToSignedUrl,
} from '../shared/steps/patient.steps.js';
import {
  loginPsePharmacist,
  acceptOrderAsPharmacist,
  confirmOrderAsPharmacist,
  sendQuoteAsPharmacist,
} from '../shared/steps/pharmacist.steps.js';
import { loginAdmin, assignRiderToOrderAsAdmin, confirmPaymentAsAdmin } from '../shared/steps/admin.steps.js';
import {
  loginRider,
  startPickupOrderAsRider,
  arrivedAtPharmacyAsRider,
  updatePricesAsRider,
  getPaymentQRCodeUploadUrlAsRider,
  savePaymentQRCodeAsRider,
  sendPaymentQRCodeAsRider,
  sendQuoteAsRider,
  getPickupProofUploadUrlAsRider,
  setPickupProofAsRider,
  pickupOrderAsRider,
  arrivedAtDropOffAsRider,
  getDeliveryProofUploadUrlAsRider,
  setDeliveryProofAsRider,
  completeOrderAsRider,
} from '../shared/steps/rider.steps.js';

test.describe('GraphQL E2E Workflow: Pabili Happy Path (Rider Sends Quote)', () => {
  test(
    'PHARMA-345 | Pabili happy path where rider sends quote then order completes',
    {
      tag: ['@api', '@workflow', '@pabili', '@patient', '@pharmacist', '@rider', '@admin', '@positive', '@pharma-345'],
    },
    async ({ api }) => {
      const riderPaymentQrImagePath = path.resolve('upload/images/qr1.png');
      const patientProofPaymentImagePath = path.resolve('upload/images/proof1.png');
      const pickupProofImagePath = path.resolve('upload/images/proofOfPickup.png');
      const deliveryProofImagePath = path.resolve('upload/images/proofOfDelivery.png');
      const pabiliOrder = buildPabiliHappyPathOrderInput();
      const pabiliBranchId = Number(pabiliOrder.branchId);

      // Patient: Login.
      const { patientAccessToken } = await loginPatient(api);
      // Patient: Submit Order.
      const { orderId } = await submitOrderAsPatient(api, {
        patientAccessToken,
        order: pabiliOrder,
      });

      // PSE Pharmacist: Login.
      const { pharmacistAccessToken } = await loginPsePharmacist(api);
      // PSE Pharmacist: Accept Order.
      await acceptOrderAsPharmacist(api, { pharmacistAccessToken, orderId });
      // PSE Pharmacist: Confirm Order (enable rider quote flow).
      await confirmOrderAsPharmacist(api, { pharmacistAccessToken, orderId, riderQuoteEnabled: true });

      // Rider Admin: Login.
      const { adminAccessToken } = await loginAdmin(api);
      // Rider Admin: Assign Rider To Order.
      await assignRiderToOrderAsAdmin(api, {
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
        branchId: pabiliBranchId,
        requireBranchQR: false,
      });
      // Rider: Update Prices.
      await updatePricesAsRider(api, {
        riderAccessToken,
        orderId,
        branchId: pabiliBranchId,
        prices: [
          { medicineId: 1, quantity: 1, unitPrice: 10 },
          { medicineId: 2, quantity: 1, unitPrice: 12 },
        ],
      });
      // Rider: Get Payment QR Code Upload URL.
      const { riderPaymentQRCodeUploadUrl, riderPaymentQRCodeBlobName } = await getPaymentQRCodeUploadUrlAsRider(api, {
        riderAccessToken,
      });
      // Rider: Upload Payment QR Code.
      await uploadImageToSignedUrl(api, {
        uploadUrl: riderPaymentQRCodeUploadUrl,
        imagePath: riderPaymentQrImagePath,
      });
      // Rider: Save Payment QR Code.
      const { riderPaymentQRCodeId } = await savePaymentQRCodeAsRider(api, {
        riderAccessToken,
        photo: riderPaymentQRCodeBlobName,
      });
      // // Rider: Send Payment QR Code.
      // await sendPaymentQRCodeAsRider(api, {
      //   riderAccessToken,
      //   orderId,
      //   branchId: pabiliBranchId,
      //   paymentQRCodeId: riderPaymentQRCodeId,
      // });
      // Rider: Send Quote.
      await sendQuoteAsRider(api, {
        riderAccessToken,
        orderId,
        branchId: pabiliBranchId,
        paymentQRCodeId: riderPaymentQRCodeId,
      });

      // PSE Pharmacist: Send Quote.
      const { paymentQRCodeId: quotedPaymentQRCodeId } = await sendQuoteAsPharmacist(api, {
        pharmacistAccessToken,
        orderId,
      });
      expect(quotedPaymentQRCodeId, 'Missing paymentQRCodeId from pharmacist sendQuote response').toBeTruthy();

      // Patient: Accept Quote.
      const { acceptQuoteNode } = await acceptQuoteAsPatient(api, { patientAccessToken, orderId });
      const patientPaymentQRCodeId = acceptQuoteNode?.paymentQRCodeId || quotedPaymentQRCodeId;
      expect(patientPaymentQRCodeId, 'Missing paymentQRCodeId after patient accept quote').toBeTruthy();
      // Patient: Get Payment QR Code.
      const { paymentQRCodePhoto } = await getPaymentQRCodeAsPatient(api, {
        patientAccessToken,
        paymentQRCodeId: patientPaymentQRCodeId,
      });
      // Patient: Payment QR Code View URL.
      await getBlobTokenAsPatient(api, {
        patientAccessToken,
        blobName: paymentQRCodePhoto,
      });
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

      // Rider Admin: Confirm Payment.
      await confirmPaymentAsAdmin(api, { adminAccessToken, orderId });

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
        branchId: pabiliBranchId,
        proof: { photo: pickupProofBlobName },
      });
      // Rider: Pickup Order.
      await pickupOrderAsRider(api, {
        riderAccessToken,
        orderId,
        branchId: pabiliBranchId,
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
    }
  );
});
