import { expect } from '../../../globalConfig.api.js';
import { bearer, safeGraphQL } from '../../../helpers/graphqlUtils.js';
import { GET_ORDER_QUERY } from '../../patient/ordering/patient.orderingQueries.js';

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
  const getOrderRes = await safeGraphQL(api, {
    query: GET_ORDER_QUERY,
    variables: { orderId },
    headers: bearer(patientAccessToken),
  });
  expect(getOrderRes.ok, getOrderRes.error || 'Patient get order detail failed').toBe(true);

  const items = getOrderRes.body?.data?.patient?.order?.legs?.[0]?.prescriptionItems || [];
  expect(Array.isArray(items), 'Expected patient order prescriptionItems to be an array').toBe(true);
  expect(items.length, 'Missing prescription items from patient order detail').toBeGreaterThan(0);
  return items.map(normalizeItem);
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
