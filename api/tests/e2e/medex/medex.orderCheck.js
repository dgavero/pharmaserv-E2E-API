import { expect } from '../../../globalConfig.api.js';
import { bearer, safeGraphQL } from '../../../helpers/graphqlUtils.js';
import { GET_ORDER_QUERY } from '../../patient/ordering/patient.orderingQueries.js';
import { GET_ORDER_HISTORY_QUERY } from '../../patient/historyAndNotifications/patient.getHistoryNotificationQueries.js';

function normalizeItem(item) {
  return {
    medicineId: String(item?.medicine?.id || ''),
    brand: item?.medicine?.brand || '',
    genericName: item?.medicine?.genericName || '',
    quantity: Number(item?.quantity || 0),
    unitPrice: Number(item?.unitPrice || 0),
  };
}

export async function getMedexQuotedOrderItems(api, { patientAccessToken, orderId }) {
  const orderNode = await getMedexOrderDetail(api, { patientAccessToken, orderId });
  const items = orderNode?.legs?.[0]?.prescriptionItems || [];
  expect(Array.isArray(items), 'Expected patient order prescriptionItems to be an array').toBe(true);
  expect(items.length, 'Missing prescription items from patient order detail').toBeGreaterThan(0);
  return items.map(normalizeItem);
}

export async function getMedexOrderDetail(api, { patientAccessToken, orderId }) {
  const getOrderRes = await safeGraphQL(api, {
    query: GET_ORDER_QUERY,
    variables: { orderId },
    headers: bearer(patientAccessToken),
  });
  expect(getOrderRes.ok, getOrderRes.error || 'Patient get order detail failed').toBe(true);
  const orderNode = getOrderRes.body?.data?.patient?.order;
  expect(orderNode, 'Missing data.patient.order').toBeTruthy();
  return orderNode;
}

export async function getMedexOrderHistoryEntry(api, { patientAccessToken, orderId }) {
  const historyRes = await safeGraphQL(api, {
    query: GET_ORDER_HISTORY_QUERY,
    headers: bearer(patientAccessToken),
  });
  expect(historyRes.ok, historyRes.error || 'Patient get order history failed').toBe(true);
  const historyItems = historyRes.body?.data?.patient?.orderHistory || [];
  expect(Array.isArray(historyItems), 'Expected patient orderHistory to be an array').toBe(true);
  return historyItems.find((item) => String(item?.id || '') === String(orderId)) || null;
}

export function assertMedexQuotedOrderItems(items, expectedItems) {
  expect(items.length, 'Unexpected MedEx quoted item count').toBe(expectedItems.length);

  const itemsByMedicineId = new Map(items.map((item) => [item.medicineId, item]));

  for (const expectedItem of expectedItems) {
    const actualItem = itemsByMedicineId.get(String(expectedItem.medicineId));
    expect(actualItem, `Missing medicineId ${expectedItem.medicineId} in MedEx order detail`).toBeTruthy();

    expect(typeof expectedItem.zeroTotal).toBe('boolean');

    if (expectedItem.zeroTotal) {
      expect(actualItem.quantity * actualItem.unitPrice).toBe(0);
      continue;
    }

    expect(typeof expectedItem.quantity).toBe('number');
    expect(actualItem.quantity).toBe(expectedItem.quantity);
    expect(actualItem.unitPrice, `Expected in-stock unitPrice for medicineId ${expectedItem.medicineId}`).toBeGreaterThan(0);
  }
}
