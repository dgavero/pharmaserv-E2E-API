import { test, expect } from '../../globalConfig.api.js';
import {
  safeGraphQL,
  adminLoginAndGetTokens,
  bearer,
  getGQLError,
} from '../../helpers/testUtilsAPI.js';
import { randomAlphanumeric } from '../../../helpers/globalTestUtils.js';

const CREATE_BRANCH_MUTATION = `
  mutation ($branch: BranchRequest!) {
    administrator {
      pharmacy {
        branch {
          create(branch: $branch) {
            id
            pharmacyName
            name
            lat
            lng
          }
        }
      }
    }
  }
`;

/** Helpers */
function randomIntInclusive(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min; // inclusive
}
function randomDigits(length) {
  let out = '';
  for (let i = 0; i < length; i++) out += Math.floor(Math.random() * 10);
  return out;
}
// make an integer within float bounds (inclusive by using ceil/floor)
function randomIntWithinFloatBounds(minFloat, maxFloat) {
  const min = Math.ceil(minFloat);
  const max = Math.floor(maxFloat);
  return randomIntInclusive(min, max);
}

/**
 * Build inputs:
 * - ONLY pharmacyId, lat, lng as integers
 * - All other fields are strings
 * - zipCode must be a STRING in 5300..5324
 * - email: "qa-<name>@qa.com"
 * - phoneNumber: 11-digit string
 * - lat/lng: integer within given float bounds
 */
function buildBranchVariables() {
  const name = `QA-Name-${randomAlphanumeric(8)}`;
  const address = `QA-Address-${randomAlphanumeric(10)}`;
  const zipCode = String(randomIntInclusive(5300, 5324)); // string per spec
  const email = `qa-${name}@qa.com`;
  const phoneNumber = randomDigits(11);
  const lat = randomIntWithinFloatBounds(7.71, 12.49);
  const lng = randomIntWithinFloatBounds(116.74, 121.61);

  // GraphQL variables
  const branch = {
    pharmacyId: 35, // int
    name, // string
    address, // string
    city: 'QA-City', // string
    province: 'QA-Province', // string
    zipCode, // string
    email, // string
    phoneNumber, // string
    lat, // int
    lng, // int
  };

  // keep meta OUTSIDE to use for assertions
  const meta = {
    expectedName: name,
    latBoundMin: 8,
    latBoundMax: 12,
    lngBoundMin: 117,
    lngBoundMax: 121,
  };

  return { branch, meta };
}

test.describe('GraphQL: Admin Create Branch', () => {
  test('Able to create a new branch with randomized fields @api @admin @positive', async ({
    api,
  }) => {
    // 1) Admin login
    const { accessToken, raw: adminLoginRes } = await adminLoginAndGetTokens(api, {
      username: process.env.ADMIN_USERNAME,
      password: process.env.ADMIN_PASSWORD,
    });
    expect(adminLoginRes.ok, adminLoginRes.error || 'Admin login failed').toBe(true);

    // 2) Variables (branch only; meta kept separate)
    const { branch, meta } = buildBranchVariables();

    // 3) Create branch
    const createBranchRes = await safeGraphQL(api, {
      query: CREATE_BRANCH_MUTATION,
      variables: { branch },
      headers: bearer(accessToken),
    });
    expect(
      createBranchRes.ok,
      createBranchRes.error || 'administrator.pharmacy.branch.create failed'
    ).toBe(true);

    // 4) Payload
    const branchNode = createBranchRes.body?.data?.administrator?.pharmacy?.branch?.create;
    expect(branchNode, 'Missing data.administrator.pharmacy.branch.create').toBeTruthy();

    // 5) Assertions
    expect.soft(typeof branchNode.id).toBe('string'); // id present
    expect.soft(branchNode.name).toBe(meta.expectedName); // echoes randomized name
    expect.soft(branchNode.pharmacyName).toBe('QA-Main-Pharmacy'); // fixed by pharmacyId=35

    // lat/lng should be numbers (ints are numbers in JS) and within our integer bounds
    expect.soft(typeof branchNode.lat).toBe('number');
    expect.soft(typeof branchNode.lng).toBe('number');
    expect.soft(branchNode.lat).toBeGreaterThanOrEqual(meta.latBoundMin);
    expect.soft(branchNode.lat).toBeLessThanOrEqual(meta.latBoundMax);
    expect.soft(branchNode.lng).toBeGreaterThanOrEqual(meta.lngBoundMin);
    expect.soft(branchNode.lng).toBeLessThanOrEqual(meta.lngBoundMax);
  });

  test('Should NOT return branch details with missing bearer token (401 Unauthorized) @api @admin @negative', async ({
    api,
    noAuth,
  }) => {
    const { branch } = buildBranchVariables();

    const createBranchNoAuthRes = await safeGraphQL(api, {
      query: CREATE_BRANCH_MUTATION,
      variables: { branch },
      headers: noAuth,
    });

    expect(createBranchNoAuthRes.ok).toBe(false);

    if (!createBranchNoAuthRes.httpOk) {
      // Transport-level unauthorized
      expect(createBranchNoAuthRes.httpStatus).toBe(401);
    } else {
      // GraphQL 200 + errors[]
      const unauthorizedErr = getGQLError(createBranchNoAuthRes);
      expect(unauthorizedErr.message.toLowerCase()).toContain('unauthorized');
      expect.soft(unauthorizedErr.code).toBe('401');
      expect.soft(unauthorizedErr.classification).toBe('UNAUTHORIZED');
    }
  });

  test('Should NOT return branch details with invalid bearer token (401 Unauthorized) @api @admin @negative', async ({
    api,
    invalidAuth,
  }) => {
    const { branch } = buildBranchVariables();

    const createBranchInvalidAuthRes = await safeGraphQL(api, {
      query: CREATE_BRANCH_MUTATION,
      variables: { branch },
      headers: invalidAuth,
    });

    expect(createBranchInvalidAuthRes.ok).toBe(false);
    expect(createBranchInvalidAuthRes.httpOk).toBe(false);
    expect(createBranchInvalidAuthRes.httpStatus).toBe(401);
  });
});
