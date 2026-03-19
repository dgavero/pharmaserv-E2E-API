import { getPatientAccount, getPharmacistAccount } from '../../../helpers/roleCredentials.js';

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

export function buildPabiliBaseOrderInput({ patientId, branchId } = {}) {
  const defaultPatientAccount = getPatientAccount('default');
  const defaultPharmacistAccount = getPharmacistAccount('reg02');
  return {
    deliveryType: 'PABILI',
    patientId: patientId || defaultPatientAccount.patientId,
    branchId: branchId || defaultPharmacistAccount.branchId,
    prescriptionItems: buildPabiliBasePrescriptionItems(),
    addressName: 'Home API',
    address: 'Test API Address',
    landmark: 'Near City Hall',
    deliveryInstructions: 'API automated test only',
    lat: 9.85,
    lng: 124.14,
  };
}
