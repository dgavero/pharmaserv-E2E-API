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
import { GET_MEDICINE_PHOTOS_QUERY } from './admin.medicineManagementQueries.js';
import {
  createMedicineAsAdmin,
  getMedicineUploadUrlAsAdmin,
  addMedicinePhotoAsAdmin,
  WOOSH_IMAGE_PATH,
} from './admin.medicineManagementUtils.js';
import { uploadImageToSignedUrl } from '../../e2e/shared/steps/patient.steps.js';

test.describe('GraphQL: Admin Get Medicine Photos', () => {
  test(
    'PHARMA-356 | Should get medicine photos with valid auth tokens',
    {
      tag: ['@api', '@admin', '@positive', '@pharma-356'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsAdminAndGetTokens(api, getAdminCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Admin login failed').toBe(true);

      const { medicineNode } = await createMedicineAsAdmin(api, { adminAccessToken: accessToken });
      const { medicineUploadUrl, medicineBlobName } = await getMedicineUploadUrlAsAdmin(api, {
        adminAccessToken: accessToken,
      });
      await uploadImageToSignedUrl(api, { uploadUrl: medicineUploadUrl, imagePath: WOOSH_IMAGE_PATH });
      await addMedicinePhotoAsAdmin(api, {
        adminAccessToken: accessToken,
        medicineId: medicineNode.id,
        photo: medicineBlobName,
      });

      const getMedicinePhotosRes = await safeGraphQL(api, {
        query: GET_MEDICINE_PHOTOS_QUERY,
        variables: { medicineId: Number(medicineNode.id) },
        headers: bearer(accessToken),
      });

      expect(getMedicinePhotosRes.ok, getMedicinePhotosRes.error || 'Get medicine photos endpoint failed').toBe(true);

      const node = getMedicinePhotosRes.body?.data?.administrator?.medicine?.medicinePhotos;
      expect(Array.isArray(node), 'Medicine photos should be an array').toBe(true);
      expect(node.length, 'Medicine photos should contain at least one item').toBeGreaterThan(0);
      expect(node.some((photoNode) => photoNode?.photo === medicineBlobName), 'Uploaded medicine photo was not returned').toBe(
        true
      );
    }
  );

  test(
    'PHARMA-357 | Should NOT get medicine photos with missing auth tokens',
    {
      tag: ['@api', '@admin', '@negative', '@pharma-357'],
    },
    async ({ api, noAuth }) => {
      const { accessToken, raw: loginRes } = await loginAsAdminAndGetTokens(api, getAdminCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Admin login failed').toBe(true);

      const { medicineNode } = await createMedicineAsAdmin(api, { adminAccessToken: accessToken });
      const { medicineUploadUrl, medicineBlobName } = await getMedicineUploadUrlAsAdmin(api, {
        adminAccessToken: accessToken,
      });
      await uploadImageToSignedUrl(api, { uploadUrl: medicineUploadUrl, imagePath: WOOSH_IMAGE_PATH });
      await addMedicinePhotoAsAdmin(api, {
        adminAccessToken: accessToken,
        medicineId: medicineNode.id,
        photo: medicineBlobName,
      });

      const getMedicinePhotosNoAuthRes = await safeGraphQL(api, {
        query: GET_MEDICINE_PHOTOS_QUERY,
        variables: { medicineId: Number(medicineNode.id) },
        headers: noAuth,
      });

      expect(getMedicinePhotosNoAuthRes.ok, getMedicinePhotosNoAuthRes.error || 'Expected UNAUTHORIZED when missing token').toBe(
        false
      );

      if (!getMedicinePhotosNoAuthRes.httpOk) {
        expect(NOAUTH_HTTP_STATUSES).toContain(getMedicinePhotosNoAuthRes.httpStatus);
      } else {
        const { message, code, classification } = getGQLError(getMedicinePhotosNoAuthRes);
        expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
        expect.soft(NOAUTH_CODES).toContain(code);
        expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
      }
    }
  );

  test(
    'PHARMA-358 | Should NOT get medicine photos with invalid auth tokens',
    {
      tag: ['@api', '@admin', '@negative', '@pharma-358'],
    },
    async ({ api, invalidAuth }) => {
      const { accessToken, raw: loginRes } = await loginAsAdminAndGetTokens(api, getAdminCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Admin login failed').toBe(true);

      const { medicineNode } = await createMedicineAsAdmin(api, { adminAccessToken: accessToken });
      const { medicineUploadUrl, medicineBlobName } = await getMedicineUploadUrlAsAdmin(api, {
        adminAccessToken: accessToken,
      });
      await uploadImageToSignedUrl(api, { uploadUrl: medicineUploadUrl, imagePath: WOOSH_IMAGE_PATH });
      await addMedicinePhotoAsAdmin(api, {
        adminAccessToken: accessToken,
        medicineId: medicineNode.id,
        photo: medicineBlobName,
      });

      const getMedicinePhotosInvalidAuthRes = await safeGraphQL(api, {
        query: GET_MEDICINE_PHOTOS_QUERY,
        variables: { medicineId: Number(medicineNode.id) },
        headers: invalidAuth,
      });

      expect(getMedicinePhotosInvalidAuthRes.ok).toBe(false);
      expect(getMedicinePhotosInvalidAuthRes.httpOk).toBe(false);
      expect(NOAUTH_HTTP_STATUSES).toContain(getMedicinePhotosInvalidAuthRes.httpStatus);
    }
  );
});
