import { test, expect } from '../../../globalConfig.api.js';
import {
  safeGraphQL,
  adminLoginAndGetTokens,
  bearer,
  getGQLError,
  NOAUTH_MESSAGE_PATTERN,
  NOAUTH_CODES,
  NOAUTH_CLASSIFICATIONS,
} from '../../../helpers/testUtilsAPI.js';
import { randomAlphanumeric } from '../../../../helpers/globalTestUtils.js';

const CREATE_BRANCH_MUTATION = `
mutation ($pharmacyId: ID!, $branch: BranchCreateRequest!) 
{ administrator { pharmacy { branch { create(pharmacyId: $pharmacyId, branch: $branch) 
 { id code pharmacyName name lat lng } } } } }
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
// Replace your current buildBranchVariables() with this:
function buildBranchVariables() {
  const name = `QA-Name-${randomAlphanumeric(8)}`;
  const regionCode = String(randomIntInclusive(10, 99));
  const address = `QA-Address-${randomAlphanumeric(10)}`;
  const zipCode = String(randomIntInclusive(5300, 5324)); // string per spec
  const email = `qa-${name}@qa.com`;
  const phoneNumber = randomDigits(11);
  const lat = randomIntWithinFloatBounds(7.71, 12.49);
  const lng = randomIntWithinFloatBounds(116.74, 121.61);
  const openingTime = '10:00:00+08:00';
  const closingTime = '21:00:00+08:00';

  // Created branch for API test
  const pharmacyId = String(4);

  const branch = {
    name, // string
    regionCode, // string
    address, // string
    city: 'QA-City', // string
    province: 'QA-Province', // string
    zipCode, // string
    email, // string
    phoneNumber, // string
    lat, // int (GraphQL ID vs Float is server-defined; JS number is fine)
    lng, // int
    closingTime, // string
    openingTime, // string
  };

  const meta = {
    expectedName: name,
    latBoundMin: 8,
    latBoundMax: 12,
    lngBoundMin: 117,
    lngBoundMax: 121,
  };

  return { pharmacyId, branch, meta };
}

test.describe('GraphQL: Admin Create Branch', () => {
  test(
    'PHARMA-24 | Able to create a new Pharmacy Branch with randomized fields',
    {
      tag: ['@api', '@admin', '@positive', '@create', '@pharma-24'],
    },
    async ({ api }) => {
      // 1) Admin login
      const { accessToken, raw: adminLoginRes } = await adminLoginAndGetTokens(api, {
        username: process.env.ADMIN_USERNAME,
        password: process.env.ADMIN_PASSWORD,
      });
      expect(adminLoginRes.ok, adminLoginRes.error || 'Admin login failed').toBe(true);

      // 2) Variables (branch only; meta kept separate)
      const { pharmacyId, branch, meta } = buildBranchVariables();

      // 3) Create branch
      const createBranchRes = await safeGraphQL(api, {
        query: CREATE_BRANCH_MUTATION,
        variables: { pharmacyId, branch },
        headers: bearer(accessToken),
      });
      expect(createBranchRes.ok, createBranchRes.error || 'administrator.pharmacy.branch.create failed').toBe(true);

      // 4) Payload
      const branchNode = createBranchRes.body?.data?.administrator?.pharmacy?.branch?.create;
      expect(branchNode, 'Missing data.administrator.pharmacy.branch.create').toBeTruthy();

      // 5) Assertions
      expect.soft(typeof branchNode.id).toBe('string'); // id present
      expect.soft(branchNode.name).toBe(meta.expectedName); // echoes randomized name
      expect.soft(branchNode.pharmacyName).toBe('QA Mercury Drug'); // fixed by pharmacyId=4

      // lat/lng should be numbers (ints are numbers in JS) and within our integer bounds
      expect.soft(typeof branchNode.lat).toBe('number');
      expect.soft(typeof branchNode.lng).toBe('number');
      expect.soft(branchNode.lat).toBeGreaterThanOrEqual(meta.latBoundMin);
      expect.soft(branchNode.lat).toBeLessThanOrEqual(meta.latBoundMax);
      expect.soft(branchNode.lng).toBeGreaterThanOrEqual(meta.lngBoundMin);
      expect.soft(branchNode.lng).toBeLessThanOrEqual(meta.lngBoundMax);
    }
  );

  test(
    'PHARMA-25 | Should NOT return branch details with missing bearer token (401 Unauthorized)',
    {
      tag: ['@api', '@admin', '@negative', '@pharma-25'],
    },
    async ({ api, noAuth }) => {
      const { pharmacyId, branch } = buildBranchVariables();

      const createBranchNoAuthRes = await safeGraphQL(api, {
        query: CREATE_BRANCH_MUTATION,
        variables: { pharmacyId, branch },
        headers: noAuth,
      });

      expect(createBranchNoAuthRes.ok).toBe(false);

      if (!createBranchNoAuthRes.httpOk) {
        // Transport-level unauthorized
        expect(createBranchNoAuthRes.httpStatus).toBe(401);
      } else {
        // GraphQL 200 + errors[]
        const { message, code, classification } = getGQLError(createBranchNoAuthRes);

        expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
        expect.soft(NOAUTH_CODES).toContain(code);
        expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
      }
    }
  );

  test(
    'PHARMA-26 | Should NOT return branch details with invalid bearer token (401 Unauthorized)',
    {
      tag: ['@api', '@admin', '@negative', '@pharma-26'],
    },
    async ({ api, invalidAuth }) => {
      const { pharmacyId, branch } = buildBranchVariables();

      const createBranchInvalidAuthRes = await safeGraphQL(api, {
        query: CREATE_BRANCH_MUTATION,
        variables: { pharmacyId, branch },
        headers: invalidAuth,
      });

      expect(createBranchInvalidAuthRes.ok).toBe(false);
      expect(createBranchInvalidAuthRes.httpOk).toBe(false);
      expect(createBranchInvalidAuthRes.httpStatus).toBe(401);
    }
  );
});
