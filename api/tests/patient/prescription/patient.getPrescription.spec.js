import path from 'node:path';
import { test, expect } from '../../../globalConfig.api.js';
import { getPatientAccount } from '../../../helpers/roleCredentials.js';
import { safeGraphQL, bearer, getGQLError } from '../../../helpers/graphqlUtils.js';
import {
  loginAsPatientAndGetTokens,
  NOAUTH_MESSAGE_PATTERN,
  NOAUTH_CLASSIFICATIONS,
  NOAUTH_CODES,
  NOAUTH_HTTP_STATUSES,
} from '../../../helpers/auth.js';
import { GET_PRESCRIPTION_DETAIL_QUERY } from './patient.prescriptionQueries.js';
import {
  getPrescriptionUploadUrlAsPatient,
  uploadImageToSignedUrl,
  savePrescriptionAsPatient,
} from '../../e2e/shared/steps/patient.steps.js';

const defaultPatientAccount = getPatientAccount('default');
const PRESCRIPTION_IMAGE_PATH = path.resolve('upload/api-images/gumgum.png');

async function createPrescriptionAsPatient(api, patientAccessToken) {
  const { prescriptionUploadUrl, prescriptionBlobName } = await getPrescriptionUploadUrlAsPatient(api, {
    patientAccessToken,
    ext: 'png',
  });
  await uploadImageToSignedUrl(api, {
    uploadUrl: prescriptionUploadUrl,
    imagePath: PRESCRIPTION_IMAGE_PATH,
  });

  const { prescriptionId } = await savePrescriptionAsPatient(api, {
    patientAccessToken,
    patientId: defaultPatientAccount.patientId,
    photo: prescriptionBlobName,
  });

  return { prescriptionId, prescriptionBlobName };
}

test.describe('GraphQL: Get Prescription Detail', () => {
  test(
    'PHARMA-407 | Should be able to get Prescription detail as Patient',
    {
      tag: ['@api', '@patient', '@positive', '@pharma-407'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsPatientAndGetTokens(api, defaultPatientAccount);
      expect(loginRes.ok, loginRes.error || 'Patient login failed').toBe(true);

      const { prescriptionId, prescriptionBlobName } = await createPrescriptionAsPatient(api, accessToken);
      const getPrescriptionRes = await safeGraphQL(api, {
        query: GET_PRESCRIPTION_DETAIL_QUERY,
        variables: {
          prescriptionId,
          patientId: defaultPatientAccount.patientId,
        },
        headers: bearer(accessToken),
      });

      expect(getPrescriptionRes.ok, getPrescriptionRes.error || 'Get prescription detail failed').toBe(true);

      const prescriptionNode = getPrescriptionRes.body?.data?.patient?.prescription?.detail;
      expect(prescriptionNode, 'Missing data.patient.prescription.detail').toBeTruthy();
      expect.soft(String(prescriptionNode.id)).toBe(String(prescriptionId));
      expect.soft(prescriptionNode.photo).toBe(prescriptionBlobName);
      expect(Array.isArray(prescriptionNode.prescriptionItems), 'Expected prescriptionItems to be an array').toBe(true);
    }
  );

  test(
    'PHARMA-408 | Should NOT be able to get Prescription detail as Patient without Authentication',
    {
      tag: ['@api', '@patient', '@negative', '@pharma-408'],
    },
    async ({ api, noAuth }) => {
      const getPrescriptionRes = await safeGraphQL(api, {
        query: GET_PRESCRIPTION_DETAIL_QUERY,
        variables: {
          prescriptionId: '1',
          patientId: defaultPatientAccount.patientId,
        },
        headers: noAuth,
      });

      expect(getPrescriptionRes.ok, 'Get prescription detail without auth should fail').toBe(false);

      if (!getPrescriptionRes.httpOk) {
        expect(NOAUTH_HTTP_STATUSES).toContain(getPrescriptionRes.httpStatus);
      } else {
        const { message, code, classification } = getGQLError(getPrescriptionRes);
        expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
        expect(NOAUTH_CODES).toContain(code);
        expect(NOAUTH_CLASSIFICATIONS).toContain(classification);
      }
    }
  );

  test(
    'PHARMA-409 | Should NOT be able to get Prescription detail as Patient with invalid Authentication',
    {
      tag: ['@api', '@patient', '@negative', '@pharma-409'],
    },
    async ({ api, invalidAuth }) => {
      const getPrescriptionRes = await safeGraphQL(api, {
        query: GET_PRESCRIPTION_DETAIL_QUERY,
        variables: {
          prescriptionId: '1',
          patientId: defaultPatientAccount.patientId,
        },
        headers: invalidAuth,
      });

      expect(getPrescriptionRes.ok, 'Get prescription detail with invalid auth should fail').toBe(false);
      expect(getPrescriptionRes.httpOk).toBe(false);
      expect(NOAUTH_HTTP_STATUSES).toContain(getPrescriptionRes.httpStatus);
    }
  );
});
