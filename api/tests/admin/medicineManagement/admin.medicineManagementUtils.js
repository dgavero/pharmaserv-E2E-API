import path from 'node:path';
import { expect } from '../../../globalConfig.api.js';
import { safeGraphQL, bearer } from '../../../helpers/graphqlUtils.js';
import { randomNum } from '../../../../helpers/globalTestUtils.js';
import { uploadImageToSignedUrl } from '../../e2e/shared/steps/patient.steps.js';
import {
  GET_MEDICINE_UPLOAD_URL_QUERY,
  CREATE_MEDICINE_MUTATION,
  ADD_MEDICINE_PHOTO_MUTATION,
} from './admin.medicineManagementQueries.js';

export const WOOSH_IMAGE_PATH = path.resolve('upload/api-images/woosh.jpeg');
const CREATE_MEDICINE_RETRY_PATTERN = /Did not observe any item or terminal signal within 5000ms in 'flatMap'/i;

export function buildCreateMedicineInput() {
  return {
    brand: `DEV MED INIT ${randomNum(8)}`,
    genericName: 'Paracetamol',
    strength: '500 mg',
    form: 'Tablet',
    manufacturer: 'Unilab',
    rxRequired: false,
    coldStorageRequired: false,
    vatExempt: false,
    hiPrice: 44.5,
    loPrice: 66.5,
  };
}

export function buildUpdateMedicineInput() {
  return {
    brand: `DEV MED UPD ${randomNum(8)}`,
    genericName: 'Paracetamol',
    strength: '650 mg',
    form: 'Caplet',
    manufacturer: 'Unilab',
    rxRequired: false,
    coldStorageRequired: false,
    vatExempt: false,
    hiPrice: 14.5,
    loPrice: 11.5,
  };
}

export async function createMedicineAsAdmin(
  api,
  { adminAccessToken, medicineInput = buildCreateMedicineInput() } = {}
) {
  let createMedicineRes = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    createMedicineRes = await safeGraphQL(api, {
      query: CREATE_MEDICINE_MUTATION,
      variables: { medicine: medicineInput },
      headers: bearer(adminAccessToken),
    });

    if (createMedicineRes.ok) break;

    const errorMessage = String(createMedicineRes.error || createMedicineRes.body?.errors?.[0]?.message || '');
    const shouldRetry = CREATE_MEDICINE_RETRY_PATTERN.test(errorMessage);
    if (!shouldRetry || attempt === 2) break;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  expect(createMedicineRes.ok, createMedicineRes.error || 'Create medicine setup failed').toBe(true);

  const medicineNode = createMedicineRes.body?.data?.administrator?.medicine?.create;
  expect(medicineNode?.id, 'Missing created medicine id').toBeTruthy();
  return { createMedicineRes, medicineNode, medicineInput };
}

export async function getMedicineUploadUrlAsAdmin(api, { adminAccessToken, ext = 'jpeg' } = {}) {
  const getMedicineUploadUrlRes = await safeGraphQL(api, {
    query: GET_MEDICINE_UPLOAD_URL_QUERY,
    variables: { ext },
    headers: bearer(adminAccessToken),
  });
  expect(getMedicineUploadUrlRes.ok, getMedicineUploadUrlRes.error || 'Get medicine upload URL failed').toBe(true);

  const node = getMedicineUploadUrlRes.body?.data?.administrator?.medicine?.medicineUploadURL;
  expect(node?.url, 'Missing medicine upload URL').toBeTruthy();
  expect(node?.blobName, 'Missing medicine upload blobName').toBeTruthy();
  return { getMedicineUploadUrlRes, medicineUploadUrl: node.url, medicineBlobName: node.blobName };
}

export async function addMedicinePhotoAsAdmin(
  api,
  {
    adminAccessToken,
    medicineId,
    photo = null,
    uploadPhotoFirst = false,
    imagePath = WOOSH_IMAGE_PATH,
    ext = 'jpeg',
  } = {}
) {
  let medicinePhoto = photo;

  if (uploadPhotoFirst) {
    const { medicineUploadUrl, medicineBlobName } = await getMedicineUploadUrlAsAdmin(api, {
      adminAccessToken,
      ext,
    });
    await uploadImageToSignedUrl(api, { uploadUrl: medicineUploadUrl, imagePath });
    medicinePhoto = medicineBlobName;
  }

  const addMedicinePhotoRes = await safeGraphQL(api, {
    query: ADD_MEDICINE_PHOTO_MUTATION,
    variables: {
      photo: {
        medicineId: Number(medicineId),
        photo: medicinePhoto,
      },
    },
    headers: bearer(adminAccessToken),
  });
  expect(addMedicinePhotoRes.ok, addMedicinePhotoRes.error || 'Add medicine photo setup failed').toBe(true);

  const photoNode = addMedicinePhotoRes.body?.data?.administrator?.medicine?.addPhoto;
  expect(photoNode?.photo, 'Missing added medicine photo value').toBeTruthy();
  return { addMedicinePhotoRes, photoNode, medicinePhoto };
}
