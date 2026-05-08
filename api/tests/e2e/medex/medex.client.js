import { expect } from '../../../globalConfig.api.js';
import { bearer, safeGraphQL } from '../../../helpers/graphqlUtils.js';
import {
  MEDEX_CANCEL_ORDER_PAYLOAD,
  MEDEX_CONFIRM_ORDER_PAYLOAD,
  MEDEX_LOGIN_PATH,
  MEDEX_SET_FOR_PICKUP_PAYLOAD,
  buildMedexOrderStatusPath,
} from './medexQueries.js';
import { CANCEL_MEDEX_ORDER_AS_PATIENT_QUERY } from './medex.orderQueries.js';
import { PATIENT_ACCEPT_QUOTE_QUERY } from '../shared/queries/patient.queries.js';

const MEDEX_QUOTE_NOT_SENT_ERROR = 'Quote cannot be accepted since it has not been sent by pharmacy yet.';

function getMedexCredentialsFromEnv() {
  const username = String(process.env.MEDEX_USERNAME || '').trim();
  const password = String(process.env.MEDEX_PASSWORD || '').trim();

  if (!username || !password) {
    throw new Error('Missing MedEx credentials. Expected MEDEX_USERNAME and MEDEX_PASSWORD in QA env.');
  }

  return { username, password };
}

async function readJsonResponse(res) {
  const bodyText = await res.text();
  try {
    return bodyText ? JSON.parse(bodyText) : {};
  } catch {
    return { rawBody: bodyText };
  }
}

async function updateOrderStatusAsMedex(api, { medexAccessToken, trackingCode, payload, actionLabel }) {
  const statusRes = await api.fetch(buildMedexOrderStatusPath(trackingCode), {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${medexAccessToken}`,
    },
    data: payload,
  });
  const statusBody = await readJsonResponse(statusRes);
  expect(statusRes.ok(), `MedEx ${actionLabel} failed with HTTP ${statusRes.status()}: ${JSON.stringify(statusBody)}`).toBe(
    true
  );
  return { statusBody };
}

export async function loginMedex(api) {
  const loginRes = await api.fetch(MEDEX_LOGIN_PATH, {
    method: 'POST',
    data: getMedexCredentialsFromEnv(),
  });
  const loginBody = await readJsonResponse(loginRes);
  expect(loginRes.ok(), `MedEx login failed with HTTP ${loginRes.status()}: ${JSON.stringify(loginBody)}`).toBe(true);

  const medexAccessToken = loginBody?.access_token;
  expect(medexAccessToken, 'Missing MedEx access_token from login response').toBeTruthy();

  return { medexAccessToken, loginBody };
}

export async function confirmOrderAsMedex(api, { medexAccessToken, trackingCode }) {
  return updateOrderStatusAsMedex(api, {
    medexAccessToken,
    trackingCode,
    payload: MEDEX_CONFIRM_ORDER_PAYLOAD,
    actionLabel: 'confirm order',
  });
}

export async function setOrderForPickupAsMedex(api, { medexAccessToken, trackingCode }) {
  return updateOrderStatusAsMedex(api, {
    medexAccessToken,
    trackingCode,
    payload: MEDEX_SET_FOR_PICKUP_PAYLOAD,
    actionLabel: 'set for pickup',
  });
}

export async function cancelOrderAsMedex(api, { medexAccessToken, trackingCode }) {
  return updateOrderStatusAsMedex(api, {
    medexAccessToken,
    trackingCode,
    payload: MEDEX_CANCEL_ORDER_PAYLOAD,
    actionLabel: 'cancel order',
  });
}

export async function confirmOrderAsMedexWithRx(api, { medexAccessToken, trackingCode }) {
  return confirmOrderAsMedex(api, { medexAccessToken, trackingCode });
}

export async function setOrderForPickupAsMedexWithRx(api, { medexAccessToken, trackingCode }) {
  return setOrderForPickupAsMedex(api, { medexAccessToken, trackingCode });
}

export async function acceptQuoteAsPatientForMedex(api, { patientAccessToken, orderId }) {
  const acceptQuoteRes = await safeGraphQL(api, {
    query: PATIENT_ACCEPT_QUOTE_QUERY,
    variables: { orderId },
    headers: bearer(patientAccessToken),
  });

  if (acceptQuoteRes.ok) {
    const acceptQuoteNode = acceptQuoteRes.body?.data?.patient?.order?.acceptQuote;
    expect(acceptQuoteNode?.id).toBe(orderId);
    return { acceptQuoteNode, quoteNotSent: false };
  }

  const isQuoteNotSent = acceptQuoteRes.httpStatus === 409 ||
    String(acceptQuoteRes.errorMessage || acceptQuoteRes.error || '').includes(MEDEX_QUOTE_NOT_SENT_ERROR);

  if (isQuoteNotSent) {
    return { acceptQuoteNode: null, quoteNotSent: true };
  }

  expect(acceptQuoteRes.ok, acceptQuoteRes.error || 'Patient accept quote failed').toBe(true);
  return { acceptQuoteNode: null, quoteNotSent: false };
}

export async function cancelOrderAsPatientForMedex(api, { patientAccessToken, orderId }) {
  const cancelOrderRes = await safeGraphQL(api, {
    query: CANCEL_MEDEX_ORDER_AS_PATIENT_QUERY,
    variables: { orderId },
    headers: bearer(patientAccessToken),
  });
  expect(cancelOrderRes.ok, cancelOrderRes.error || 'Patient cancel order failed').toBe(true);
  const cancelNode = cancelOrderRes.body?.data?.patient?.order?.cancel;
  expect(cancelNode, 'Missing patient.order.cancel response').toBeTruthy();
  return { cancelNode };
}
