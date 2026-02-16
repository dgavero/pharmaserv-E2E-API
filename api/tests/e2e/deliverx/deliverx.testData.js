export function buildDeliverXDeclinedOrderInput() {
  return {
    deliveryType: 'DELIVER_X',
    patientId: process.env.PATIENT_USER_USERNAME_ID,
    branchId: process.env.PHARMACIST_BRANCHID_REG01,
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
    lat: 9.6496,
    lng: 123.8552,
  };
}
