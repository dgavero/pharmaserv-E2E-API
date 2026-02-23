function resolvePabiliMedicineIds() {
  const testEnv = String(process.env.TEST_ENV || 'DEV').toUpperCase();
  const medicineIdsByEnv = {
    DEV: { baseFirstMedicineId: 1, baseSecondMedicineId: 2 },
    QA: { baseFirstMedicineId: 77954, baseSecondMedicineId: 78327 },
    PROD: { baseFirstMedicineId: 1, baseSecondMedicineId: 2 },
  };

  const ids = medicineIdsByEnv[testEnv];
  if (!ids) {
    throw new Error(`Unsupported TEST_ENV="${testEnv}" for Pabili medicine IDs`);
  }
  return ids;
}

export function buildPabiliBasePrescriptionItems() {
  const { baseFirstMedicineId, baseSecondMedicineId } = resolvePabiliMedicineIds();
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

export function buildPabiliBasePriceItems({ quantity = 1 } = {}) {
  const { baseFirstMedicineId, baseSecondMedicineId } = resolvePabiliMedicineIds();
  return [
    { medicineId: baseFirstMedicineId, quantity, unitPrice: 10 },
    { medicineId: baseSecondMedicineId, quantity, unitPrice: 12 },
  ];
}

export function buildPabiliBaseOrderInput() {
  return {
    deliveryType: 'PABILI',
    patientId: process.env.PATIENT_USER_USERNAME_ID,
    branchId: Number(process.env.PHARMACIST_BRANCHID_REG02 || 1),
    prescriptionItems: buildPabiliBasePrescriptionItems(),
    addressName: 'Home API',
    address: 'Test API Address',
    landmark: 'Near City Hall',
    deliveryInstructions: 'API automated test only',
    lat: 9.6496,
    lng: 123.8552,
  };
}
