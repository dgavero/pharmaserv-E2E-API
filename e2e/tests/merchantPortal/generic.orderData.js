export const HybridDeliveryTypes = Object.freeze({
  DELIVER_X: 'DELIVER_X',
  PABILI: 'PABILI',
  FIND_MY_MEDS: 'FIND_MY_MEDS',
});

function getTestEnv() {
  return String(process.env.TEST_ENV || 'DEV').toUpperCase();
}

function resolveMedicineIds() {
  const medicineIdsByEnv = {
    DEV: { baseFirstMedicineId: 1, baseSecondMedicineId: 2 },
    QA: { baseFirstMedicineId: 77954, baseSecondMedicineId: 78327 },
    PROD: { baseFirstMedicineId: 1, baseSecondMedicineId: 2 },
  };

  const testEnv = getTestEnv();
  const ids = medicineIdsByEnv[testEnv];
  if (!ids) {
    throw new Error(`Unsupported TEST_ENV="${testEnv}" for hybrid order medicine IDs`);
  }
  return ids;
}

function normalizeDeliveryType(deliveryType) {
  const normalized = String(deliveryType || '')
    .trim()
    .toUpperCase();
  if (!HybridDeliveryTypes[normalized]) {
    throw new Error(`Unsupported deliveryType="${deliveryType}" for hybrid order data`);
  }
  return normalized;
}

export function buildBasePrescriptionItems({
  quantity = 10,
  firstSource = 'SEARCH',
  secondSource = 'E_PRESCRIPTION',
  firstSpecialInstructions = null,
  secondSpecialInstructions = null,
} = {}) {
  const { baseFirstMedicineId, baseSecondMedicineId } = resolveMedicineIds();
  return [
    {
      medicineId: baseFirstMedicineId,
      quantity,
      source: firstSource,
      specialInstructions: firstSpecialInstructions,
    },
    {
      medicineId: baseSecondMedicineId,
      quantity,
      source: secondSource,
      specialInstructions: secondSpecialInstructions,
    },
  ];
}

export function buildBasePriceItems({ quantity = 1, firstUnitPrice = 10, secondUnitPrice = 12 } = {}) {
  const { baseFirstMedicineId, baseSecondMedicineId } = resolveMedicineIds();
  return [
    { medicineId: baseFirstMedicineId, quantity, unitPrice: firstUnitPrice },
    { medicineId: baseSecondMedicineId, quantity, unitPrice: secondUnitPrice },
  ];
}

export function buildHybridOrderInput({
  deliveryType,
  branchId,
  patientId = process.env.PATIENT_USER_USERNAME_ID,
  prescriptionItems = buildBasePrescriptionItems(),
  addressName = 'Home API',
  address = 'Test API Address',
  landmark = 'Near City Hall',
  deliveryInstructions = 'API automated test only',
  lat = 10.36,
  lng = 123.93,
  ...additionalOrderFields
} = {}) {
  const normalizedDeliveryType = normalizeDeliveryType(deliveryType);
  const normalizedBranchId = Number(branchId);
  if (!normalizedBranchId) {
    throw new Error(`Missing/invalid branchId for hybrid ${normalizedDeliveryType} order input`);
  }
  if (!patientId) {
    throw new Error('Missing PATIENT_USER_USERNAME_ID for hybrid order input');
  }

  return {
    deliveryType: normalizedDeliveryType,
    patientId,
    branchId: normalizedBranchId,
    prescriptionItems,
    addressName,
    address,
    landmark,
    deliveryInstructions,
    lat,
    lng,
    ...additionalOrderFields,
  };
}

export function buildDeliverXHybridOrderInput({ branchId, ...overrides } = {}) {
  return buildHybridOrderInput({
    deliveryType: HybridDeliveryTypes.DELIVER_X,
    branchId,
    ...overrides,
  });
}

export function buildDeliverXAttachmentNoPrescriptionHybridOrderInput({ branchId } = {}) {
  return buildDeliverXHybridOrderInput({
    branchId,
    discountCardIds: [],
    prescriptionItems: [],
    attachmentPhotos: [
      {
        photo: 'att-qa-deliverx-no-prescription.png',
        specialInstructions: 'Attachment only order',
      },
    ],
    deliveryInstructions: 'Deliver with care',
  });
}

export function buildPabiliHybridOrderInput({ branchId, ...overrides } = {}) {
  return buildHybridOrderInput({
    deliveryType: HybridDeliveryTypes.PABILI,
    branchId,
    ...overrides,
  });
}

export function buildFindMyMedsHybridOrderInput({ branchId, ...overrides } = {}) {
  return buildHybridOrderInput({
    deliveryType: HybridDeliveryTypes.FIND_MY_MEDS,
    branchId,
    ...overrides,
  });
}
