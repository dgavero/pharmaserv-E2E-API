function resolveDeliverXMedicineIds() {
  const testEnv = String(process.env.TEST_ENV || 'DEV').toUpperCase();
  const medicineIdsByEnv = {
    DEV: {
      baseFirstMedicineId: 1,
      baseSecondMedicineId: 2,
      addedMedicineId: 3,
      replacedMedicineId: 4,
    },
    QA: {
      baseFirstMedicineId: 77954,
      baseSecondMedicineId: 78327,
      addedMedicineId: 78347,
      replacedMedicineId: 78356,
    },
    PROD: {
      baseFirstMedicineId: 1,
      baseSecondMedicineId: 2,
      addedMedicineId: 3,
      replacedMedicineId: 4,
    },
  };

  const ids = medicineIdsByEnv[testEnv];
  if (!ids) {
    throw new Error(`Unsupported TEST_ENV="${testEnv}" for DeliverX medicine IDs`);
  }
  return ids;
}

export function buildDeliverXBasePrescriptionItems() {
  const { baseFirstMedicineId, baseSecondMedicineId } = resolveDeliverXMedicineIds();
  return [
    {
      medicineId: baseFirstMedicineId,
      quantity: 2,
      source: 'SEARCH',
      specialInstructions: null,
    },
    {
      medicineId: baseSecondMedicineId,
      quantity: 2,
      source: 'E_PRESCRIPTION',
      specialInstructions: null,
    },
  ];
}

export function buildDeliverXBasePriceItems() {
  const { baseFirstMedicineId, baseSecondMedicineId } = resolveDeliverXMedicineIds();
  return [
    { medicineId: baseFirstMedicineId, quantity: 1, unitPrice: 10 },
    { medicineId: baseSecondMedicineId, quantity: 1, unitPrice: 12 },
  ];
}

export function buildDeliverXBaseOrderInput() {
  return {
    deliveryType: 'DELIVER_X',
    patientId: process.env.PATIENT_USER_USERNAME_ID,
    branchId: process.env.PHARMACIST_BRANCHID_REG01,
    prescriptionItems: buildDeliverXBasePrescriptionItems(),
    addressName: 'Home API',
    address: 'Test API Address',
    lat: 9.6496,
    lng: 123.8552,
  };
}

export function buildDeliverXAttachmentNoPrescriptionOrderInput() {
  return {
    deliveryType: 'DELIVER_X',
    patientId: process.env.PATIENT_USER_USERNAME_ID,
    branchId: process.env.PHARMACIST_BRANCHID_REG01,
    discountCardIds: [],
    prescriptionItems: [],
    addressName: 'Home API',
    address: 'Test API Address',
    landmark: 'Near City Hall',
    attachmentPhotos: [
      {
        photo: 'att-qa-deliverx-no-prescription.png',
        specialInstructions: 'Attachment only order',
      },
    ],
    deliveryInstructions: 'Deliver with care',
    lat: 9.6496,
    lng: 123.8552,
  };
}

export function buildDeliverXAttachmentPrescriptionItemPayloads() {
  const { baseSecondMedicineId, addedMedicineId, replacedMedicineId } = resolveDeliverXMedicineIds();

  return {
    addedPrimary: {
      medicineId: baseSecondMedicineId,
      quantity: 5,
      unitPrice: 200.0,
      specialInstructions: 'API automated test only',
      source: 'SEARCH',
    },
    addedSecondary: {
      medicineId: addedMedicineId,
      quantity: 2,
      unitPrice: 150.0,
      specialInstructions: 'API automated test only',
      source: 'SEARCH',
    },
    replacement: {
      medicineId: replacedMedicineId,
      quantity: 1,
      unitPrice: 35.0,
      specialInstructions: 'API automated test only',
      source: 'SEARCH',
    },
  };
}

export function buildDeliverXRequoteData({ prescriptionId, discountCardId, attachmentBlobName }) {
  const { addedMedicineId, replacedMedicineId } = resolveDeliverXMedicineIds();

  const firstAddedPrescriptionItem = {
    medicineId: addedMedicineId,
    quantity: 1,
    specialInstructions: 'API automated test only',
    source: 'SEARCH',
  };

  const availablePrescriptionItemUpdate = {
    quantity: 1,
    unitPrice: 3000.0,
    vatExempt: true,
    specialInstructions: 'API automated test only',
    source: 'SEARCH',
  };

  const replacementPrescriptionItem = {
    medicineId: replacedMedicineId,
    quantity: 1,
    unitPrice: 45.0,
    specialInstructions: 'API automated test only',
    source: 'SEARCH',
  };

  const postRequotePrescriptionItem = {
    medicineId: addedMedicineId,
    quantity: 1,
    unitPrice: 18,
    specialInstructions: 'API automated test only',
    source: 'SEARCH',
  };

  return {
    orderInput: {
      deliveryType: 'DELIVER_X',
      patientId: process.env.PATIENT_USER_USERNAME_ID,
      branchId: process.env.PHARMACIST_BRANCHID_REG01,
      prescriptionIds: [prescriptionId],
      discountCardIds: [discountCardId],
      prescriptionItems: buildDeliverXBasePrescriptionItems(),
      addressName: 'Home API',
      address: 'Test API Address',
      landmark: 'Near City Hall',
      attachmentPhotos: [
        {
          photo: attachmentBlobName,
          specialInstructions: 'API automated test only',
        },
      ],
      deliveryInstructions: 'API automated test only',
      lat: 9.6496,
      lng: 123.8552,
    },
    firstAddedPrescriptionItem,
    availablePrescriptionItemUpdate,
    replacementPrescriptionItem,
    priceItems: [...buildDeliverXBasePriceItems(), { medicineId: replacedMedicineId, quantity: 1, unitPrice: 15 }],
    postRequotePrescriptionItem,
  };
}
