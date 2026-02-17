export function buildFindMyMedsDeclinedOrderInput() {
  return {
    deliveryType: 'FIND_MY_MEDS',
    patientId: process.env.PATIENT_USER_USERNAME_ID,
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
