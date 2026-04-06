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
import { UPDATE_MEDICINE_MUTATION } from './admin.medicineManagementQueries.js';
import { createMedicineAsAdmin, buildUpdateMedicineInput } from './admin.medicineManagementUtils.js';

test.describe('GraphQL: Admin Update Medicine', () => {
  test(
    'PHARMA-350 | Should update medicine with valid auth tokens',
    {
      tag: ['@api', '@admin', '@positive', '@update', '@pharma-350'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsAdminAndGetTokens(api, getAdminCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Admin login failed').toBe(true);

      const { medicineNode } = await createMedicineAsAdmin(api, { adminAccessToken: accessToken });
      const medicineInput = buildUpdateMedicineInput();

      const updateMedicineRes = await safeGraphQL(api, {
        query: UPDATE_MEDICINE_MUTATION,
        variables: { medicineId: Number(medicineNode.id), medicine: medicineInput },
        headers: bearer(accessToken),
      });

      expect(updateMedicineRes.ok, updateMedicineRes.error || 'Update medicine endpoint failed').toBe(true);

      const node = updateMedicineRes.body?.data?.medicine?.update;
      expect(node, 'Update medicine endpoint returned no data').toBeTruthy();
      expect.soft(node.id).toBe(medicineNode.id);
      expect.soft(node.brand).toBe(medicineInput.brand);
      expect.soft(node.genericName).toBe(medicineInput.genericName);
    }
  );

  test(
    'PHARMA-351 | Should NOT update medicine with missing auth tokens',
    {
      tag: ['@api', '@admin', '@negative', '@update', '@pharma-351'],
    },
    async ({ api, noAuth }) => {
      const { accessToken, raw: loginRes } = await loginAsAdminAndGetTokens(api, getAdminCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Admin login failed').toBe(true);

      const { medicineNode } = await createMedicineAsAdmin(api, { adminAccessToken: accessToken });
      const medicineInput = buildUpdateMedicineInput();

      const updateMedicineNoAuthRes = await safeGraphQL(api, {
        query: UPDATE_MEDICINE_MUTATION,
        variables: { medicineId: Number(medicineNode.id), medicine: medicineInput },
        headers: noAuth,
      });

      expect(updateMedicineNoAuthRes.ok, updateMedicineNoAuthRes.error || 'Expected UNAUTHORIZED when missing token').toBe(
        false
      );

      if (!updateMedicineNoAuthRes.httpOk) {
        expect(NOAUTH_HTTP_STATUSES).toContain(updateMedicineNoAuthRes.httpStatus);
      } else {
        const { message, code, classification } = getGQLError(updateMedicineNoAuthRes);
        expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
        expect.soft(NOAUTH_CODES).toContain(code);
        expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
      }
    }
  );

  test(
    'PHARMA-352 | Should NOT update medicine with invalid auth tokens',
    {
      tag: ['@api', '@admin', '@negative', '@update', '@pharma-352'],
    },
    async ({ api, invalidAuth }) => {
      const { accessToken, raw: loginRes } = await loginAsAdminAndGetTokens(api, getAdminCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Admin login failed').toBe(true);

      const { medicineNode } = await createMedicineAsAdmin(api, { adminAccessToken: accessToken });
      const medicineInput = buildUpdateMedicineInput();

      const updateMedicineInvalidAuthRes = await safeGraphQL(api, {
        query: UPDATE_MEDICINE_MUTATION,
        variables: { medicineId: Number(medicineNode.id), medicine: medicineInput },
        headers: invalidAuth,
      });

      expect(updateMedicineInvalidAuthRes.ok).toBe(false);
      expect(updateMedicineInvalidAuthRes.httpOk).toBe(false);
      expect(NOAUTH_HTTP_STATUSES).toContain(updateMedicineInvalidAuthRes.httpStatus);
    }
  );
});
