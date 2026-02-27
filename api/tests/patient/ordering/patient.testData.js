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
    patientId: process.env.PATIENT_USER_USERNAME_ID,
    prescriptionItems: buildSearchPrescriptionItems(),
    addressName: 'TEST HOME API',
    address: 'TEST HOUSING API',
    lat: 14.582019317323562,
    lng: 121.01251092551259,
  };
}

export function buildPatientDeliverXOrderInput() {
  return {
    deliveryType: 'DELIVER_X',
    patientId: process.env.PATIENT_USER_USERNAME_ID,
    branchId: process.env.PHARMACIST_BRANCHID_REG01,
    prescriptionItems: buildDeliverXPrescriptionItems(),
    addressName: 'TEST Home API',
    address: 'TEST HOUSING API',
    lat: 14.582019317323562,
    lng: 121.01251092551259,
  };
}

export function buildPatientPabiliOrderInput() {
  return {
    deliveryType: 'PABILI',
    patientId: process.env.PATIENT_USER_USERNAME_ID,
    branchId: process.env.PHARMACIST_BRANCHID_PSE01,
    prescriptionItems: buildSearchPrescriptionItems(),
    addressName: 'Home',
    address: 'Unit 243 Baranca Bldg, Mandaluyong Housing',
    lat: 14.582019317323562,
    lng: 121.01251092551259,
  };
}

export function buildPatientSpecificOrderInput() {
  const medicineIds = resolvePatientOrderingMedicineIds();
  return {
    deliveryType: 'DELIVER_X',
    patientId: process.env.PATIENT_USER_USERNAME_ID,
    branchId: process.env.PHARMACIST_BRANCHID_REG01,
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
    lat: 14.582019317323562,
    lng: 121.01251092551259,
  };
}
