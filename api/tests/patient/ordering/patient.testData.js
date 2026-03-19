import { getPatientAccount, getPharmacistAccount } from '../../../helpers/roleCredentials.js';

const defaultPatientAccount = getPatientAccount('default');
const regularPharmacistAccount = getPharmacistAccount('reg01');
const psePharmacistAccount = getPharmacistAccount('pse01');

function resolvePatientOrderingMedicineIds() {
  const testEnv = String(process.env.TEST_ENV || 'DEV').toUpperCase();
  const medicineIdsByEnv = {
    DEV: { baseFirstMedicineId: 1, baseSecondMedicineId: 2 },
    QA: { baseFirstMedicineId: 77954, baseSecondMedicineId: 78327 },
    PROD: { baseFirstMedicineId: 1, baseSecondMedicineId: 2 },
  };

  const medicineIds = medicineIdsByEnv[testEnv];
  if (!medicineIds) {
    throw new Error(`Unsupported TEST_ENV="${testEnv}" for patient ordering medicine IDs`);
  }
  return medicineIds;
}

function buildSearchPrescriptionItems() {
  const medicineIds = resolvePatientOrderingMedicineIds();
  return [
    {
      medicineId: medicineIds.baseFirstMedicineId,
      quantity: 2,
      source: 'SEARCH',
      specialInstructions: null,
    },
    {
      medicineId: medicineIds.baseSecondMedicineId,
      quantity: 2,
      source: 'SEARCH',
      specialInstructions: null,
    },
  ];
}

function buildDeliverXPrescriptionItems() {
  const medicineIds = resolvePatientOrderingMedicineIds();
  return [
    {
      medicineId: medicineIds.baseFirstMedicineId,
      quantity: 2,
      source: 'SEARCH',
      specialInstructions: null,
    },
    {
      medicineId: medicineIds.baseSecondMedicineId,
      quantity: 2,
      source: 'E_PRESCRIPTION',
      specialInstructions: null,
    },
  ];
}

export function buildPatientFindMyMedsOrderInput() {
  return {
    deliveryType: 'FIND_MY_MEDS',
    patientId: defaultPatientAccount.patientId,
    prescriptionItems: buildSearchPrescriptionItems(),
    addressName: 'TEST HOME API',
    address: 'TEST HOUSING API',
    lat: 9.85,
    lng: 124.14,
  };
}

export function buildPatientDeliverXOrderInput() {
  return {
    deliveryType: 'DELIVER_X',
    patientId: defaultPatientAccount.patientId,
    branchId: regularPharmacistAccount.branchId,
    prescriptionItems: buildDeliverXPrescriptionItems(),
    addressName: 'TEST Home API',
    address: 'TEST HOUSING API',
    lat: 9.85,
    lng: 124.14,
  };
}

export function buildPatientPabiliOrderInput() {
  return {
    deliveryType: 'PABILI',
    patientId: defaultPatientAccount.patientId,
    branchId: psePharmacistAccount.branchId,
    prescriptionItems: buildSearchPrescriptionItems(),
    addressName: 'Home',
    address: 'Unit 243 Baranca Bldg, Mandaluyong Housing',
    lat: 9.85,
    lng: 124.14,
  };
}

export function buildPatientSpecificOrderInput() {
  const medicineIds = resolvePatientOrderingMedicineIds();
  return {
    deliveryType: 'DELIVER_X',
    patientId: defaultPatientAccount.patientId,
    branchId: regularPharmacistAccount.branchId,
    prescriptionItems: [
      {
        medicineId: medicineIds.baseFirstMedicineId,
        quantity: 2,
        source: 'SEARCH',
        specialInstructions: null,
      },
      {
        description: 'Brand X',
        quantity: 1,
        specialInstructions: null,
        source: 'SEARCH',
      },
    ],
    addressName: 'TEST HOME API',
    address: 'TEST HOUSING API',
    lat: 9.85,
    lng: 124.14,
  };
}
