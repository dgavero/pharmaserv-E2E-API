import {
  loginAsAdminAndGetTokens,
  NOAUTH_MESSAGE_PATTERN,
  NOAUTH_CLASSIFICATIONS,
  NOAUTH_CODES,
  NOAUTH_HTTP_STATUSES,
} from '../../../helpers/auth.js';
import { safeGraphQL, bearer, getGQLError } from '../../../helpers/graphqlUtils.js';
import { test, expect } from '../../../globalConfig.api.js';
import { getAdminCredentials, getRiderAccount } from '../../../helpers/roleCredentials.js';
import { SEARCHED_RIDERS_QUERY, GET_RIDER_DETAIL_FOR_SEARCH_QUERY } from './admin.orderManagementQueries.js';

const riderAccount = getRiderAccount('default');

async function resolveRiderSearchProfile(api, accessToken) {
  const getRiderDetailRes = await safeGraphQL(api, {
    query: GET_RIDER_DETAIL_FOR_SEARCH_QUERY,
    variables: { by: { id: riderAccount.riderId } },
    headers: bearer(accessToken),
  });
  expect(getRiderDetailRes.ok, getRiderDetailRes.error || 'Get rider detail setup for searched riders failed').toBe(true);

  const riderNode = getRiderDetailRes.body?.data?.administrator?.rider?.detail;
  expect(riderNode?.id, 'Missing rider detail setup node').toBeTruthy();
  expect(riderNode?.firstName, 'Missing rider firstName for searched riders setup').toBeTruthy();
  return riderNode;
}

test.describe('GraphQL: Admin Searched Riders', () => {
  test(
    'PHARMA-365 | Should search riders with valid auth tokens',
    {
      tag: ['@api', '@admin', '@positive', '@pharma-365'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsAdminAndGetTokens(api, getAdminCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Admin login failed').toBe(true);
      const riderProfile = await resolveRiderSearchProfile(api, accessToken);

      const searchedRidersRes = await safeGraphQL(api, {
        query: SEARCHED_RIDERS_QUERY,
        variables: { query: riderProfile.firstName },
        headers: bearer(accessToken),
      });

      expect(searchedRidersRes.ok, searchedRidersRes.error || 'Searched riders endpoint failed').toBe(true);

      const node = searchedRidersRes.body?.data?.administrator?.rider?.searchedRiders;
      expect(Array.isArray(node), 'Searched riders should return an array').toBe(true);
      expect(node.some((riderNode) => String(riderNode?.id) === String(riderAccount.riderId)), 'Expected rider was not found in searched riders').toBe(
        true
      );

      const matchedRider = node.find((riderNode) => String(riderNode?.id) === String(riderAccount.riderId));
      expect(matchedRider?.username).toBe(riderProfile.username);
    }
  );

  test(
    'PHARMA-366 | Should NOT search riders with missing auth tokens',
    {
      tag: ['@api', '@admin', '@negative', '@pharma-366'],
    },
    async ({ api, noAuth }) => {
      const riderSearchQuery = riderAccount.username;
      const searchedRidersNoAuthRes = await safeGraphQL(api, {
        query: SEARCHED_RIDERS_QUERY,
        variables: { query: riderSearchQuery },
        headers: noAuth,
      });

      expect(searchedRidersNoAuthRes.ok, searchedRidersNoAuthRes.error || 'Expected UNAUTHORIZED when missing token').toBe(
        false
      );

      if (!searchedRidersNoAuthRes.httpOk) {
        expect(NOAUTH_HTTP_STATUSES).toContain(searchedRidersNoAuthRes.httpStatus);
      } else {
        const { message, code, classification } = getGQLError(searchedRidersNoAuthRes);
        expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
        expect.soft(NOAUTH_CODES).toContain(code);
        expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
      }
    }
  );

  test(
    'PHARMA-367 | Should NOT search riders with invalid auth tokens',
    {
      tag: ['@api', '@admin', '@negative', '@pharma-367'],
    },
    async ({ api, invalidAuth }) => {
      const riderSearchQuery = riderAccount.username;
      const searchedRidersInvalidAuthRes = await safeGraphQL(api, {
        query: SEARCHED_RIDERS_QUERY,
        variables: { query: riderSearchQuery },
        headers: invalidAuth,
      });

      expect(searchedRidersInvalidAuthRes.ok).toBe(false);
      expect(searchedRidersInvalidAuthRes.httpOk).toBe(false);
      expect(NOAUTH_HTTP_STATUSES).toContain(searchedRidersInvalidAuthRes.httpStatus);
    }
  );
});
