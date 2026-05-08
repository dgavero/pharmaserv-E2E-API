import { getPatientAccount } from '../../../helpers/roleCredentials.js';

export const MEDEX_BRANCH_ID = 2368;
export const MEDEX_RX_ATTACHMENT_IMAGE_PATH = 'upload/images/prescription1.png';
export const MEDEX_PROOF_OF_PAYMENT_IMAGE_PATH = 'upload/images/proof1.png';
export const MEDEX_PICKUP_PROOF_IMAGE_PATH = 'upload/images/proofOfPickup.png';
export const MEDEX_DELIVERY_PROOF_IMAGE_PATH = 'upload/images/proofOfDelivery.png';

export function getMedexTestEnv() {
  return String(process.env.TEST_ENV || 'DEV').toUpperCase();
}

export function buildMedexPrescriptionItems({ medicineIds, quantity }) {
  return medicineIds.map((medicineId) => ({
    medicineId,
    quantity,
    source: 'SEARCH',
    specialInstructions: null,
  }));
}

export function buildMedexOrderInput({ patientId, branchId = MEDEX_BRANCH_ID, prescriptionItems, attachmentBlobName } = {}) {
  const defaultPatientAccount = getPatientAccount('default');
  const orderInput = {
    deliveryType: 'MED_EX',
    patientId: patientId || defaultPatientAccount.patientId,
    branchId,
    prescriptionIds: [],
    prescriptionItems,
    addressName: 'Home API',
    address: 'Test API Address',
    landmark: 'Near City Hall',
    lat: 9.85,
    lng: 124.14,
  };

  if (attachmentBlobName) {
    orderInput.attachmentPhotos = [
      {
        photo: attachmentBlobName,
        specialInstructions: 'This is an instruction for attachments',
      },
    ];
  }

  orderInput.deliveryInstructions = 'API automated test only';
  return orderInput;
}
