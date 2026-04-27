import { loginAsRiderAndGetTokens } from '../../../helpers/auth.js';
import { safeGraphQL, bearer } from '../../../helpers/graphqlUtils.js';
import { test, expect } from '../../../globalConfig.api.js';
import { getRiderCredentials } from '../../../helpers/roleCredentials.js';
import { RIDER_SET_AVAILABLE_STATUS_QUERY, RIDER_SET_UNAVAILABLE_STATUS_QUERY } from './rider.profileQueries.js';

test.describe('GraphQL: Rider able to set status', () => {
  test(
    'PHARMA-121 | Should be able to set rider status to available',
    {
      tag: ['@api', '@rider', '@positive', '@pharma-121'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsRiderAndGetTokens(api, getRiderCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Rider login failed').toBe(true);

      const setAvailableStatusRes = await safeGraphQL(api, {
        query: RIDER_SET_AVAILABLE_STATUS_QUERY,
        headers: bearer(accessToken),
      });

      // Main Assertion
      expect(
        setAvailableStatusRes.ok,
        setAvailableStatusRes.error || 'Set Rider Available Status request failed'
      ).toBe(true);
    }
  );

  test(
    'PHARMA-122 | Should be able to set rider status to unavailable',
    {
      tag: ['@api', '@rider', '@positive', '@pharma-122'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsRiderAndGetTokens(api, getRiderCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Rider login failed').toBe(true);

      const setUnavailableStatusRes = await safeGraphQL(api, {
        query: RIDER_SET_UNAVAILABLE_STATUS_QUERY,
        headers: bearer(accessToken),
      });

      // Main Assertion
      expect(
        setUnavailableStatusRes.ok,
        setUnavailableStatusRes.error || 'Set Rider Unavailable Status request failed'
      ).toBe(true);
    }
  );

  test(
    'PHARMA-572 | Rider set available status should satisfy response contract shape',
    {
      tag: ['@api', '@rider', '@positive', '@pharma-572'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsRiderAndGetTokens(api, getRiderCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Rider login failed').toBe(true);

      const setAvailableStatusRes = await safeGraphQL(api, {
        query: RIDER_SET_AVAILABLE_STATUS_QUERY,
        headers: bearer(accessToken),
      });

      expect(setAvailableStatusRes.httpStatus).toBe(200);
      expect(setAvailableStatusRes.httpOk).toBe(true);
      expect(
        setAvailableStatusRes.ok,
        setAvailableStatusRes.error || 'Set Rider Available Status request failed'
      ).toBe(true);

      const node = setAvailableStatusRes.body?.data?.rider?.setAvailable;
      expect(node, 'Missing data.rider.setAvailable').toBeTruthy();
      expect.soft(typeof node?.status).toBe('string');
    }
  );
});
