import { test, expect } from '../../../globalConfig.api.js';
import {
  safeGraphQL,
  bearer,
  loginAndGetTokens,
  pharmacistLoginAndGetTokens,
  adminLoginAndGetTokens,
  riderLoginAndGetTokens,
} from '../../../helpers/testUtilsAPI.js';
import {
  buildDeliverXDeclinedOrderInput,
  buildDeliverXAttachmentNoPrescriptionOrderInput,
} from './deliverx.testData.js';
import {
  PATIENT_SUBMIT_ORDER_QUERY,
  PATIENT_ACCEPT_QUOTE_QUERY,
  PATIENT_PAY_ORDER_QUERY,
  PATIENT_RATE_RIDER_QUERY,
} from '../shared/queries/patient.queries.js';
import {
  PHARMACY_ACCEPT_ORDER_QUERY,
  PHARMACY_UPDATE_PRICES_QUERY,
  PHARMACY_SEND_QUOTE_QUERY,
  PHARMACY_PREPARE_ORDER_QUERY,
  PHARMACY_SET_FOR_PICKUP_QUERY,
} from '../shared/queries/pharmacist.queries.js';
import { ADMIN_CONFIRM_PAYMENT_QUERY, ADMIN_ASSIGN_RIDER_QUERY } from '../shared/queries/admin.queries.js';
import {
  RIDER_START_PICKUP_ORDER_QUERY,
  RIDER_ARRIVED_AT_PHARMACY_QUERY,
  RIDER_SET_PICKUP_PROOF_QUERY,
  RIDER_PICKUP_ORDER_QUERY,
  RIDER_ARRIVED_AT_DROPOFF_QUERY,
  RIDER_COMPLETE_ORDER_QUERY,
} from '../shared/queries/rider.queries.js';
import {
  loginPatient,
  submitOrderAsPatient,
  acceptQuoteAsPatient,
  payOrderAsPatient,
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
  setPickupProofAsRider,
  pickupOrderAsRider,
  arrivedAtDropOffAsRider,
  completeOrderAsRider,
} from '../shared/steps/rider.steps.js';

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
        '@pharma-334',
      ],
    },
    async ({ api }) => {
      // Login as patient.
      const { accessToken: patientAccessToken, raw: patientLoginRes } = await loginAndGetTokens(api, {
        username: process.env.PATIENT_USER_USERNAME,
        password: process.env.PATIENT_USER_PASSWORD,
      });
      expect(patientLoginRes.ok, patientLoginRes.error || 'Patient login failed').toBe(true);

      // Submit order as patient.
      const submitOrderRes = await safeGraphQL(api, {
        query: PATIENT_SUBMIT_ORDER_QUERY,
        variables: { order: buildDeliverXDeclinedOrderInput() },
        headers: bearer(patientAccessToken),
      });
      expect(submitOrderRes.ok, submitOrderRes.error || 'Patient submit order failed').toBe(true);
      const submitOrderNode = submitOrderRes.body?.data?.patient?.order?.book;
      expect(submitOrderNode, 'Missing patient.order.book').toBeTruthy();
      const orderId = submitOrderNode?.id;
      expect(orderId, 'Missing order id').toBeTruthy();

      // Login as pharmacist.
      const { accessToken: pharmacistAccessToken, raw: pharmacistLoginRes } = await pharmacistLoginAndGetTokens(api, {
        username: process.env.PHARMACIST_USERNAME_REG01,
        password: process.env.PHARMACIST_PASSWORD_REG01,
      });
      expect(pharmacistLoginRes.ok, pharmacistLoginRes.error || 'Pharmacist login failed').toBe(true);

      // Accept order as pharmacist.
      const acceptOrderRes = await safeGraphQL(api, {
        query: PHARMACY_ACCEPT_ORDER_QUERY,
        variables: { orderId },
        headers: bearer(pharmacistAccessToken),
      });
      expect(acceptOrderRes.ok, acceptOrderRes.error || 'Pharmacist accept order failed').toBe(true);
      expect(acceptOrderRes.body?.data?.pharmacy?.order?.accept?.id).toBe(orderId);

      // Update prices as pharmacist.
      const updatePricesRes = await safeGraphQL(api, {
        query: PHARMACY_UPDATE_PRICES_QUERY,
        variables: {
          orderId,
          prices: [
            { medicineId: 1, quantity: 1, unitPrice: 10 },
            { medicineId: 2, quantity: 1, unitPrice: 12 },
          ],
        },
        headers: bearer(pharmacistAccessToken),
      });
      expect(updatePricesRes.ok, updatePricesRes.error || 'Pharmacist update prices failed').toBe(true);
      expect(Array.isArray(updatePricesRes.body?.data?.pharmacy?.order?.updatePrices)).toBe(true);

      // Send quote as pharmacist.
      const sendQuoteRes = await safeGraphQL(api, {
        query: PHARMACY_SEND_QUOTE_QUERY,
        variables: { orderId },
        headers: bearer(pharmacistAccessToken),
      });
      expect(sendQuoteRes.ok, sendQuoteRes.error || 'Pharmacist send quote failed').toBe(true);
      expect(sendQuoteRes.body?.data?.pharmacy?.order?.sendQuote?.id).toBe(orderId);

      // Accept quote as patient.
      const acceptQuoteRes = await safeGraphQL(api, {
        query: PATIENT_ACCEPT_QUOTE_QUERY,
        variables: { orderId },
        headers: bearer(patientAccessToken),
      });
      expect(acceptQuoteRes.ok, acceptQuoteRes.error || 'Patient accept quote failed').toBe(true);
      expect(acceptQuoteRes.body?.data?.patient?.order?.acceptQuote?.id).toBe(orderId);

      // Pay order as patient.
      const payOrderRes = await safeGraphQL(api, {
        query: PATIENT_PAY_ORDER_QUERY,
        variables: {
          orderId,
          proof: {
            fulfillmentMode: 'DELIVERY',
            photo: 'pp-2cba3c7a-6985-46c3-a666-bbcef03367c7.png',
          },
        },
        headers: bearer(patientAccessToken),
      });
      expect(payOrderRes.ok, payOrderRes.error || 'Patient pay order failed').toBe(true);
      expect(payOrderRes.body?.data?.patient?.order?.pay?.id).toBe(orderId);

      // Login as rider admin (administrator).
      const { accessToken: riderAdminAccessToken, raw: riderAdminLoginRes } = await adminLoginAndGetTokens(api, {
        username: process.env.ADMIN_USERNAME,
        password: process.env.ADMIN_PASSWORD,
      });
      expect(riderAdminLoginRes.ok, riderAdminLoginRes.error || 'Rider admin login failed').toBe(true);

      // Confirm payment as rider admin.
      const confirmPaymentRes = await safeGraphQL(api, {
        query: ADMIN_CONFIRM_PAYMENT_QUERY,
        variables: { orderId },
        headers: bearer(riderAdminAccessToken),
      });
      expect(confirmPaymentRes.ok, confirmPaymentRes.error || 'Rider admin confirm payment failed').toBe(true);
      expect(confirmPaymentRes.body?.data?.administrator?.order?.confirmPayment?.id).toBe(orderId);

      // Prepare order as pharmacist.
      const prepareOrderRes = await safeGraphQL(api, {
        query: PHARMACY_PREPARE_ORDER_QUERY,
        variables: { orderId },
        headers: bearer(pharmacistAccessToken),
      });
      expect(prepareOrderRes.ok, prepareOrderRes.error || 'Pharmacist prepare order failed').toBe(true);
      expect(prepareOrderRes.body?.data?.pharmacy?.order?.prepare?.id).toBe(orderId);

      // Set order for pickup as pharmacist.
      const setForPickupRes = await safeGraphQL(api, {
        query: PHARMACY_SET_FOR_PICKUP_QUERY,
        variables: { orderId },
        headers: bearer(pharmacistAccessToken),
      });
      expect(setForPickupRes.ok, setForPickupRes.error || 'Pharmacist set for pickup failed').toBe(true);
      expect(setForPickupRes.body?.data?.pharmacy?.order?.setForPickup?.id).toBe(orderId);

      // Assign rider to order as rider admin.
      const assignRiderRes = await safeGraphQL(api, {
        query: ADMIN_ASSIGN_RIDER_QUERY,
        variables: {
          orderId,
          assignment: { riderId: Number(process.env.RIDER_USERID) },
        },
        headers: bearer(riderAdminAccessToken),
      });
      expect(assignRiderRes.ok, assignRiderRes.error || 'Rider admin assign rider failed').toBe(true);
      expect(assignRiderRes.body?.data?.administrator?.order?.assignRider?.id).toBe(orderId);
      const assignedRiderId = assignRiderRes.body?.data?.administrator?.order?.assignRider?.rider?.id;

      // Login as rider.
      const { accessToken: riderAccessToken, raw: riderLoginRes } = await riderLoginAndGetTokens(api, {
        username: process.env.RIDER_USERNAME,
        password: process.env.RIDER_PASSWORD,
      });
      expect(riderLoginRes.ok, riderLoginRes.error || 'Rider login failed').toBe(true);

      // Start pickup order as rider.
      const startPickupOrderRes = await safeGraphQL(api, {
        query: RIDER_START_PICKUP_ORDER_QUERY,
        variables: { orderId },
        headers: bearer(riderAccessToken),
      });
      expect(startPickupOrderRes.ok, startPickupOrderRes.error || 'Rider start pickup order failed').toBe(true);
      expect(startPickupOrderRes.body?.data?.rider?.order?.start?.id).toBe(orderId);

      // Mark arrived at pharmacy as rider.
      const arrivedAtPharmacyRes = await safeGraphQL(api, {
        query: RIDER_ARRIVED_AT_PHARMACY_QUERY,
        variables: {
          orderId,
          branchId: process.env.PHARMACIST_BRANCHID_REG01,
        },
        headers: bearer(riderAccessToken),
      });
      expect(arrivedAtPharmacyRes.ok, arrivedAtPharmacyRes.error || 'Rider arrived at pharmacy failed').toBe(true);
      expect(arrivedAtPharmacyRes.body?.data?.rider?.order?.arrivedAtPharmacy?.id).toBe(orderId);
      const branchQR = arrivedAtPharmacyRes.body?.data?.rider?.order?.arrivedAtPharmacy?.legs?.[0]?.branchQR;
      expect(branchQR, 'Missing branchQR from arrivedAtPharmacy response').toBeTruthy();

      // Set pickup proof as rider.
      const setPickupProofRes = await safeGraphQL(api, {
        query: RIDER_SET_PICKUP_PROOF_QUERY,
        variables: {
          orderId,
          branchId: process.env.PHARMACIST_BRANCHID_REG01,
          proof: { photo: 'pp-123456-8888-5643.png' },
        },
        headers: bearer(riderAccessToken),
      });
      expect(setPickupProofRes.ok, setPickupProofRes.error || 'Rider set pickup proof failed').toBe(true);
      expect(setPickupProofRes.body?.data?.rider?.order?.setPickupProof?.photo).toBeTruthy();

      // Pickup order as rider.
      const pickupOrderRes = await safeGraphQL(api, {
        query: RIDER_PICKUP_ORDER_QUERY,
        variables: {
          orderId,
          branchId: process.env.PHARMACIST_BRANCHID_REG01,
          branchQR,
        },
        headers: bearer(riderAccessToken),
      });
      expect(pickupOrderRes.ok, pickupOrderRes.error || 'Rider pickup order failed').toBe(true);
      expect(pickupOrderRes.body?.data?.rider?.order?.pickup?.id).toBe(orderId);

      // Mark arrived at drop off as rider.
      const arrivedAtDropOffRes = await safeGraphQL(api, {
        query: RIDER_ARRIVED_AT_DROPOFF_QUERY,
        variables: { orderId },
        headers: bearer(riderAccessToken),
      });
      expect(arrivedAtDropOffRes.ok, arrivedAtDropOffRes.error || 'Rider arrived at drop off failed').toBe(true);
      expect(arrivedAtDropOffRes.body?.data?.rider?.order?.arrivedAtDropOff?.id).toBe(orderId);

      // Complete order as rider.
      const completeOrderRes = await safeGraphQL(api, {
        query: RIDER_COMPLETE_ORDER_QUERY,
        variables: { orderId },
        headers: bearer(riderAccessToken),
      });
      expect(completeOrderRes.ok, completeOrderRes.error || 'Rider complete order failed').toBe(true);
      expect(completeOrderRes.body?.data?.rider?.order?.complete?.id).toBe(orderId);

      // Rate rider as patient.
      const rateRiderRes = await safeGraphQL(api, {
        query: PATIENT_RATE_RIDER_QUERY,
        variables: {
          rating: {
            riderId: Number(assignedRiderId || process.env.RIDER_USERID),
            rating: 4,
          },
        },
        headers: bearer(patientAccessToken),
      });
      expect(rateRiderRes.ok, rateRiderRes.error || 'Patient rate rider failed').toBe(true);
      expect.soft(rateRiderRes.body?.data?.patient?.order?.rateRider?.rating).toBe(4);
    }
  );

  test(
    'PHARMA-335 | DeliverX with attachment and no prescription items using shared role steps',
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
      // Login as patient.
      const { patientAccessToken } = await loginPatient(api);
      // Submit order as patient.
      const { orderId } = await submitOrderAsPatient(api, {
        patientAccessToken,
        order: buildDeliverXAttachmentNoPrescriptionOrderInput(),
      });

      // Login as pharmacist.
      const { pharmacistAccessToken } = await loginPharmacist(api);
      // Accept order as pharmacist.
      await acceptOrderAsPharmacist(api, { pharmacistAccessToken, orderId });

      // Add first prescription item as pharmacist.
      await addPrescriptionItemAsPharmacist(api, {
        pharmacistAccessToken,
        orderId,
        prescriptionItem: {
          medicineId: 2,
          quantity: 5,
          unitPrice: 200.0,
          specialInstructions: 'API automated test only',
          source: 'SEARCH',
        },
      });

      // Add second prescription item as pharmacist.
      const { prescriptionItemId } = await addPrescriptionItemAsPharmacist(api, {
        pharmacistAccessToken,
        orderId,
        prescriptionItem: {
          medicineId: 3,
          quantity: 2,
          unitPrice: 150.0,
          specialInstructions: 'API automated test only',
          source: 'SEARCH',
        },
      });

      // Replace medicine as pharmacist.
      await replaceMedicineAsPharmacist(api, {
        pharmacistAccessToken,
        orderId,
        prescriptionItemId,
        prescriptionItem: {
          medicineId: 4,
          quantity: 1,
          unitPrice: 35.0,
          specialInstructions: 'API automated test only',
          source: 'SEARCH',
        },
      });

      // Send quote as pharmacist.
      await sendQuoteAsPharmacist(api, { pharmacistAccessToken, orderId });
      // Accept quote as patient.
      await acceptQuoteAsPatient(api, { patientAccessToken, orderId });
      // Pay order as patient.
      await payOrderAsPatient(api, { patientAccessToken, orderId });

      // Login as rider admin.
      const { adminAccessToken } = await loginAdmin(api);
      // Confirm payment as rider admin.
      await confirmPaymentAsAdmin(api, { adminAccessToken, orderId });

      // Prepare order as pharmacist.
      await prepareOrderAsPharmacist(api, { pharmacistAccessToken, orderId });
      // Set order for pickup as pharmacist.
      await setOrderForPickupAsPharmacist(api, { pharmacistAccessToken, orderId });

      // Assign rider to order as rider admin.
      const { assignedRiderId } = await assignRiderToOrderAsAdmin(api, {
        adminAccessToken,
        orderId,
        riderId: process.env.RIDER_USERID,
      });

      // Login as rider.
      const { riderAccessToken } = await loginRider(api);
      // Start pickup order as rider.
      await startPickupOrderAsRider(api, { riderAccessToken, orderId });

      // Mark arrived at pharmacy as rider.
      const { branchQR } = await arrivedAtPharmacyAsRider(api, {
        riderAccessToken,
        orderId,
        branchId: process.env.PHARMACIST_BRANCHID_REG01,
      });

      // Set pickup proof as rider.
      await setPickupProofAsRider(api, {
        riderAccessToken,
        orderId,
        branchId: process.env.PHARMACIST_BRANCHID_REG01,
        proof: { photo: 'pp-123456-8888-5643.png' },
      });

      // Pickup order as rider.
      await pickupOrderAsRider(api, {
        riderAccessToken,
        orderId,
        branchId: process.env.PHARMACIST_BRANCHID_REG01,
        branchQR,
      });

      // Mark arrived at drop off as rider.
      await arrivedAtDropOffAsRider(api, { riderAccessToken, orderId });
      // Complete order as rider.
      await completeOrderAsRider(api, { riderAccessToken, orderId });

      // Rate rider as patient.
      await rateRiderAsPatient(api, {
        patientAccessToken,
        riderId: assignedRiderId || process.env.RIDER_USERID,
        rating: 4,
      });
    }
  );

  test(
    'PHARMA-336 | DeliverX pickup order fulfillment happy path',
    {
      tag: ['@api', '@workflow', '@deliverx', '@patient', '@pharmacist', '@admin', '@positive', '@pharma-336'],
    },
    async ({ api }) => {
      // Login as patient.
      const { patientAccessToken } = await loginPatient(api);
      // Submit order as patient.
      const { orderId } = await submitOrderAsPatient(api, {
        patientAccessToken,
        order: buildDeliverXDeclinedOrderInput(),
      });

      // Login as pharmacist.
      const { pharmacistAccessToken } = await loginPharmacist(api);
      // Accept order as pharmacist.
      await acceptOrderAsPharmacist(api, { pharmacistAccessToken, orderId });
      // Update prices as pharmacist.
      await updatePricesAsPharmacist(api, {
        pharmacistAccessToken,
        orderId,
        prices: [
          { medicineId: 1, quantity: 1, unitPrice: 10 },
          { medicineId: 2, quantity: 1, unitPrice: 12 },
        ],
      });
      // Send quote as pharmacist.
      await sendQuoteAsPharmacist(api, { pharmacistAccessToken, orderId });

      // Accept quote as patient.
      await acceptQuoteAsPatient(api, { patientAccessToken, orderId });
      // Pay order as patient (pickup mode).
      await payOrderAsPatient(api, {
        patientAccessToken,
        orderId,
        proof: {
          fulfillmentMode: 'PICKUP',
          photo: 'pp-123456-8888-5643.png',
        },
      });

      // Login as rider admin.
      const { adminAccessToken } = await loginAdmin(api);
      // Confirm payment as rider admin.
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
      tag: ['@api', '@workflow', '@deliverx', '@patient', '@pharmacist', '@rider', '@admin', '@positive', '@pharma-337'],
    },
    async ({ api }) => {
      // Login as patient.
      const { patientAccessToken } = await loginPatient(api);
      // Submit order as patient.
      const { orderId } = await submitOrderAsPatient(api, {
        patientAccessToken,
        order: buildDeliverXDeclinedOrderInput(),
      });

      // Login as pharmacist.
      const { pharmacistAccessToken } = await loginPharmacist(api);
      // Accept order as pharmacist.
      await acceptOrderAsPharmacist(api, { pharmacistAccessToken, orderId });
      // Update prices as pharmacist.
      await updatePricesAsPharmacist(api, {
        pharmacistAccessToken,
        orderId,
        prices: [
          { medicineId: 1, quantity: 1, unitPrice: 10 },
          { medicineId: 2, quantity: 1, unitPrice: 12 },
        ],
      });
      // Send quote as pharmacist.
      await sendQuoteAsPharmacist(api, { pharmacistAccessToken, orderId });

      // Accept quote as patient.
      await acceptQuoteAsPatient(api, { patientAccessToken, orderId });
      // Pay order as patient.
      await payOrderAsPatient(api, { patientAccessToken, orderId });

      // Login as rider admin.
      const { adminAccessToken } = await loginAdmin(api);
      // Confirm payment as rider admin.
      await confirmPaymentAsAdmin(api, { adminAccessToken, orderId });

      // Prepare order as pharmacist.
      await prepareOrderAsPharmacist(api, { pharmacistAccessToken, orderId });
      // Set order for pickup as pharmacist.
      await setOrderForPickupAsPharmacist(api, { pharmacistAccessToken, orderId });

      // Assign rider to order as rider admin.
      await assignRiderToOrderAsAdmin(api, {
        adminAccessToken,
        orderId,
        riderId: process.env.RIDER_USERID,
      });

      // Login as rider.
      const { riderAccessToken } = await loginRider(api);
      // Start pickup order as rider.
      await startPickupOrderAsRider(api, { riderAccessToken, orderId });

      // Mark arrived at pharmacy as rider.
      const { branchQR } = await arrivedAtPharmacyAsRider(api, {
        riderAccessToken,
        orderId,
        branchId: process.env.PHARMACIST_BRANCHID_REG01,
      });

      // Set pickup proof as rider.
      await setPickupProofAsRider(api, {
        riderAccessToken,
        orderId,
        branchId: process.env.PHARMACIST_BRANCHID_REG01,
        proof: { photo: 'pp-123456-8888-5643.png' },
      });

      // Pickup order as rider.
      await pickupOrderAsRider(api, {
        riderAccessToken,
        orderId,
        branchId: process.env.PHARMACIST_BRANCHID_REG01,
        branchQR,
      });

      // Mark arrived at drop off as rider.
      await arrivedAtDropOffAsRider(api, { riderAccessToken, orderId });
      // Complete order as rider.
      await completeOrderAsRider(api, { riderAccessToken, orderId });
    }
  );
});
