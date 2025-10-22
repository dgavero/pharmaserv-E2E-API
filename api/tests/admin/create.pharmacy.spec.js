// api/tests/admin/create.pharmacy.spec.js

/**
 * GraphQL: Admin → Pharmacy Create
 * - Positive: admin login → pharmacy.create (randomized name & licenseNumber)
 * - Negative: same payload without bearer → UNAUTHORIZED
 * - Validate on positive: node exists; id/name are strings
 */

import { test, expect } from '../../globalConfig.api.js';
import {
  safeGraphQL,
  adminLoginAndGetTokens,
  bearer,
  getGQLError,
} from '../../helpers/testUtilsAPI.js';
import { randomAlphanumeric } from '../../../helpers/globalTestUtils.js';

const CREATE_PHARMACY_MUTATION = `
  mutation ($pharmacy: PharmacyRequest!) {
    administrator {
      pharmacy {
        create(pharmacy: $pharmacy) {
          id
          name
        }
      }
    }
  }
`;

/** Reusable randomized input (for both positive and negatives) */
function buildPharmacyInput() {
  return {
    name: `QA-Pharmacy-${randomAlphanumeric(8)}`, // e.g., QA-Pharmacy-ab12cd34
    licenseNumber: `QAPH-${randomAlphanumeric(10)}`, // e.g., QAPH-a1b2c3d4e5
  };
}

test.describe('GraphQL: Admin Create Pharmacy', () => {
  test('Should create a new pharmacy with randomized fields @api @admin @positive', async ({
    api,
  }) => {
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

    expect.soft(typeof pharmacyNode.id).toBe('string');
    expect.soft(typeof pharmacyNode.name).toBe('string');
  });

  test('Should not create a pharmacy without Authorization @api @admin @negative', async ({
    api,
    noAuth,
  }) => {
    // Reuse the same builder — ensures same shape as positive
    const pharmacyInput = buildPharmacyInput();
    const createPharmacyNoAuth = await safeGraphQL(api, {
      query: CREATE_PHARMACY_MUTATION,
      variables: { pharmacy: pharmacyInput },
      headers: noAuth,
    });

    expect(createPharmacyNoAuth.ok, 'Expected UNAUTHORIZED when missing token').toBe(false);

    const { message, code, classification } = getGQLError(createPharmacyNoAuth);
    expect(message.toLowerCase()).toContain('unauthorized access');
    expect.soft(code).toBe('401');
    expect.soft(classification).toBe('UNAUTHORIZED');
  });

  test('Should not create a pharmacy with invalid token @api @admin @negative', async ({
    api,
    invalidAuth,
  }) => {
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
  });
});
