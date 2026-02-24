import { test, expect } from '../../../globalConfig.api.js';
import {
  safeGraphQL,
  bearer,
  adminLoginAndGetTokens,
  getGQLError,
  NOAUTH_MESSAGE_PATTERN,
  NOAUTH_CLASSIFICATIONS,
  NOAUTH_CODES,
  NOAUTH_HTTP_STATUSES,
} from '../../../helpers/testUtilsAPI.js';

function resolveRiderData() {
  const testEnv = String(process.env.TEST_ENV || 'DEV').toUpperCase();

  const riderDataByEnv = {
    DEV: {
      id: '8',
      uuid: 'b56c95f8-7127-479c-a47f-a6742bcbd758',
      firstName: 'Dave',
      expected: {
        id: '8',
        username: 'dave.riderapi',
        email: 'dave.rider.api@yopmail.com',
        firstName: 'Dave',
        lastName: 'RiderApi',
      },
    },

    QA: {
      id: '30',
      uuid: 'a267fe74-771c-49c8-b0ab-46864dfc5455',
      firstName: 'Test',
      expected: {
        id: '30',
        username: 'testriderqa@yopmail.com',
        email: 'testriderqa@yopmail.com',
        firstName: 'Test',
        lastName: 'RiderQA',
      },
    },

    PROD: {
      id: 10,
      uuid: 'd56c95f8-7127-479c-a47f-a6742bcbd760',
      firstName: 'PROD Dave',
      expected: {
        id: 10,
        username: 'prod.riderapi',
        email: 'prod.rider.api@yopmail.com',
        firstName: 'PROD Dave',
        lastName: 'RiderApi',
      },
    },
  };

  if (!riderDataByEnv[testEnv]) {
    throw new Error(`Unsupported TEST_ENV: ${testEnv}`);
  }

  return riderDataByEnv[testEnv];
}

const GET_RIDER_MUTATION = /* GraphQL */ `
  query ($by: IdentifierRequest!) {
    administrator {
      rider {
        detail(by: $by) {
          id
          uuid
          username
          email
          firstName
          lastName
          status
        }
      }
    }
  }
`;

const GET_PAGED_RIDERS_QUERY = /* GraphQL */ `
  query ($filter: RiderFilterRequest!) {
    administrator {
      rider {
        pagedRiders(filter: $filter) {
          page {
            totalSize
          }
          items {
            id
            firstName
            lastName
            username
            status
          }
        }
      }
    }
  }
`;

test.describe('GraphQL: Get Rider Detail', () => {
  test(
    'PHARMA-48 | Should be able to get Rider Details [1] with valid Auth',
    {
      tag: ['@api', '@admin', '@positive', '@pharma-48'],
    },
    async ({ api }) => {
      // Login to get tokens
      const { accessToken, raw: loginRes } = await adminLoginAndGetTokens(api, {
        username: process.env.ADMIN_USERNAME,
        password: process.env.ADMIN_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Admin login failed').toBe(true);

      // get rider detail
      const rider = resolveRiderData();
      const getRiderRes = await safeGraphQL(api, {
        query: GET_RIDER_MUTATION,
        variables: {
          by: { id: rider.id },
        },
        headers: bearer(accessToken),
      });

      // Main Assertion
      expect(getRiderRes.ok, getRiderRes.error || 'Get Rider Detail failed').toBe(true);

      // Get rider data and asset
      const node = getRiderRes.body?.data?.administrator?.rider?.detail;
      expect(node, 'Rider detail is null').toBeTruthy();

      expect(node.id).toBe(rider.id);
      expect(node.uuid).toBe(rider.uuid);
      expect(node.firstName).toBe(rider.firstName);
    }
  );

  test(
    'PHARMA-49 | Should NOT be able to get Rider Details [1] with missing Auth token',
    {
      tag: ['@api', '@admin', '@negative', '@pharma-49'],
    },
    async ({ api, noAuth }) => {
      const rider = resolveRiderData();
      const getRiderNoAuthRes = await safeGraphQL(api, {
        query: GET_RIDER_MUTATION,
        variables: {
          by: { id: rider.id },
        },
        headers: noAuth,
      });

      // Main Assertion
      expect(getRiderNoAuthRes.ok, 'Expected UNAUTHORIZED when missing token').toBe(false);
      const { message, code, classification } = getGQLError(getRiderNoAuthRes);
      expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
      expect.soft(NOAUTH_CODES).toContain(code);
      expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
    }
  );

  test(
    'PHARMA-50 | Should NOT be able to get Rider Details [1] with invalid Auth token',
    {
      tag: ['@api', '@admin', '@negative', '@pharma-50'],
    },
    async ({ api, invalidAuth }) => {
      const rider = resolveRiderData();
      const getRiderInvalidAuthRes = await safeGraphQL(api, {
        query: GET_RIDER_MUTATION,
        variables: {
          by: { id: rider.id },
        },
        headers: invalidAuth,
      });

      // Main Assertion
      expect(getRiderInvalidAuthRes.ok, 'Expected UNAUTHORIZED with invalid token').toBe(false);

      // Transport-level 401 (no GraphQL errors[])
      expect(getRiderInvalidAuthRes.ok).toBe(false);
      expect(getRiderInvalidAuthRes.httpOk).toBe(false);
      expect(NOAUTH_HTTP_STATUSES).toContain(getRiderInvalidAuthRes.httpStatus);
    }
  );

  test(
    'PHARMA-19 | Should return rider detail for specified ID',
    {
      tag: ['@api', '@admin', '@positive', '@pharma-19'],
    },
    async ({ api }) => {
      // 1) Admin login
      const { accessToken, raw: loginRes } = await adminLoginAndGetTokens(api, {
        username: process.env.ADMIN_USERNAME,
        password: process.env.ADMIN_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Admin login failed').toBe(true);

      // 2) Query rider detail (hard-coded id)
      const rider = resolveRiderData();
      const EXPECTED_RIDER = rider.expected;
      const riderRes = await safeGraphQL(api, {
        query: GET_RIDER_MUTATION,
        variables: { by: { id: EXPECTED_RIDER.id } },
        headers: bearer(accessToken),
      });
      expect(riderRes.ok, riderRes.error || 'administrator.rider.detail query failed').toBe(true);

      // 3) Validate payload (hard assertions on identity fields)
      const node = riderRes.body?.data?.administrator?.rider?.detail;
      expect(node, 'Missing data.administrator.rider.detail').toBeTruthy();

      expect(node.username).toBe(EXPECTED_RIDER.username);
      expect(node.email).toBe(EXPECTED_RIDER.email);
      expect(node.firstName).toBe(EXPECTED_RIDER.firstName);
      expect(node.lastName).toBe(EXPECTED_RIDER.lastName);
    }
  );

  test(
    'PHARMA-20 | Should NOT return rider details for id 999999999',
    {
      tag: ['@api', '@admin', '@negative', '@pharma-20'],
    },
    async ({ api }) => {
      // Admin login
      const { accessToken, raw: loginRes } = await adminLoginAndGetTokens(api, {
        username: process.env.ADMIN_USERNAME,
        password: process.env.ADMIN_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Admin login failed').toBe(true);

      // Attempt detail with a non-existent ID
      const riderDetailNotFound = await safeGraphQL(api, {
        query: GET_RIDER_MUTATION,
        variables: { by: { id: 999_999_999 } },
        headers: bearer(accessToken),
      });

      // Expect resolver error (GraphQL 200 + errors[])
      expect(riderDetailNotFound.ok, 'Expected NOT_FOUND for unknown rider ID').toBe(false);

      // Verify message, code, classification (ignore everything else)
      const { message, code, classification } = getGQLError(riderDetailNotFound);
      expect(message.toLowerCase()).toContain('not found');
      expect.soft(code).toBe('404');
      expect.soft(classification).toBe('NOT_FOUND');
    }
  );

  test(
    'PHARMA-21 | Should NOT return rider detail without Authorization token',
    {
      tag: ['@api', '@admin', '@negative', '@pharma-21'],
    },
    async ({ api, noAuth }) => {
      // Correct ID, but NO bearer header
      const rider = resolveRiderData();

      const riderDetailNoAuth = await safeGraphQL(api, {
        query: GET_RIDER_MUTATION,
        variables: { by: { id: rider.id } },
        headers: noAuth,
      });

      // Expect resolver error
      expect(riderDetailNoAuth.ok, 'Expected UNAUTHORIZED when missing token').toBe(false);

      // Check message, code, classification only
      const { message, code, classification } = getGQLError(riderDetailNoAuth);
      expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
      expect.soft(NOAUTH_CODES).toContain(code);
      expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
    }
  );

  test(
    'PHARMA-22 | Should return paged riders with pageSize=5 (page=1)',
    {
      tag: ['@api', '@admin', '@positive', '@pharma-22'],
    },
    async ({ api }) => {
      // Admin login
      const { accessToken, raw: loginRes } = await adminLoginAndGetTokens(api, {
        username: process.env.ADMIN_USERNAME,
        password: process.env.ADMIN_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Admin login failed').toBe(true);

      // Query paged riders
      const pagedRidersRes = await safeGraphQL(api, {
        query: GET_PAGED_RIDERS_QUERY,
        variables: { filter: { pageSize: 5, page: 1, ascending: true } },
        headers: bearer(accessToken),
      });
      expect(pagedRidersRes.ok, pagedRidersRes.error || 'pagedRiders query failed').toBe(true);

      // Node checks
      const pagedBlock = pagedRidersRes.body?.data?.administrator?.rider?.pagedRiders;
      expect(pagedBlock, 'Missing data.administrator.rider.pagedRiders').toBeTruthy();

      const pageNode = pagedBlock?.page;
      const items = pagedBlock?.items ?? [];
      expect(pageNode, 'Missing data.administrator.rider.pagedRiders.page').toBeTruthy();
      expect(Array.isArray(items), 'items should be an array').toBe(true);

      // Count contract
      expect(items.length).toBe(5);

      // Per-item shape (soft)
      for (const it of items) {
        expect.soft(typeof it.id).toBe('string');
        expect.soft(typeof it.firstName).toBe('string');
        expect.soft(typeof it.lastName).toBe('string');
        expect.soft(typeof it.status).toBe('string'); // e.g., AVAILABLE / UNAVAILABLE
      }
    }
  );

  test(
    'PHARMA-23 | Should NOT return paged riders without Authorization token',
    {
      tag: ['@api', '@admin', '@negative', '@pharma-23'],
    },
    async ({ api, noAuth }) => {
      const pagedRidersNoAuth = await safeGraphQL(api, {
        query: GET_PAGED_RIDERS_QUERY,
        variables: { filter: { pageSize: 5, page: 1, ascending: true } },
        headers: noAuth,
      });

      expect(pagedRidersNoAuth.ok, 'Expected UNAUTHORIZED when missing token').toBe(false);

      const { message, code, classification } = getGQLError(pagedRidersNoAuth);
      expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
      expect.soft(NOAUTH_CODES).toContain(code);
      expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
    }
  );
});
