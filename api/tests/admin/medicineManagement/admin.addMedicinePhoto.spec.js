import {
  loginAsAdminAndGetTokens,
  NOAUTH_MESSAGE_PATTERN,
  NOAUTH_CLASSIFICATIONS,
  NOAUTH_CODES,
  NOAUTH_HTTP_STATUSES,
} from '../../../helpers/auth.js';
import { safeGraphQL, bearer, getGQLError } from '../../../helpers/graphqlUtils.js';
import { test, expect } from '../../../globalConfig.api.js';
import { getAdminCredentials } from '../../../helpers/roleCredentials.js';
import { ADD_MEDICINE_PHOTO_MUTATION } from './admin.medicineManagementQueries.js';
import {
  createMedicineAsAdmin,
  getMedicineUploadUrlAsAdmin,
  WOOSH_IMAGE_PATH,
} from './admin.medicineManagementUtils.js';
import { uploadImageToSignedUrl } from '../../e2e/shared/steps/patient.steps.js';

test.describe('GraphQL: Admin Add Medicine Photo', () => {
  test(
    'PHARMA-353 | Should add medicine photo with valid auth tokens',
    {
      tag: ['@api', '@admin', '@positive', '@update', '@pharma-353'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsAdminAndGetTokens(api, getAdminCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Admin login failed').toBe(true);

      const { medicineNode } = await createMedicineAsAdmin(api, { adminAccessToken: accessToken });
      const { medicineUploadUrl, medicineBlobName } = await getMedicineUploadUrlAsAdmin(api, {
        adminAccessToken: accessToken,
      });
      await uploadImageToSignedUrl(api, { uploadUrl: medicineUploadUrl, imagePath: WOOSH_IMAGE_PATH });

      const addMedicinePhotoRes = await safeGraphQL(api, {
        query: ADD_MEDICINE_PHOTO_MUTATION,
        variables: {
          photo: {
            medicineId: Number(medicineNode.id),
            photo: medicineBlobName,
          },
        },
        headers: bearer(accessToken),
      });

      expect(addMedicinePhotoRes.ok, addMedicinePhotoRes.error || 'Add medicine photo endpoint failed').toBe(true);

      const node = addMedicinePhotoRes.body?.data?.administrator?.medicine?.addPhoto;
      expect(node, 'Add medicine photo endpoint returned no data').toBeTruthy();
      expect.soft(node.photo).toBe(medicineBlobName);
    }
  );

  test(
    'PHARMA-354 | Should NOT add medicine photo with missing auth tokens',
    {
      tag: ['@api', '@admin', '@negative', '@update', '@pharma-354'],
    },
    async ({ api, noAuth }) => {
      const { accessToken, raw: loginRes } = await loginAsAdminAndGetTokens(api, getAdminCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Admin login failed').toBe(true);

      const { medicineNode } = await createMedicineAsAdmin(api, { adminAccessToken: accessToken });
      const { medicineUploadUrl, medicineBlobName } = await getMedicineUploadUrlAsAdmin(api, {
        adminAccessToken: accessToken,
      });
      await uploadImageToSignedUrl(api, { uploadUrl: medicineUploadUrl, imagePath: WOOSH_IMAGE_PATH });

      const addMedicinePhotoNoAuthRes = await safeGraphQL(api, {
        query: ADD_MEDICINE_PHOTO_MUTATION,
        variables: {
          photo: {
            medicineId: Number(medicineNode.id),
            photo: medicineBlobName,
          },
        },
        headers: noAuth,
      });

      expect(addMedicinePhotoNoAuthRes.ok, addMedicinePhotoNoAuthRes.error || 'Expected UNAUTHORIZED when missing token').toBe(
        false
      );

      if (!addMedicinePhotoNoAuthRes.httpOk) {
        expect(NOAUTH_HTTP_STATUSES).toContain(addMedicinePhotoNoAuthRes.httpStatus);
      } else {
        const { message, code, classification } = getGQLError(addMedicinePhotoNoAuthRes);
        expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
        expect.soft(NOAUTH_CODES).toContain(code);
        expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
      }
    }
  );

  test(
    'PHARMA-355 | Should NOT add medicine photo with invalid auth tokens',
    {
      tag: ['@api', '@admin', '@negative', '@update', '@pharma-355'],
    },
    async ({ api, invalidAuth }) => {
      const { accessToken, raw: loginRes } = await loginAsAdminAndGetTokens(api, getAdminCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Admin login failed').toBe(true);

      const { medicineNode } = await createMedicineAsAdmin(api, { adminAccessToken: accessToken });
      const { medicineUploadUrl, medicineBlobName } = await getMedicineUploadUrlAsAdmin(api, {
        adminAccessToken: accessToken,
      });
      await uploadImageToSignedUrl(api, { uploadUrl: medicineUploadUrl, imagePath: WOOSH_IMAGE_PATH });

      const addMedicinePhotoInvalidAuthRes = await safeGraphQL(api, {
        query: ADD_MEDICINE_PHOTO_MUTATION,
        variables: {
          photo: {
            medicineId: Number(medicineNode.id),
            photo: medicineBlobName,
          },
        },
        headers: invalidAuth,
      });

      expect(addMedicinePhotoInvalidAuthRes.ok).toBe(false);
      expect(addMedicinePhotoInvalidAuthRes.httpOk).toBe(false);
      expect(NOAUTH_HTTP_STATUSES).toContain(addMedicinePhotoInvalidAuthRes.httpStatus);
    }
  );
});
