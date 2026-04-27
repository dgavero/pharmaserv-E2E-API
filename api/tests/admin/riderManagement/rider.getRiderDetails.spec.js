import {
  loginAsAdminAndGetTokens,
  loginAsRiderAndGetTokens,
  NOAUTH_MESSAGE_PATTERN,
  NOAUTH_CLASSIFICATIONS,
  NOAUTH_CODES,
  NOAUTH_HTTP_STATUSES,
} from '../../../helpers/auth.js';
import { safeGraphQL, bearer, getGQLError } from '../../../helpers/graphqlUtils.js';
import { test, expect } from '../../../globalConfig.api.js';
import { getAdminCredentials, getRiderAccount } from '../../../helpers/roleCredentials.js';
import { ME_RIDER_QUERY } from '../../rider/profile/rider.profileQueries.js';
import { GET_PAGED_RIDERS_QUERY, GET_RIDER_DETAIL_QUERY } from './rider.riderManagementQueries.js';

const defaultRiderAccount = getRiderAccount('default');

async function getDefaultRiderProfile(api) {
  const { accessToken, raw: loginRes } = await loginAsRiderAndGetTokens(api, defaultRiderAccount);
  expect(loginRes.ok, loginRes.error || 'Rider login failed').toBe(true);

  const meRiderRes = await safeGraphQL(api, {
    query: ME_RIDER_QUERY,
    headers: bearer(accessToken),
  });
  expect(meRiderRes.ok, meRiderRes.error || 'Get rider me failed').toBe(true);

  const riderNode = meRiderRes.body?.data?.rider?.me;
  expect(riderNode, 'Missing data.rider.me').toBeTruthy();
  return riderNode;
}

test.describe('GraphQL: Get Rider Detail', () => {
  test(
    'PHARMA-48 | Should be able to get Rider Details [1] with valid Auth',
    {
      tag: ['@api', '@admin', '@positive', '@pharma-48'],
    },
    async ({ api }) => {
      // Login to get tokens
      const { accessToken, raw: loginRes } = await loginAsAdminAndGetTokens(api, getAdminCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Admin login failed').toBe(true);

      // get rider detail
      const rider = await getDefaultRiderProfile(api);
      const getRiderRes = await safeGraphQL(api, {
        query: GET_RIDER_DETAIL_QUERY,
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
      const rider = defaultRiderAccount;
      const getRiderNoAuthRes = await safeGraphQL(api, {
        query: GET_RIDER_DETAIL_QUERY,
        variables: {
          by: { id: rider.riderId },
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
      const rider = defaultRiderAccount;
      const getRiderInvalidAuthRes = await safeGraphQL(api, {
        query: GET_RIDER_DETAIL_QUERY,
        variables: {
          by: { id: rider.riderId },
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
      const { accessToken, raw: loginRes } = await loginAsAdminAndGetTokens(api, getAdminCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Admin login failed').toBe(true);

      // 2) Query rider detail (hard-coded id)
      const expectedRider = await getDefaultRiderProfile(api);
      const riderRes = await safeGraphQL(api, {
        query: GET_RIDER_DETAIL_QUERY,
        variables: { by: { id: expectedRider.id } },
        headers: bearer(accessToken),
      });
      expect(riderRes.ok, riderRes.error || 'administrator.rider.detail query failed').toBe(true);

      // 3) Validate payload (hard assertions on identity fields)
      const node = riderRes.body?.data?.administrator?.rider?.detail;
      expect(node, 'Missing data.administrator.rider.detail').toBeTruthy();

      expect(node.username).toBe(expectedRider.username);
      expect.soft(typeof node.email).toBe('string');
      expect.soft(typeof node.firstName).toBe('string');
      expect.soft(typeof node.lastName).toBe('string');
    }
  );

  test(
    'PHARMA-20 | Should NOT return rider details for id 999999999',
    {
      tag: ['@api', '@admin', '@negative', '@pharma-20'],
    },
    async ({ api }) => {
      // Admin login
      const { accessToken, raw: loginRes } = await loginAsAdminAndGetTokens(api, getAdminCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Admin login failed').toBe(true);

      // Attempt detail with a non-existent ID
      const riderDetailNotFound = await safeGraphQL(api, {
        query: GET_RIDER_DETAIL_QUERY,
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
      const rider = defaultRiderAccount;

      const riderDetailNoAuth = await safeGraphQL(api, {
        query: GET_RIDER_DETAIL_QUERY,
        variables: { by: { id: rider.riderId } },
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
      const { accessToken, raw: loginRes } = await loginAsAdminAndGetTokens(api, getAdminCredentials('default'));
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

  test(
    'PHARMA-477 | Rider detail should satisfy response contract shape',
    {
      tag: ['@api', '@admin', '@positive', '@pharma-477'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsAdminAndGetTokens(api, getAdminCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Admin login failed').toBe(true);

      const rider = await getDefaultRiderProfile(api);
      const getRiderRes = await safeGraphQL(api, {
        query: GET_RIDER_DETAIL_QUERY,
        variables: {
          by: { id: rider.id },
        },
        headers: bearer(accessToken),
      });

      expect(getRiderRes.httpStatus).toBe(200);
      expect(getRiderRes.httpOk).toBe(true);
      expect(getRiderRes.ok, getRiderRes.error || 'Get Rider Detail failed').toBe(true);

      const node = getRiderRes.body?.data?.administrator?.rider?.detail;
      expect(node, 'Missing data.administrator.rider.detail').toBeTruthy();
      expect.soft(typeof node?.id).toBe('string');
      expect.soft(typeof node?.uuid).toBe('string');
      expect.soft(typeof node?.username).toBe('string');
      expect.soft(typeof node?.email).toBe('string');
      expect.soft(typeof node?.firstName).toBe('string');
      expect.soft(typeof node?.lastName).toBe('string');
      expect.soft(typeof node?.status).toBe('string');
      expect.soft(['AVAILABLE', 'UNAVAILABLE']).toContain(node?.status);
      expect.soft(node.id).toBe(rider.id);
    }
  );
});
