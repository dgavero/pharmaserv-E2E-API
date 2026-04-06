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
import { FIND_RIDERS_QUERY, GET_RIDER_DETAIL_FOR_SEARCH_QUERY } from './admin.orderManagementQueries.js';

const riderAccount = getRiderAccount('default');

async function resolveRiderSearchProfile(api, accessToken) {
  const getRiderDetailRes = await safeGraphQL(api, {
    query: GET_RIDER_DETAIL_FOR_SEARCH_QUERY,
    variables: { by: { id: riderAccount.riderId } },
    headers: bearer(accessToken),
  });
  expect(getRiderDetailRes.ok, getRiderDetailRes.error || 'Get rider detail setup for find riders failed').toBe(true);

  const riderNode = getRiderDetailRes.body?.data?.administrator?.rider?.detail;
  expect(riderNode?.id, 'Missing rider detail setup node').toBeTruthy();
  expect(riderNode?.firstName, 'Missing rider firstName for find riders setup').toBeTruthy();
  return riderNode;
}

test.describe('GraphQL: Admin Find Riders', () => {
  test(
    'PHARMA-368 | Should find riders with valid auth tokens',
    {
      tag: ['@api', '@admin', '@positive', '@pharma-368'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsAdminAndGetTokens(api, getAdminCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Admin login failed').toBe(true);
      const riderProfile = await resolveRiderSearchProfile(api, accessToken);

      const findRidersRes = await safeGraphQL(api, {
        query: FIND_RIDERS_QUERY,
        variables: { query: riderProfile.firstName },
        headers: bearer(accessToken),
      });

      expect(findRidersRes.ok, findRidersRes.error || 'Find riders endpoint failed').toBe(true);

      const node = findRidersRes.body?.data?.administrator?.rider?.searchedRiders;
      expect(Array.isArray(node), 'Find riders should return an array').toBe(true);
      expect(node.some((riderNode) => String(riderNode?.id) === String(riderAccount.riderId)), 'Expected rider was not found in find riders response').toBe(
        true
      );
    }
  );

  test(
    'PHARMA-369 | Should NOT find riders with missing auth tokens',
    {
      tag: ['@api', '@admin', '@negative', '@pharma-369'],
    },
    async ({ api, noAuth }) => {
      const riderSearchQuery = riderAccount.username;
      const findRidersNoAuthRes = await safeGraphQL(api, {
        query: FIND_RIDERS_QUERY,
        variables: { query: riderSearchQuery },
        headers: noAuth,
      });

      expect(findRidersNoAuthRes.ok, findRidersNoAuthRes.error || 'Expected UNAUTHORIZED when missing token').toBe(
        false
      );

      if (!findRidersNoAuthRes.httpOk) {
        expect(NOAUTH_HTTP_STATUSES).toContain(findRidersNoAuthRes.httpStatus);
      } else {
        const { message, code, classification } = getGQLError(findRidersNoAuthRes);
        expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
        expect.soft(NOAUTH_CODES).toContain(code);
        expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
      }
    }
  );

  test(
    'PHARMA-370 | Should NOT find riders with invalid auth tokens',
    {
      tag: ['@api', '@admin', '@negative', '@pharma-370'],
    },
    async ({ api, invalidAuth }) => {
      const riderSearchQuery = riderAccount.username;
      const findRidersInvalidAuthRes = await safeGraphQL(api, {
        query: FIND_RIDERS_QUERY,
        variables: { query: riderSearchQuery },
        headers: invalidAuth,
      });

      expect(findRidersInvalidAuthRes.ok).toBe(false);
      expect(findRidersInvalidAuthRes.httpOk).toBe(false);
      expect(NOAUTH_HTTP_STATUSES).toContain(findRidersInvalidAuthRes.httpStatus);
    }
  );
});
