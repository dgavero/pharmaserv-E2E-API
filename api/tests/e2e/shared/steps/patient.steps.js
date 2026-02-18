import { expect } from '../../../../globalConfig.api.js';
import fs from 'node:fs';
import { safeGraphQL, bearer, loginAndGetTokens } from '../../../../helpers/testUtilsAPI.js';
import {
  PATIENT_SUBMIT_ORDER_QUERY,
  PATIENT_GET_PRESCRIPTION_UPLOAD_URL_QUERY,
  PATIENT_GET_DISCOUNT_UPLOAD_URL_QUERY,
  PATIENT_SAVE_DISCOUNT_CARD_QUERY,
  PATIENT_GET_ATTACHMENT_UPLOAD_URL_QUERY,
  PATIENT_GET_PROOF_OF_PAYMENT_UPLOAD_URL_QUERY,
  PATIENT_GET_PAYMENT_QR_CODE_QUERY,
  PATIENT_GET_BLOB_TOKEN_QUERY,
  PATIENT_ACCEPT_QUOTE_QUERY,
  PATIENT_REQUEST_REQUOTE_QUERY,
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

export async function getPrescriptionUploadUrlAsPatient(api, { patientAccessToken, ext = 'png' }) {
  const getPrescriptionUploadUrlRes = await safeGraphQL(api, {
    query: PATIENT_GET_PRESCRIPTION_UPLOAD_URL_QUERY,
    variables: { ext },
    headers: bearer(patientAccessToken),
  });
  expect(getPrescriptionUploadUrlRes.ok, getPrescriptionUploadUrlRes.error || 'Get prescription upload URL failed').toBe(
    true
  );
  const node = getPrescriptionUploadUrlRes.body?.data?.patient?.prescription?.prescriptionUploadURL;
  expect(node?.url, 'Missing prescription upload URL').toBeTruthy();
  expect(node?.blobName, 'Missing prescription blobName').toBeTruthy();
  return { prescriptionUploadUrl: node.url, prescriptionBlobName: node.blobName };
}

export async function uploadImageToSignedUrl(api, { uploadUrl, imagePath }) {
  const imageBuffer = fs.readFileSync(imagePath);
  const uploadRes = await api.fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'x-ms-blob-type': 'BlockBlob',
      'Content-Type': 'image/png',
    },
    data: imageBuffer,
  });
  const uploadOk = uploadRes.ok();
  expect(uploadOk, `Upload failed for ${imagePath} with status ${uploadRes.status()}`).toBe(true);
}

export async function savePrescriptionAsPatient(api, { patientAccessToken, patientId, photo }) {
  const savePrescriptionRes = await api.post('/api/v1/pharmaserv/prescriptions', {
    headers: bearer(patientAccessToken),
    data: { patientId: Number(patientId), photo },
  });
  expect(savePrescriptionRes.ok(), `Save prescription failed with status ${savePrescriptionRes.status()}`).toBe(true);
  const savePrescriptionBody = await savePrescriptionRes.json();
  const prescriptionId = savePrescriptionBody?.id;
  expect(prescriptionId, 'Missing prescription id from save prescription response').toBeTruthy();
  return { prescriptionId };
}

export async function getDiscountUploadUrlAsPatient(api, { patientAccessToken, ext = 'png' }) {
  const getDiscountUploadUrlRes = await safeGraphQL(api, {
    query: PATIENT_GET_DISCOUNT_UPLOAD_URL_QUERY,
    variables: { ext },
    headers: bearer(patientAccessToken),
  });
  expect(getDiscountUploadUrlRes.ok, getDiscountUploadUrlRes.error || 'Get discount upload URL failed').toBe(true);
  const node = getDiscountUploadUrlRes.body?.data?.patient?.discountCardUploadURL;
  expect(node?.url, 'Missing discount upload URL').toBeTruthy();
  expect(node?.blobName, 'Missing discount blobName').toBeTruthy();
  return { discountUploadUrl: node.url, discountBlobName: node.blobName };
}

export async function saveDiscountCardAsPatient(api, { patientAccessToken, patientId, photo }) {
  const saveDiscountCardRes = await safeGraphQL(api, {
    query: PATIENT_SAVE_DISCOUNT_CARD_QUERY,
    variables: {
      discountCard: {
        patientId: Number(patientId),
        cardType: 'Discount Card',
        name: 'Suki Card - Watsons',
        cardNumber: '2234567890',
        expiryDate: '2030-12-31',
        photo,
      },
    },
    headers: bearer(patientAccessToken),
  });
  expect(saveDiscountCardRes.ok, saveDiscountCardRes.error || 'Save discount card failed').toBe(true);
  const discountCardId = saveDiscountCardRes.body?.data?.patient?.discountCard?.create?.id;
  expect(discountCardId, 'Missing discount card id').toBeTruthy();
  return { discountCardId };
}

export async function getAttachmentUploadUrlAsPatient(api, { patientAccessToken, ext = 'png' }) {
  const getAttachmentUploadUrlRes = await safeGraphQL(api, {
    query: PATIENT_GET_ATTACHMENT_UPLOAD_URL_QUERY,
    variables: { ext },
    headers: bearer(patientAccessToken),
  });
  expect(getAttachmentUploadUrlRes.ok, getAttachmentUploadUrlRes.error || 'Get attachment upload URL failed').toBe(true);
  const node = getAttachmentUploadUrlRes.body?.data?.patient?.attachmentUploadURL;
  expect(node?.url, 'Missing attachment upload URL').toBeTruthy();
  expect(node?.blobName, 'Missing attachment blobName').toBeTruthy();
  return { attachmentUploadUrl: node.url, attachmentBlobName: node.blobName };
}

export async function getProofOfPaymentUploadUrlAsPatient(api, { patientAccessToken, ext = 'png' }) {
  const getProofOfPaymentUploadUrlRes = await safeGraphQL(api, {
    query: PATIENT_GET_PROOF_OF_PAYMENT_UPLOAD_URL_QUERY,
    variables: { ext },
    headers: bearer(patientAccessToken),
  });
  expect(
    getProofOfPaymentUploadUrlRes.ok,
    getProofOfPaymentUploadUrlRes.error || 'Get proof of payment upload URL failed'
  ).toBe(true);
  const node = getProofOfPaymentUploadUrlRes.body?.data?.patient?.proofOfPaymentUploadURL;
  expect(node?.url, 'Missing proof of payment upload URL').toBeTruthy();
  expect(node?.blobName, 'Missing proof of payment blobName').toBeTruthy();
  return { proofOfPaymentUploadUrl: node.url, proofOfPaymentBlobName: node.blobName };
}

export async function getPaymentQRCodeAsPatient(api, { patientAccessToken, paymentQRCodeId }) {
  const getPaymentQRCodeRes = await safeGraphQL(api, {
    query: PATIENT_GET_PAYMENT_QR_CODE_QUERY,
    variables: { paymentQRCodeId },
    headers: bearer(patientAccessToken),
  });
  expect(getPaymentQRCodeRes.ok, getPaymentQRCodeRes.error || 'Patient get payment QR code failed').toBe(true);
  const paymentQRCodeNode = getPaymentQRCodeRes.body?.data?.patient?.paymentQRCode;
  expect(paymentQRCodeNode?.id, 'Missing patient payment QR code id').toBeTruthy();
  expect(paymentQRCodeNode?.photo, 'Missing patient payment QR code photo').toBeTruthy();
  return { paymentQRCodeNode, paymentQRCodePhoto: paymentQRCodeNode.photo };
}

export async function getBlobTokenAsPatient(api, { patientAccessToken, blobName }) {
  const getBlobTokenRes = await safeGraphQL(api, {
    query: PATIENT_GET_BLOB_TOKEN_QUERY,
    variables: { blobName },
    headers: bearer(patientAccessToken),
  });
  expect(getBlobTokenRes.ok, getBlobTokenRes.error || 'Patient get blob token failed').toBe(true);
  const blobTokenNode = getBlobTokenRes.body?.data?.patient?.blobToken;
  expect(blobTokenNode?.blobName, 'Missing blob token blobName').toBeTruthy();
  expect(blobTokenNode?.url, 'Missing blob token url').toBeTruthy();
  return { blobTokenNode, blobViewUrl: blobTokenNode.url };
}

export async function acceptQuoteAsPatient(api, { patientAccessToken, orderId }) {
  const acceptQuoteRes = await safeGraphQL(api, {
    query: PATIENT_ACCEPT_QUOTE_QUERY,
    variables: { orderId },
    headers: bearer(patientAccessToken),
  });
  expect(acceptQuoteRes.ok, acceptQuoteRes.error || 'Patient accept quote failed').toBe(true);
  const acceptQuoteNode = acceptQuoteRes.body?.data?.patient?.order?.acceptQuote;
  expect(acceptQuoteNode?.id).toBe(orderId);
  return { acceptQuoteNode };
}

export async function requestReQuoteAsPatient(api, { patientAccessToken, orderId }) {
  const requestReQuoteRes = await safeGraphQL(api, {
    query: PATIENT_REQUEST_REQUOTE_QUERY,
    variables: { orderId },
    headers: bearer(patientAccessToken),
  });
  expect(requestReQuoteRes.ok, requestReQuoteRes.error || 'Patient request re-quote failed').toBe(true);
  expect(requestReQuoteRes.body?.data?.patient?.order?.requestReQuote?.id).toBe(orderId);
}

export async function payOrderAsPatient(api, { patientAccessToken, orderId, proof }) {
  expect(proof?.photo, 'Missing proof.photo for patient pay order').toBeTruthy();
  const payOrderRes = await safeGraphQL(api, {
    query: PATIENT_PAY_ORDER_QUERY,
    variables: {
      orderId,
      proof,
    },
    headers: bearer(patientAccessToken),
  });
  expect(payOrderRes.ok, payOrderRes.error || 'Patient pay order failed').toBe(true);
  expect(payOrderRes.body?.data?.patient?.order?.pay?.id).toBe(orderId);
}

export async function payOrderAsPatientForPickupOrder(api, { patientAccessToken, orderId, proofPhoto }) {
  const payOrderRes = await safeGraphQL(api, {
    query: PATIENT_PAY_ORDER_QUERY,
    variables: {
      orderId,
      proof: {
        fulfillmentMode: 'PICKUP',
        photo: proofPhoto || 'pp-123456-8888-5643.png',
      },
    },
    headers: bearer(patientAccessToken),
  });
  expect(payOrderRes.ok, payOrderRes.error || 'Patient pay pickup order failed').toBe(true);
  expect(payOrderRes.body?.data?.patient?.order?.pay?.id).toBe(orderId);
}

export async function payOrderAsPatientForScheduledDelivery(api, { patientAccessToken, orderId, proofPhoto }) {
  const manilaHour = Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Manila',
      hour: '2-digit',
      hour12: false,
    }).format(new Date())
  );

  let windowStartTime = '06:00:00.000+08:00';
  let windowEndTime = '12:00:00.000+08:00';
  if (manilaHour >= 12 && manilaHour < 18) {
    windowStartTime = '12:00:00.000+08:00';
    windowEndTime = '18:00:00.000+08:00';
  } else if (manilaHour >= 18) {
    windowStartTime = '18:00:00.000+08:00';
    windowEndTime = '23:59:59.000+08:00';
  }

  const payOrderRes = await safeGraphQL(api, {
    query: PATIENT_PAY_ORDER_QUERY,
    variables: {
      orderId,
      proof: {
        fulfillmentMode: 'SCHEDULED',
        windowDay: 'TODAY',
        windowStartTime,
        windowEndTime,
        photo: proofPhoto || 'pp-2cba3c7a-6985-46c3-a666-bbcef03367c7.png',
      },
    },
    headers: bearer(patientAccessToken),
  });
  expect(payOrderRes.ok, payOrderRes.error || 'Patient pay scheduled delivery order failed').toBe(true);
  expect(payOrderRes.body?.data?.patient?.order?.pay?.id).toBe(orderId);
}

export async function rateRiderAsPatient(api, { patientAccessToken, riderId, rating }) {
  const selectedRating = rating ?? Math.floor(Math.random() * 5) + 1;
  const rateRiderRes = await safeGraphQL(api, {
    query: PATIENT_RATE_RIDER_QUERY,
    variables: { rating: { riderId: Number(riderId), rating: selectedRating } },
    headers: bearer(patientAccessToken),
  });
  expect(rateRiderRes.ok, rateRiderRes.error || 'Patient rate rider failed').toBe(true);
  expect.soft(rateRiderRes.body?.data?.patient?.order?.rateRider?.rating).toBe(selectedRating);
}
