import { expect } from '../../../../globalConfig.api.js';
import { safeGraphQL, bearer, riderLoginAndGetTokens } from '../../../../helpers/testUtilsAPI.js';
import {
  RIDER_START_PICKUP_ORDER_QUERY,
  RIDER_ARRIVED_AT_PHARMACY_QUERY,
  RIDER_SET_PICKUP_PROOF_QUERY,
  RIDER_PICKUP_ORDER_QUERY,
  RIDER_ARRIVED_AT_DROPOFF_QUERY,
  RIDER_COMPLETE_ORDER_QUERY,
} from '../queries/rider.queries.js';

export async function loginRider(api) {
  const { accessToken: riderAccessToken, raw: riderLoginRes } = await riderLoginAndGetTokens(api, {
    username: process.env.RIDER_USERNAME,
    password: process.env.RIDER_PASSWORD,
  });
  expect(riderLoginRes.ok, riderLoginRes.error || 'Rider login failed').toBe(true);
  return { riderAccessToken };
}

export async function startPickupOrderAsRider(api, { riderAccessToken, orderId }) {
  const startPickupOrderRes = await safeGraphQL(api, {
    query: RIDER_START_PICKUP_ORDER_QUERY,
    variables: { orderId },
    headers: bearer(riderAccessToken),
  });
  expect(startPickupOrderRes.ok, startPickupOrderRes.error || 'Rider start pickup order failed').toBe(true);
  expect(startPickupOrderRes.body?.data?.rider?.order?.start?.id).toBe(orderId);
}

export async function arrivedAtPharmacyAsRider(api, { riderAccessToken, orderId, branchId }) {
  const arrivedAtPharmacyRes = await safeGraphQL(api, {
    query: RIDER_ARRIVED_AT_PHARMACY_QUERY,
    variables: { orderId, branchId },
    headers: bearer(riderAccessToken),
  });
  expect(arrivedAtPharmacyRes.ok, arrivedAtPharmacyRes.error || 'Rider arrived at pharmacy failed').toBe(true);
  expect(arrivedAtPharmacyRes.body?.data?.rider?.order?.arrivedAtPharmacy?.id).toBe(orderId);
  const branchQR = arrivedAtPharmacyRes.body?.data?.rider?.order?.arrivedAtPharmacy?.legs?.[0]?.branchQR;
  expect(branchQR, 'Missing branchQR from arrivedAtPharmacy response').toBeTruthy();
  return { branchQR };
}

export async function setPickupProofAsRider(api, { riderAccessToken, orderId, branchId, proof }) {
  const setPickupProofRes = await safeGraphQL(api, {
    query: RIDER_SET_PICKUP_PROOF_QUERY,
    variables: { orderId, branchId, proof },
    headers: bearer(riderAccessToken),
  });
  expect(setPickupProofRes.ok, setPickupProofRes.error || 'Rider set pickup proof failed').toBe(true);
  expect(setPickupProofRes.body?.data?.rider?.order?.setPickupProof?.photo).toBeTruthy();
}

export async function pickupOrderAsRider(api, { riderAccessToken, orderId, branchId, branchQR }) {
  const pickupOrderRes = await safeGraphQL(api, {
    query: RIDER_PICKUP_ORDER_QUERY,
    variables: { orderId, branchId, branchQR },
    headers: bearer(riderAccessToken),
  });
  expect(pickupOrderRes.ok, pickupOrderRes.error || 'Rider pickup order failed').toBe(true);
  expect(pickupOrderRes.body?.data?.rider?.order?.pickup?.id).toBe(orderId);
}

export async function arrivedAtDropOffAsRider(api, { riderAccessToken, orderId }) {
  const arrivedAtDropOffRes = await safeGraphQL(api, {
    query: RIDER_ARRIVED_AT_DROPOFF_QUERY,
    variables: { orderId },
    headers: bearer(riderAccessToken),
  });
  expect(arrivedAtDropOffRes.ok, arrivedAtDropOffRes.error || 'Rider arrived at drop off failed').toBe(true);
  expect(arrivedAtDropOffRes.body?.data?.rider?.order?.arrivedAtDropOff?.id).toBe(orderId);
}

export async function completeOrderAsRider(api, { riderAccessToken, orderId }) {
  const completeOrderRes = await safeGraphQL(api, {
    query: RIDER_COMPLETE_ORDER_QUERY,
    variables: { orderId },
    headers: bearer(riderAccessToken),
  });
  expect(completeOrderRes.ok, completeOrderRes.error || 'Rider complete order failed').toBe(true);
  expect(completeOrderRes.body?.data?.rider?.order?.complete?.id).toBe(orderId);
}
