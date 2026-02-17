import { test } from '../../../globalConfig.api.js';
import path from 'node:path';
import { buildFindMyMedsDeclinedOrderInput } from './findMyMeds.testData.js';
import {
  loginPatient,
  submitOrderAsPatient,
  acceptQuoteAsPatient,
  payOrderAsPatient,
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
  setPickupProofAsRider,
  pickupOrderAsRider,
  arrivedAtDropOffAsRider,
  completeOrderAsRider,
} from '../shared/steps/rider.steps.js';

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
      // Patient: Login.
      const { patientAccessToken } = await loginPatient(api);
      // Patient: Submit Order.
      const { orderId } = await submitOrderAsPatient(api, {
        patientAccessToken,
        order: buildFindMyMedsDeclinedOrderInput(),
      });

      // PSE Pharmacist: Login.
      const { pharmacistAccessToken } = await loginPsePharmacist(api);
      // PSE Pharmacist: Accept Order.
      await acceptOrderAsPharmacist(api, { pharmacistAccessToken, orderId });
      // PSE Pharmacist: Update Prices.
      await updatePricesAsPharmacist(api, {
        pharmacistAccessToken,
        orderId,
        prices: [
          { medicineId: 1, quantity: 1, unitPrice: 10 },
          { medicineId: 2, quantity: 1, unitPrice: 12 },
        ],
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

      // Patient: Accept Quote.
      await acceptQuoteAsPatient(api, { patientAccessToken, orderId });
      // Patient: Pay Order.
      await payOrderAsPatient(api, {
        patientAccessToken,
        orderId,
        proof: { photo: 'pp-123456-8888-5643.png' },
      });

      // Rider Admin: Login.
      const { adminAccessToken } = await loginAdmin(api);
      // Admin: Confirm Payment.
      await confirmPaymentAsAdmin(api, { adminAccessToken, orderId });
      // Rider Admin: Assign Rider To Order.
      await assignRiderToOrderAsAdmin(api, {
        adminAccessToken,
        orderId,
        riderId: process.env.RIDER_USERID,
      });

      // PSE Pharmacist: Prepare Order.
      await prepareOrderAsPharmacist(api, { pharmacistAccessToken, orderId });
      // PSE Pharmacist: Set For Pickup.
      await setOrderForPickupAsPharmacist(api, { pharmacistAccessToken, orderId });

      // Rider: Login.
      const { riderAccessToken } = await loginRider(api);
      // Rider: Start Pickup Order.
      await startPickupOrderAsRider(api, { riderAccessToken, orderId });
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Rider: Arrived at Pharmacy.
      const { branchQR } = await arrivedAtPharmacyAsRider(api, {
        riderAccessToken,
        orderId,
        branchId: process.env.PHARMACIST_BRANCHID_REG02,
        requireBranchQR: false,
      });
      // Rider: Set Pickup Proof.
      await setPickupProofAsRider(api, {
        riderAccessToken,
        orderId,
        branchId: process.env.PHARMACIST_BRANCHID_REG02,
        proof: { photo: 'pp-123456-8888-5643.png' },
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
      // Rider: Complete Order.
      await completeOrderAsRider(api, { riderAccessToken, orderId });
    }
  );
});
