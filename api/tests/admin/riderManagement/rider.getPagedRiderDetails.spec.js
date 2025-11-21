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

const GET_RIDER_QUERY = `
  query ($by: IdentifierRequest!) {
    administrator {
      rider {
        detail(by: $by) {
          uuid
          username
          email
          firstName
          lastName
        }
      }
    }
  }
`;

const GET_PAGED_RIDERS_QUERY = `
  query ($filter: FilterRequest!) {
    administrator {
      rider {
        pagedRiders(filter: $filter) {
          page { totalSize }
          items { id firstName lastName status }
        }
      }
    }
  }
`;

// Expected identity for id=31 (hard-coded test oracle)
const EXPECTED_RIDER = {
  id: 2,
  username: 'emil.rider',
  email: 'emil.rider@gmail.com',
  firstName: 'Emil',
  lastName: 'Rider',
};

test.describe('GraphQL: Admin Get Rider Detail', () => {
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
      const riderRes = await safeGraphQL(api, {
        query: GET_RIDER_QUERY,
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
        query: GET_RIDER_QUERY,
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
      const riderDetailNoAuth = await safeGraphQL(api, {
        query: GET_RIDER_QUERY,
        variables: { by: { id: 31 } },
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
