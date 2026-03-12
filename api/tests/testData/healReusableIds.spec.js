import { test, expect } from '../../globalConfig.api.js';
import path from 'node:path';
import { bearer, safeGraphQL } from '../../helpers/testUtilsAPI.js';
import { buildDeliverXBaseOrderInput, buildDeliverXBasePriceItems } from '../e2e/deliverx/deliverx.testData.js';
import { buildFindMyMedsBaseOrderInput } from '../e2e/findMyMeds/findMyMeds.testData.js';
import {
  loginPatient,
  submitOrderAsPatient,
  getProofOfPaymentUploadUrlAsPatient,
  payOrderAsPatient,
  uploadImageToSignedUrl,
  acceptQuoteAsPatient,
} from '../e2e/shared/steps/patient.steps.js';
import {
  loginPharmacist,
  loginPsePharmacist,
  acceptOrderAsPharmacist,
  updatePricesAsPharmacist,
  sendQuoteAsPharmacist,
  declineOrderAsPharmacist,
  prepareOrderAsPharmacist,
  setOrderForPickupAsPharmacist,
} from '../e2e/shared/steps/pharmacist.steps.js';
import { loginAdmin, confirmPaymentAsAdmin, assignRiderToOrderAsAdmin } from '../e2e/shared/steps/admin.steps.js';
import {
  getReusableTestIds,
  normalizeSlotName,
  resolveTestEnv,
  updateReusableTestIds,
  updateReusableNegativeFixtures,
} from './reusableTestIds.js';
import {
  PATIENT_GET_CHAT_THREAD_WITH_ID_QUERY,
  PATIENT_SEND_ORDER_MESSAGE_WITH_ID_MUTATION,
  PHARMACIST_SEND_THREAD_MESSAGE_WITH_ID_MUTATION,
} from './reusableTestIds.queries.js';

const CHAT_PARTIES_TYPE = 'PATIENT_PHARMACY';

async function healNegativeFixtures(api) {
  const paymentProofImagePath = path.resolve('upload/images/proof1.png');

  const { patientAccessToken } = await loginPatient(api);
  const { pharmacistAccessToken } = await loginPharmacist(api);
  const { adminAccessToken } = await loginAdmin(api);

  const { orderId: inactiveOrderId } = await submitOrderAsPatient(api, {
    patientAccessToken,
    order: buildDeliverXBaseOrderInput(),
  });

  await declineOrderAsPharmacist(api, {
    pharmacistAccessToken,
    orderId: inactiveOrderId,
    reason: 'Declined via reusable ID healer',
  });

  const { orderId: unassignedOrderId } = await submitOrderAsPatient(api, {
    patientAccessToken,
    order: buildDeliverXBaseOrderInput(),
  });

  await acceptOrderAsPharmacist(api, { pharmacistAccessToken, orderId: unassignedOrderId });
  await updatePricesAsPharmacist(api, {
    pharmacistAccessToken,
    orderId: unassignedOrderId,
    prices: buildDeliverXBasePriceItems(),
  });
  await sendQuoteAsPharmacist(api, {
    pharmacistAccessToken,
    orderId: unassignedOrderId,
  });
  await acceptQuoteAsPatient(api, {
    patientAccessToken,
    orderId: unassignedOrderId,
  });

  const { proofOfPaymentUploadUrl, proofOfPaymentBlobName } = await getProofOfPaymentUploadUrlAsPatient(api, {
    patientAccessToken,
  });
  await uploadImageToSignedUrl(api, {
    uploadUrl: proofOfPaymentUploadUrl,
    imagePath: paymentProofImagePath,
  });
  await payOrderAsPatient(api, {
    patientAccessToken,
    orderId: unassignedOrderId,
    proof: {
      fulfillmentMode: 'DELIVERY',
      photo: proofOfPaymentBlobName,
    },
  });

  await confirmPaymentAsAdmin(api, {
    adminAccessToken,
    orderId: unassignedOrderId,
  });
  await prepareOrderAsPharmacist(api, {
    pharmacistAccessToken,
    orderId: unassignedOrderId,
  });
  await setOrderForPickupAsPharmacist(api, {
    pharmacistAccessToken,
    orderId: unassignedOrderId,
  });
  await assignRiderToOrderAsAdmin(api, {
    adminAccessToken,
    orderId: unassignedOrderId,
    riderId: 1,
  });

  return {
    inactiveOrderId: Number(inactiveOrderId),
    unassignedOrderId: Number(unassignedOrderId),
  };
}

async function healIdsOnSlot(api, slot) {
  const testEnv = resolveTestEnv();
  const slotName = normalizeSlotName(slot);
  const existingSlotData = getReusableTestIds({ env: testEnv, slot: slotName });

  if (!['REGULAR', 'PSE'].includes(existingSlotData.pharmacistType)) {
    throw new Error(
      `Unsupported pharmacistType="${existingSlotData.pharmacistType}" for ${testEnv}.${slotName}`
    );
  }

  const { patientAccessToken } = await loginPatient(api);
  const pharmacistLogin =
    existingSlotData.pharmacistType === 'PSE' ? loginPsePharmacist : loginPharmacist;
  const { pharmacistAccessToken } = await pharmacistLogin(api);
  const orderInput =
    existingSlotData.pharmacistType === 'PSE' ? buildFindMyMedsBaseOrderInput() : buildDeliverXBaseOrderInput();

  const { orderId } = await submitOrderAsPatient(api, {
    patientAccessToken,
    order: orderInput,
  });

  await acceptOrderAsPharmacist(api, { pharmacistAccessToken, orderId });

  const patientMessage = `Reusable slot ${slotName} patient message ${Date.now()}`;
  const sendPatientMessageRes = await safeGraphQL(api, {
    query: PATIENT_SEND_ORDER_MESSAGE_WITH_ID_MUTATION,
    variables: {
      orderId,
      chat: {
        sender: 'PATIENT',
        message: patientMessage,
      },
    },
    headers: bearer(patientAccessToken),
  });
  expect(
    sendPatientMessageRes.ok,
    sendPatientMessageRes.error || 'Patient reusable message creation failed'
  ).toBe(true);

  const patientMessageNode = sendPatientMessageRes.body?.data?.patient?.chat?.sendOrderMessage;
  expect(patientMessageNode?.id, 'Missing patient message id').toBeTruthy();

  const getThreadRes = await safeGraphQL(api, {
    query: PATIENT_GET_CHAT_THREAD_WITH_ID_QUERY,
    variables: {
      orderId,
      type: CHAT_PARTIES_TYPE,
    },
    headers: bearer(patientAccessToken),
  });
  expect(getThreadRes.ok, getThreadRes.error || 'Reusable thread lookup failed').toBe(true);

  const threadNode = getThreadRes.body?.data?.patient?.chat?.thread;
  expect(threadNode?.id, 'Missing thread id after patient message').toBeTruthy();

  const merchantMessage = `Reusable slot ${slotName} merchant message ${Date.now()}`;
  const sendMerchantMessageRes = await safeGraphQL(api, {
    query: PHARMACIST_SEND_THREAD_MESSAGE_WITH_ID_MUTATION,
    variables: {
      threadId: threadNode.id,
      chat: {
        sender: 'PHARMACIST',
        message: merchantMessage,
      },
    },
    headers: bearer(pharmacistAccessToken),
  });
  expect(
    sendMerchantMessageRes.ok,
    sendMerchantMessageRes.error || 'Merchant reusable message creation failed'
  ).toBe(true);

  const merchantMessageNode = sendMerchantMessageRes.body?.data?.pharmacy?.chat?.sendThreadMessage;
  expect(merchantMessageNode?.id, 'Missing merchant message id').toBeTruthy();

  const negativeFixtures = await healNegativeFixtures(api);

  const updatedSlotData = updateReusableTestIds({
    env: testEnv,
    slot: slotName,
    data: {
      orderId: Number(orderId),
      threadId: Number(threadNode.id),
      patientMsgId: Number(patientMessageNode.id),
      merchantMsgId: Number(merchantMessageNode.id),
      updatedAt: new Date().toISOString(),
    },
  });
  updateReusableNegativeFixtures({
    env: testEnv,
    data: negativeFixtures,
  });

  console.log(
    JSON.stringify(
      {
        env: testEnv,
        slot: slotName,
        pharmacistType: updatedSlotData.pharmacistType,
        orderId: updatedSlotData.orderId,
        threadId: updatedSlotData.threadId,
        patientMsgId: updatedSlotData.patientMsgId,
        merchantMsgId: updatedSlotData.merchantMsgId,
        inactiveOrderId: negativeFixtures.inactiveOrderId,
        unassignedOrderId: negativeFixtures.unassignedOrderId,
      },
      null,
      2
    )
  );
}

test.describe('Manual reusable ID healer', () => {
  test(
    'HEALER | Rebuild reusable IDs for one slot',
    {
      tag: ['@api', '@manual', '@healer'],
    },
    async ({ api }) => {
      const slot = process.env.HEAL_SLOT;
      if (!slot) {
        throw new Error('Missing HEAL_SLOT. Use slotOne/slotTwo or 1/2.');
      }

      await healIdsOnSlot(api, slot);
    }
  );
});
