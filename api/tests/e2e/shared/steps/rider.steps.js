import { expect } from '../../../../globalConfig.api.js';
import { safeGraphQL, bearer, riderLoginAndGetTokens } from '../../../../helpers/testUtilsAPI.js';
import {
  RIDER_START_PICKUP_ORDER_QUERY,
  RIDER_ARRIVED_AT_PHARMACY_QUERY,
  RIDER_GET_PAYMENT_QR_CODE_UPLOAD_URL_QUERY,
  RIDER_SAVE_PAYMENT_QR_CODE_QUERY,
  RIDER_SEND_PAYMENT_QR_CODE_QUERY,
  RIDER_GET_PICKUP_PROOF_UPLOAD_URL_QUERY,
  RIDER_SET_PICKUP_PROOF_QUERY,
  RIDER_PICKUP_ORDER_QUERY,
  RIDER_PICKUP_ORDER_NO_QR_QUERY,
  RIDER_GET_DELIVERY_PROOF_UPLOAD_URL_QUERY,
  RIDER_ARRIVED_AT_DROPOFF_QUERY,
  RIDER_SET_DELIVERY_PROOF_QUERY,
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

export async function arrivedAtPharmacyAsRider(api, { riderAccessToken, orderId, branchId, requireBranchQR = true }) {
  const arrivedAtPharmacyRes = await safeGraphQL(api, {
    query: RIDER_ARRIVED_AT_PHARMACY_QUERY,
    variables: { orderId, branchId },
    headers: bearer(riderAccessToken),
  });
  expect(arrivedAtPharmacyRes.ok, arrivedAtPharmacyRes.error || 'Rider arrived at pharmacy failed').toBe(true);
  expect(arrivedAtPharmacyRes.body?.data?.rider?.order?.arrivedAtPharmacy?.id).toBe(orderId);
  const arrivedNode = arrivedAtPharmacyRes.body?.data?.rider?.order?.arrivedAtPharmacy;
  const legs = arrivedNode?.legs || [];
  const branchQR = legs.find((leg) => leg?.branchQR)?.branchQR || null;
  if (requireBranchQR) {
    expect(branchQR, `Missing branchQR from arrivedAtPharmacy response: ${JSON.stringify(arrivedNode)}`).toBeTruthy();
  }
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

export async function getPaymentQRCodeUploadUrlAsRider(api, { riderAccessToken, ext = 'png' }) {
  const getPaymentQRCodeUploadUrlRes = await safeGraphQL(api, {
    query: RIDER_GET_PAYMENT_QR_CODE_UPLOAD_URL_QUERY,
    variables: { ext },
    headers: bearer(riderAccessToken),
  });
  expect(
    getPaymentQRCodeUploadUrlRes.ok,
    getPaymentQRCodeUploadUrlRes.error || 'Rider get payment QR code upload URL failed'
  ).toBe(true);
  const node = getPaymentQRCodeUploadUrlRes.body?.data?.rider?.paymentQRCodeUploadURL;
  expect(node?.url, 'Missing rider payment QR code upload URL').toBeTruthy();
  expect(node?.blobName, 'Missing rider payment QR code blobName').toBeTruthy();
  return { riderPaymentQRCodeUploadUrl: node.url, riderPaymentQRCodeBlobName: node.blobName };
}

export async function savePaymentQRCodeAsRider(api, { riderAccessToken, photo }) {
  const savePaymentQRCodeRes = await safeGraphQL(api, {
    query: RIDER_SAVE_PAYMENT_QR_CODE_QUERY,
    variables: { qrCode: { photo } },
    headers: bearer(riderAccessToken),
  });
  expect(savePaymentQRCodeRes.ok, savePaymentQRCodeRes.error || 'Rider save payment QR code failed').toBe(true);
  const node = savePaymentQRCodeRes.body?.data?.rider?.order?.savePaymentQRCode;
  expect(node?.id, 'Missing rider saved payment QR code id').toBeTruthy();
  return { riderPaymentQRCodeId: node.id };
}

export async function sendPaymentQRCodeAsRider(api, { riderAccessToken, orderId, branchId, paymentQRCodeId }) {
  const sendPaymentQRCodeRes = await safeGraphQL(api, {
    query: RIDER_SEND_PAYMENT_QR_CODE_QUERY,
    variables: { orderId, branchId, paymentQRCodeId },
    headers: bearer(riderAccessToken),
  });
  expect(sendPaymentQRCodeRes.ok, sendPaymentQRCodeRes.error || 'Rider send payment QR code failed').toBe(true);
  const node = sendPaymentQRCodeRes.body?.data?.rider?.order?.sendPaymentQRCode;
  expect(node?.id).toBe(orderId);
}

export async function getPickupProofUploadUrlAsRider(api, { riderAccessToken, ext = 'png' }) {
  const getPickupProofUploadUrlRes = await safeGraphQL(api, {
    query: RIDER_GET_PICKUP_PROOF_UPLOAD_URL_QUERY,
    variables: { ext },
    headers: bearer(riderAccessToken),
  });
  expect(
    getPickupProofUploadUrlRes.ok,
    getPickupProofUploadUrlRes.error || 'Rider get pickup proof upload URL failed'
  ).toBe(true);
  const node = getPickupProofUploadUrlRes.body?.data?.rider?.proofOfPickupUploadURL;
  expect(node?.url, 'Missing pickup proof upload URL').toBeTruthy();
  expect(node?.blobName, 'Missing pickup proof blobName').toBeTruthy();
  return { pickupProofUploadUrl: node.url, pickupProofBlobName: node.blobName };
}

export async function pickupOrderAsRider(api, { riderAccessToken, orderId, branchId, branchQR, requireBranchQR = true }) {
  if (requireBranchQR && !branchQR) {
    throw new Error('Missing branchQR for pickup when requireBranchQR is true');
  }
  const pickupOrderRes = await safeGraphQL(api, {
    query: requireBranchQR ? RIDER_PICKUP_ORDER_QUERY : RIDER_PICKUP_ORDER_NO_QR_QUERY,
    variables: requireBranchQR ? { orderId, branchId, branchQR } : { orderId, branchId },
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

export async function getDeliveryProofUploadUrlAsRider(api, { riderAccessToken, ext = 'png' }) {
  const getDeliveryProofUploadUrlRes = await safeGraphQL(api, {
    query: RIDER_GET_DELIVERY_PROOF_UPLOAD_URL_QUERY,
    variables: { ext },
    headers: bearer(riderAccessToken),
  });
  expect(
    getDeliveryProofUploadUrlRes.ok,
    getDeliveryProofUploadUrlRes.error || 'Rider get delivery proof upload URL failed'
  ).toBe(true);
  const node = getDeliveryProofUploadUrlRes.body?.data?.rider?.proofOfDeliveryUploadURL;
  expect(node?.url, 'Missing delivery proof upload URL').toBeTruthy();
  expect(node?.blobName, 'Missing delivery proof blobName').toBeTruthy();
  return { deliveryProofUploadUrl: node.url, deliveryProofBlobName: node.blobName };
}

export async function setDeliveryProofAsRider(api, { riderAccessToken, orderId, proof }) {
  const setDeliveryProofRes = await safeGraphQL(api, {
    query: RIDER_SET_DELIVERY_PROOF_QUERY,
    variables: { orderId, proof },
    headers: bearer(riderAccessToken),
  });
  expect(setDeliveryProofRes.ok, setDeliveryProofRes.error || 'Rider set delivery proof failed').toBe(true);
  expect(setDeliveryProofRes.body?.data?.rider?.order?.setDeliveryProof?.photo).toBeTruthy();
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
