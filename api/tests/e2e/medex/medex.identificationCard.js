import { expect } from '../../../globalConfig.api.js';
import { bearer, safeGraphQL } from '../../../helpers/graphqlUtils.js';
import {
  CREATE_IDENTIFICATION_CARD_QUERY,
  GET_IDENTIFICATION_CARD_UPLOAD_URL_QUERY,
  REMOVE_IDENTIFICATION_CARD_QUERY,
} from '../../patient/profile/patient.profileQueries.js';

export async function getIdentificationCardUploadUrlAsPatient(api, { patientAccessToken, ext = 'png' }) {
  const getUploadUrlRes = await safeGraphQL(api, {
    query: GET_IDENTIFICATION_CARD_UPLOAD_URL_QUERY,
    variables: { ext },
    headers: bearer(patientAccessToken),
  });
  expect(getUploadUrlRes.ok, getUploadUrlRes.error || 'Get identification card upload URL failed').toBe(true);
  const node = getUploadUrlRes.body?.data?.patient?.identificationCardUploadURL;
  expect(node?.url, 'Missing identification card upload URL').toBeTruthy();
  expect(node?.blobName, 'Missing identification card blobName').toBeTruthy();
  return { identificationCardUploadUrl: node.url, identificationCardBlobName: node.blobName };
}

export async function saveIdentificationCardAsPatient(api, {
  patientAccessToken,
  patientId,
  identificationCard,
}) {
  const createIdentificationCardRes = await safeGraphQL(api, {
    query: CREATE_IDENTIFICATION_CARD_QUERY,
    variables: {
      identificationCard: {
        patientId: Number(patientId),
        ...identificationCard,
      },
    },
    headers: bearer(patientAccessToken),
  });
  expect(
    createIdentificationCardRes.ok,
    createIdentificationCardRes.error || 'Save identification card failed'
  ).toBe(true);
  const node = createIdentificationCardRes.body?.data?.patient?.identificationCard?.create;
  expect(node?.id, 'Missing identification card id').toBeTruthy();
  return { identificationCardId: node.id, identificationCardNode: node };
}

export async function removeIdentificationCardAsPatient(api, { patientAccessToken, identificationCardId }) {
  const removeIdentificationCardRes = await safeGraphQL(api, {
    query: REMOVE_IDENTIFICATION_CARD_QUERY,
    variables: { identificationCardId },
    headers: bearer(patientAccessToken),
  });
  expect(
    removeIdentificationCardRes.ok,
    removeIdentificationCardRes.error || 'Remove identification card failed'
  ).toBe(true);
  const removeNode = removeIdentificationCardRes.body?.data?.patient?.identificationCard;
  expect(removeNode?.remove).toContain('removed successfully');
}
