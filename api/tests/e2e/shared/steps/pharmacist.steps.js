import { expect } from '../../../../globalConfig.api.js';
import { safeGraphQL, bearer, pharmacistLoginAndGetTokens } from '../../../../helpers/testUtilsAPI.js';
import {
  PHARMACY_ACCEPT_ORDER_QUERY,
  PHARMACY_ADD_PRESCRIPTION_ITEM_QUERY,
  PHARMACY_UPDATE_AVAILABLE_PRESCRIPTION_ITEM_QUERY,
  PHARMACY_UPDATE_PRESCRIPTION_ITEM_QUERY,
  PHARMACY_UPDATE_PRICES_QUERY,
  PHARMACY_SEND_QUOTE_QUERY,
  PHARMACY_REMOVE_PRESCRIPTION_ITEM_QUERY,
  PHARMACY_PREPARE_ORDER_QUERY,
  PHARMACY_SET_FOR_PICKUP_QUERY,
  PHARMACY_CONFIRM_PICKUP_QUERY,
  PHARMACY_DECLINE_ORDER_QUERY,
} from '../queries/pharmacist.queries.js';

export async function loginPharmacist(api) {
  const { accessToken: pharmacistAccessToken, raw: pharmacistLoginRes } = await pharmacistLoginAndGetTokens(api, {
    username: process.env.PHARMACIST_USERNAME_REG01,
    password: process.env.PHARMACIST_PASSWORD_REG01,
  });
  expect(pharmacistLoginRes.ok, pharmacistLoginRes.error || 'Pharmacist login failed').toBe(true);
  return { pharmacistAccessToken };
}

export async function loginPsePharmacist(api) {
  const { accessToken: pharmacistAccessToken, raw: pharmacistLoginRes } = await pharmacistLoginAndGetTokens(api, {
    username: process.env.PHARMACIST_USERNAME_PSE01,
    password: process.env.PHARMACIST_PASSWORD_PSE01,
  });
  expect(pharmacistLoginRes.ok, pharmacistLoginRes.error || 'PSE pharmacist login failed').toBe(true);
  return { pharmacistAccessToken };
}

export async function acceptOrderAsPharmacist(api, { pharmacistAccessToken, orderId }) {
  const acceptOrderRes = await safeGraphQL(api, {
    query: PHARMACY_ACCEPT_ORDER_QUERY,
    variables: { orderId },
    headers: bearer(pharmacistAccessToken),
  });
  expect(acceptOrderRes.ok, acceptOrderRes.error || 'Pharmacist accept order failed').toBe(true);
  expect(acceptOrderRes.body?.data?.pharmacy?.order?.accept?.id).toBe(orderId);
}

export async function addPrescriptionItemAsPharmacist(api, { pharmacistAccessToken, orderId, prescriptionItem }) {
  const addPrescriptionItemRes = await safeGraphQL(api, {
    query: PHARMACY_ADD_PRESCRIPTION_ITEM_QUERY,
    variables: { orderId, prescriptionItem },
    headers: bearer(pharmacistAccessToken),
  });
  expect(addPrescriptionItemRes.ok, addPrescriptionItemRes.error || 'Pharmacist add prescription item failed').toBe(
    true
  );
  const addedPrescriptionItem = addPrescriptionItemRes.body?.data?.pharmacy?.order?.addPrescriptionItem;
  expect(addedPrescriptionItem?.id, 'Missing added prescription item id').toBeTruthy();
  expect(addedPrescriptionItem?.medicine?.id, 'Missing added prescription item medicine id').toBeTruthy();
  if (process.env.DEBUG_WORKFLOW_IDS === '1') {
    console.log(
      `[DEBUG_WORKFLOW_IDS] addPrescriptionItem orderId=${orderId} medicineId=${prescriptionItem?.medicineId} prescriptionItemId=${addedPrescriptionItem.id}`
    );
  }
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return { prescriptionItemId: addedPrescriptionItem.id, medicineId: addedPrescriptionItem.medicine.id };
}

export async function updateAvailablePrescriptionItemAsPharmacist(api, {
  pharmacistAccessToken,
  orderId,
  prescriptionItemId,
  medicineId,
  quantity = 1,
  unitPrice = 3000.0,
  vatExempt = true,
  specialInstructions = 'API automated test only',
  source = 'SEARCH',
}) {
  if (process.env.DEBUG_WORKFLOW_IDS === '1') {
    console.log(
      `[DEBUG_WORKFLOW_IDS] updateAvailablePrescriptionItem orderId=${orderId} prescriptionItemId=${prescriptionItemId} medicineId=${medicineId ?? 'N/A'}`
    );
  }
  const updatePrescriptionItemRes = await safeGraphQL(api, {
    query: PHARMACY_UPDATE_AVAILABLE_PRESCRIPTION_ITEM_QUERY,
    variables: {
      orderId,
      prescriptionItemId,
      prescriptionItem: {
        medicineId,
        quantity,
        unitPrice,
        vatExempt,
        specialInstructions,
        source,
      },
    },
    headers: bearer(pharmacistAccessToken),
  });
  expect(
    updatePrescriptionItemRes.ok,
    updatePrescriptionItemRes.error || 'Pharmacist update available prescription item failed'
  ).toBe(true);
  expect(updatePrescriptionItemRes.body?.data?.pharmacy?.order?.updatePrescriptionItem?.id).toBe(prescriptionItemId);
}

export async function replaceMedicineAsPharmacist(api, {
  pharmacistAccessToken,
  orderId,
  prescriptionItemId,
  prescriptionItem,
}) {
  const replaceMedicineRes = await safeGraphQL(api, {
    query: PHARMACY_UPDATE_PRESCRIPTION_ITEM_QUERY,
    variables: { orderId, prescriptionItemId, prescriptionItem },
    headers: bearer(pharmacistAccessToken),
  });
  expect(replaceMedicineRes.ok, replaceMedicineRes.error || 'Pharmacist replace medicine failed').toBe(true);
  expect(replaceMedicineRes.body?.data?.pharmacy?.order?.updatePrescriptionItem?.id).toBe(prescriptionItemId);
}

export async function replaceSetOutOfStockAsPharmacist(api, { pharmacistAccessToken, orderId, prescriptionItemId }) {
  const replaceSetOutOfStockRes = await safeGraphQL(api, {
    query: PHARMACY_UPDATE_PRESCRIPTION_ITEM_QUERY,
    variables: {
      orderId,
      prescriptionItemId,
      prescriptionItem: {
        outOfStock: false,
      },
    },
    headers: bearer(pharmacistAccessToken),
  });
  expect(
    replaceSetOutOfStockRes.ok,
    replaceSetOutOfStockRes.error || 'Pharmacist replace set out-of-stock failed'
  ).toBe(true);
}

export async function removePrescriptionItemAsPharmacist(api, { pharmacistAccessToken, orderId, medicineId }) {
  const removePrescriptionItemRes = await safeGraphQL(api, {
    query: PHARMACY_REMOVE_PRESCRIPTION_ITEM_QUERY,
    variables: { orderId, medicineId },
    headers: bearer(pharmacistAccessToken),
  });
  expect(
    removePrescriptionItemRes.ok,
    removePrescriptionItemRes.error || 'Pharmacist remove prescription item failed'
  ).toBe(true);
}

export async function updatePricesAsPharmacist(api, { pharmacistAccessToken, orderId, prices }) {
  const updatePricesRes = await safeGraphQL(api, {
    query: PHARMACY_UPDATE_PRICES_QUERY,
    variables: { orderId, prices },
    headers: bearer(pharmacistAccessToken),
  });
  expect(updatePricesRes.ok, updatePricesRes.error || 'Pharmacist update prices failed').toBe(true);
}

export async function sendQuoteAsPharmacist(api, { pharmacistAccessToken, orderId }) {
  const sendQuoteRes = await safeGraphQL(api, {
    query: PHARMACY_SEND_QUOTE_QUERY,
    variables: { orderId },
    headers: bearer(pharmacistAccessToken),
  });
  expect(sendQuoteRes.ok, sendQuoteRes.error || 'Pharmacist send quote failed').toBe(true);
  expect(sendQuoteRes.body?.data?.pharmacy?.order?.sendQuote?.id).toBe(orderId);
}

export async function prepareOrderAsPharmacist(api, { pharmacistAccessToken, orderId }) {
  const prepareOrderRes = await safeGraphQL(api, {
    query: PHARMACY_PREPARE_ORDER_QUERY,
    variables: { orderId },
    headers: bearer(pharmacistAccessToken),
  });
  expect(prepareOrderRes.ok, prepareOrderRes.error || 'Pharmacist prepare order failed').toBe(true);
  expect(prepareOrderRes.body?.data?.pharmacy?.order?.prepare?.id).toBe(orderId);
}

export async function setOrderForPickupAsPharmacist(api, { pharmacistAccessToken, orderId }) {
  const setForPickupRes = await safeGraphQL(api, {
    query: PHARMACY_SET_FOR_PICKUP_QUERY,
    variables: { orderId },
    headers: bearer(pharmacistAccessToken),
  });
  expect(setForPickupRes.ok, setForPickupRes.error || 'Pharmacist set for pickup failed').toBe(true);
  expect(setForPickupRes.body?.data?.pharmacy?.order?.setForPickup?.id).toBe(orderId);
  const patientQR = setForPickupRes.body?.data?.pharmacy?.order?.setForPickup?.legs?.[0]?.patientQR;
  return { patientQR };
}

export async function confirmPickupAsPharmacist(api, { pharmacistAccessToken, orderId, qrCode }) {
  const confirmPickupRes = await safeGraphQL(api, {
    query: PHARMACY_CONFIRM_PICKUP_QUERY,
    variables: { orderId, qrCode },
    headers: bearer(pharmacistAccessToken),
  });
  expect(confirmPickupRes.ok, confirmPickupRes.error || 'Pharmacist confirm pickup failed').toBe(true);
  expect(confirmPickupRes.body?.data?.pharmacy?.order?.confirmPickup?.id).toBe(orderId);
}

export async function declineOrderAsPharmacist(api, { pharmacistAccessToken, orderId, reason }) {
  const declineOrderRes = await safeGraphQL(api, {
    query: PHARMACY_DECLINE_ORDER_QUERY,
    variables: { orderId, reason },
    headers: bearer(pharmacistAccessToken),
  });
  expect(declineOrderRes.ok, declineOrderRes.error || 'Pharmacist decline order failed').toBe(true);
  expect(declineOrderRes.body?.data?.pharmacy?.order?.decline?.id).toBe(orderId);
}
