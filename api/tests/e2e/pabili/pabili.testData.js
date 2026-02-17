export function buildPabiliDeclinedOrderInput() {
  return {
    deliveryType: 'PABILI',
    patientId: process.env.PATIENT_USER_USERNAME_ID,
    branchId: Number(process.env.PHARMACIST_BRANCHID_REG02 || 1),
    prescriptionItems: [
      {
        medicineId: 1,
        quantity: 2,
        source: 'SEARCH',
        specialInstructions: null,
      },
      {
        medicineId: 2,
        quantity: 2,
        source: 'E_PRESCRIPTION',
        specialInstructions: null,
      },
    ],
    addressName: 'Home API',
    address: 'Test API Address',
    landmark: 'Near City Hall',
    deliveryInstructions: 'API automated test only',
    lat: 9.6496,
    lng: 123.8552,
  };
}

export function buildPabiliHappyPathOrderInput() {
  return {
    deliveryType: 'PABILI',
    patientId: process.env.PATIENT_USER_USERNAME_ID,
    branchId: Number(process.env.PHARMACIST_BRANCHID_REG02 || 1),
    prescriptionItems: [
      {
        medicineId: 1,
        quantity: 2,
        source: 'SEARCH',
        specialInstructions: null,
      },
      {
        medicineId: 2,
        quantity: 2,
        source: 'E_PRESCRIPTION',
        specialInstructions: null,
      },
    ],
    addressName: 'Home API',
    address: 'Test API Address',
    landmark: 'Near City Hall',
    deliveryInstructions: 'API automated test only',
    lat: 9.6496,
    lng: 123.8552,
  };
}
