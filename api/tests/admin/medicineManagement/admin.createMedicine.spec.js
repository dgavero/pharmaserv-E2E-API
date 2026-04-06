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
import { CREATE_MEDICINE_MUTATION } from './admin.medicineManagementQueries.js';
import { buildCreateMedicineInput, createMedicineAsAdmin } from './admin.medicineManagementUtils.js';

test.describe('GraphQL: Admin Create Medicine', () => {
  test(
    'PHARMA-347 | Should create medicine with valid auth tokens',
    {
      tag: ['@api', '@admin', '@positive', '@create', '@pharma-347'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsAdminAndGetTokens(api, getAdminCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Admin login failed').toBe(true);

      const { medicineNode: node, medicineInput } = await createMedicineAsAdmin(api, {
        adminAccessToken: accessToken,
      });

      expect.soft(node.brand).toBe(medicineInput.brand);
      expect.soft(node.genericName).toBe(medicineInput.genericName);
      expect.soft(node.manufacturer).toBe(medicineInput.manufacturer);
    }
  );

  test(
    'PHARMA-348 | Should NOT create medicine with missing auth tokens',
    {
      tag: ['@api', '@admin', '@negative', '@create', '@pharma-348'],
    },
    async ({ api, noAuth }) => {
      const medicineInput = buildCreateMedicineInput();

      const createMedicineNoAuthRes = await safeGraphQL(api, {
        query: CREATE_MEDICINE_MUTATION,
        variables: { medicine: medicineInput },
        headers: noAuth,
      });

      expect(createMedicineNoAuthRes.ok, createMedicineNoAuthRes.error || 'Expected UNAUTHORIZED when missing token').toBe(
        false
      );

      if (!createMedicineNoAuthRes.httpOk) {
        expect(NOAUTH_HTTP_STATUSES).toContain(createMedicineNoAuthRes.httpStatus);
      } else {
        const { message, code, classification } = getGQLError(createMedicineNoAuthRes);
        expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
        expect.soft(NOAUTH_CODES).toContain(code);
        expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
      }
    }
  );

  test(
    'PHARMA-349 | Should NOT create medicine with invalid auth tokens',
    {
      tag: ['@api', '@admin', '@negative', '@create', '@pharma-349'],
    },
    async ({ api, invalidAuth }) => {
      const medicineInput = buildCreateMedicineInput();

      const createMedicineInvalidAuthRes = await safeGraphQL(api, {
        query: CREATE_MEDICINE_MUTATION,
        variables: { medicine: medicineInput },
        headers: invalidAuth,
      });

      expect(createMedicineInvalidAuthRes.ok).toBe(false);
      expect(createMedicineInvalidAuthRes.httpOk).toBe(false);
      expect(NOAUTH_HTTP_STATUSES).toContain(createMedicineInvalidAuthRes.httpStatus);
    }
  );
});
