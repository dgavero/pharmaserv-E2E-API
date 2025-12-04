import { test, expect } from '../../../globalConfig.api.js';
import {
  RIDER_SET_AVAILABLE_STATUS_QUERY,
  RIDER_SET_UNAVAILABLE_STATUS_QUERY,
} from '../profile/rider.profileQueries.js';
import { safeGraphQL, bearer, riderLoginAndGetTokens } from '../../../helpers/testUtilsAPI.js';

test.describe('GraphQL: Rider able to set status', () => {
  test(
    'PHARMA-121 | Should be able to set rider status to available',
    {
      tag: ['@api', '@rider', '@positive', '@pharma-121'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await riderLoginAndGetTokens(api, {
        username: process.env.RIDER_USERNAME,
        password: process.env.RIDER_PASSWORD,
      });
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
      const { accessToken, raw: loginRes } = await riderLoginAndGetTokens(api, {
        username: process.env.RIDER_USERNAME,
        password: process.env.RIDER_PASSWORD,
      });
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
});
