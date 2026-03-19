import { test } from '../../../globalConfig.api.js';
import path from 'node:path';
import { getRiderAccount, getPharmacistAccount } from '../../../helpers/roleCredentials.js';
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
  loginPharmacist,
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

const defaultRiderAccount = getRiderAccount('default');
const regularPharmacistAccount = getPharmacistAccount('reg02');

test.describe('GraphQL E2E Workflow: FindMyMeds Happy Path', () => {
  test(
    'PHARMA-340 | FindMyMeds happy path 1 from patient order to rider completion',
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
        '@pharma-340',
      ],
    },
    async ({ api }) => {
      const paymentQrImagePath = path.resolve('upload/images/qr1.png');
      const patientProofPaymentImagePath = path.resolve('upload/images/proof1.png');
      const pickupProofImagePath = path.resolve('upload/images/proofOfPickup.png');
      const deliveryProofImagePath = path.resolve('upload/images/proofOfDelivery.png');
      // Patient: Login.
      const { patientAccessToken } = await loginPatient(api, { accountKey: 'default' });
      // Patient: Submit Order.
      const { orderId } = await submitOrderAsPatient(api, {
        patientAccessToken,
        order: buildFindMyMedsBaseOrderInput(),
      });

      // PSE Pharmacist: Login.
      const { pharmacistAccessToken } = await loginPharmacist(api, { accountKey: 'pse01' });
      // PSE Pharmacist: Accept Order.
      await acceptOrderAsPharmacist(api, { pharmacistAccessToken, orderId });
      // PSE Pharmacist: Update Prices.
      await updatePricesAsPharmacist(api, {
        pharmacistAccessToken,
        orderId,
        prices: buildFindMyMedsBasePriceItems(),
      });
      // PSE Pharmacist: Assign Branch To Order.
      await assignBranchToOrderAsPharmacist(api, {
        pharmacistAccessToken,
        orderId,
        branchId: regularPharmacistAccount.branchId,
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
      // PSE Pharmacist: Send Payment QR Code.
      const { paymentQRCodeId } = await savePaymentQRCodeAsPharmacist(api, {
        pharmacistAccessToken,
        photo: paymentQRCodeBlobName,
      });
      await sendPaymentQRCodeAsPharmacist(api, {
        pharmacistAccessToken,
        orderId,
        paymentQRCodeId,
      });
      // PSE Pharmacist: Send Quote.
      await sendQuoteAsPharmacist(api, { pharmacistAccessToken, orderId });

      // Patient: Accept Quote with default quoted quantities (no quantity reduction in this scenario).
      await acceptQuoteAsPatient(api, { patientAccessToken, orderId });
      // Patient: Get Proof of Payment Upload URL.
      const { proofOfPaymentUploadUrl, proofOfPaymentBlobName } = await getProofOfPaymentUploadUrlAsPatient(api, {
        patientAccessToken,
      });
      // Patient: Upload Proof of Payment.
      await uploadImageToSignedUrl(api, {
        uploadUrl: proofOfPaymentUploadUrl,
        imagePath: patientProofPaymentImagePath,
      });
      // Patient: Pay Order using uploaded proof only (keeps quoted quantities as-is).
      await payOrderAsPatient(api, {
        patientAccessToken,
        orderId,
        proof: { photo: proofOfPaymentBlobName },
      });

      // Admin: Login.
      const { adminAccessToken } = await loginAdmin(api, { accountKey: 'default' });
      // Admin: Confirm Payment.
      await confirmPaymentAsAdmin(api, { adminAccessToken, orderId });
      // Admin: Assign Rider To Order.
      const { assignedRiderId } = await assignRiderToOrderAsAdmin(api, {
        adminAccessToken,
        orderId,
        riderId: defaultRiderAccount.riderId,
      });

      // PSE Pharmacist: Prepare Order.
      await prepareOrderAsPharmacist(api, { pharmacistAccessToken, orderId });
      // PSE Pharmacist: Set For Pickup.
      await setOrderForPickupAsPharmacist(api, { pharmacistAccessToken, orderId });

      // Rider: Login.
      const { riderAccessToken } = await loginRider(api, { accountKey: 'default' });
      // Rider: Start Pickup Order.
      await startPickupOrderAsRider(api, { riderAccessToken, orderId });

      // Rider: Arrived at Pharmacy.
      const { branchQR } = await arrivedAtPharmacyAsRider(api, {
        riderAccessToken,
        orderId,
        branchId: regularPharmacistAccount.branchId,
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
        branchId: regularPharmacistAccount.branchId,
        proof: { photo: pickupProofBlobName },
      });
      // Rider: Pickup Order.
      await pickupOrderAsRider(api, {
        riderAccessToken,
        orderId,
        branchId: regularPharmacistAccount.branchId,
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
