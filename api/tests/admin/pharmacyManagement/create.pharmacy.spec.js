import { test, expect } from '../../../globalConfig.api.js';
import {
  safeGraphQL,
  adminLoginAndGetTokens,
  bearer,
  getGQLError,
  NOAUTH_CLASSIFICATIONS,
  NOAUTH_CODES,
  NOAUTH_MESSAGE_PATTERN,
} from '../../../helpers/testUtilsAPI.js';
import { randomAlphanumeric } from '../../../../helpers/globalTestUtils.js';

const CREATE_PHARMACY_MUTATION = `
  mutation ($pharmacy: PharmacyRequest!) {
    administrator {
      pharmacy {
        create(pharmacy: $pharmacy) {
          id
          code
          name
        }
      }
    }
  }
`;

/** Reusable randomized input (for both positive and negatives) */
function buildPharmacyInput() {
  const name = `QA-Pharmacy-${randomAlphanumeric(8)}`; // e.g.,  QA-Pharmacy-ab12cd34
  const code = randomAlphanumeric(3).toUpperCase(); // e.g.,  'QPH'
  const licenseNumber = `QAPH-${randomAlphanumeric(10)}`; // e.g.,  QAPH-a1b2c3d4e5
  return { name, code, licenseNumber };
}

test.describe('GraphQL: Admin Create Pharmacy', () => {
  test(
    'PHARMA-27 | Should create a new pharmacy with randomized fields',
    {
      tag: ['@api', '@admin', '@positive', '@create', '@pharma-27'],
    },
    async ({ api }) => {
      // 1) Admin login
      const { accessToken, raw: loginRes } = await adminLoginAndGetTokens(api, {
        username: process.env.ADMIN_USERNAME,
        password: process.env.ADMIN_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Admin login failed').toBe(true);

      // 2) Randomized input (reused builder)
      const pharmacyInput = buildPharmacyInput();

      // 3) Create pharmacy
      const createPharmacyRes = await safeGraphQL(api, {
        query: CREATE_PHARMACY_MUTATION,
        variables: { pharmacy: pharmacyInput },
        headers: bearer(accessToken),
      });
      expect(
        createPharmacyRes.ok,
        createPharmacyRes.error || 'administrator.pharmacy.create failed'
      ).toBe(true);

      // 4) Validate payload (node + id/name are strings)
      const pharmacyNode = createPharmacyRes.body?.data?.administrator?.pharmacy?.create;
      expect(pharmacyNode, 'Missing data.administrator.pharmacy.create').toBeTruthy();

      expect.soft(pharmacyNode.name).toBe(pharmacyInput.name);
      expect.soft(pharmacyNode.code).toBe(pharmacyInput.code);
    }
  );

  test(
    'PHARMA-28 | Should NOT create a pharmacy without Authorization token',
    {
      tag: ['@api', '@admin', '@negative', '@create', '@pharma-28'],
    },
    async ({ api, noAuth }) => {
      // Reuse the same builder — ensures same shape as positive
      const pharmacyInput = buildPharmacyInput();
      const createPharmacyNoAuth = await safeGraphQL(api, {
        query: CREATE_PHARMACY_MUTATION,
        variables: { pharmacy: pharmacyInput },
        headers: noAuth,
      });

      expect(createPharmacyNoAuth.ok, 'Expected UNAUTHORIZED when missing token').toBe(false);

      const { message, code, classification } = getGQLError(createPharmacyNoAuth);
      expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
      expect.soft(NOAUTH_CODES).toContain(code);
      expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
    }
  );

  test(
    'PHARMA-29 | Should NOT create a pharmacy with invalid tokens',
    {
      tag: ['@api', '@admin', '@negative', '@create', '@pharma-29'],
    },
    async ({ api, invalidAuth }) => {
      const pharmacyInput = buildPharmacyInput();

      const createPharmacyBadAuth = await safeGraphQL(api, {
        query: CREATE_PHARMACY_MUTATION,
        variables: { pharmacy: pharmacyInput },
        headers: invalidAuth,
      });

      // Transport-level 401 (no GraphQL errors[])
      expect(createPharmacyBadAuth.ok).toBe(false);
      expect(createPharmacyBadAuth.httpOk).toBe(false);
      expect(createPharmacyBadAuth.httpStatus).toBe(401);
    }
  );
});
