import { expect } from '../../../../globalConfig.api.js';
import { safeGraphQL, bearer, loginAndGetTokens } from '../../../../helpers/testUtilsAPI.js';
import {
  PATIENT_SUBMIT_ORDER_QUERY,
  PATIENT_ACCEPT_QUOTE_QUERY,
  PATIENT_PAY_ORDER_QUERY,
  PATIENT_RATE_RIDER_QUERY,
} from '../queries/patient.queries.js';

export async function loginPatient(api) {
  const { accessToken: patientAccessToken, raw: patientLoginRes } = await loginAndGetTokens(api, {
    username: process.env.PATIENT_USER_USERNAME,
    password: process.env.PATIENT_USER_PASSWORD,
  });
  expect(patientLoginRes.ok, patientLoginRes.error || 'Patient login failed').toBe(true);
  return { patientAccessToken };
}

export async function submitOrderAsPatient(api, { patientAccessToken, order }) {
  const submitOrderRes = await safeGraphQL(api, {
    query: PATIENT_SUBMIT_ORDER_QUERY,
    variables: { order },
    headers: bearer(patientAccessToken),
  });
  expect(submitOrderRes.ok, submitOrderRes.error || 'Patient submit order failed').toBe(true);
  const submitOrderNode = submitOrderRes.body?.data?.patient?.order?.book;
  expect(submitOrderNode, 'Missing patient.order.book').toBeTruthy();
  const orderId = submitOrderNode?.id;
  expect(orderId, 'Missing order id').toBeTruthy();
  return { orderId, submitOrderNode };
}

export async function acceptQuoteAsPatient(api, { patientAccessToken, orderId }) {
  const acceptQuoteRes = await safeGraphQL(api, {
    query: PATIENT_ACCEPT_QUOTE_QUERY,
    variables: { orderId },
    headers: bearer(patientAccessToken),
  });
  expect(acceptQuoteRes.ok, acceptQuoteRes.error || 'Patient accept quote failed').toBe(true);
  expect(acceptQuoteRes.body?.data?.patient?.order?.acceptQuote?.id).toBe(orderId);
}

export async function payOrderAsPatient(api, { patientAccessToken, orderId }) {
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
}

export async function rateRiderAsPatient(api, { patientAccessToken, riderId, rating = 4 }) {
  const rateRiderRes = await safeGraphQL(api, {
    query: PATIENT_RATE_RIDER_QUERY,
    variables: { rating: { riderId: Number(riderId), rating } },
    headers: bearer(patientAccessToken),
  });
  expect(rateRiderRes.ok, rateRiderRes.error || 'Patient rate rider failed').toBe(true);
  expect.soft(rateRiderRes.body?.data?.patient?.order?.rateRider?.rating).toBe(rating);
}
