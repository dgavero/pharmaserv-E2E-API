import { test, expect } from '../../../globalConfig.api.js';
import { safeGraphQL } from '../../../helpers/graphqlUtils.js';
import { GET_RIDER_PRIVACY_POLICY_QUERY } from './rider.legalsQueries.js';

test.describe('GraphQL: Get Rider Privacy Policy', () => {
  test(
    'PHARMA-117 | Should be able to get rider privacy policy',
    {
      tag: ['@api', '@rider', '@positive', '@pharma-117'],
    },
    async ({ api, noAuth }) => {
      const getPrivacyPolicyRes = await safeGraphQL(api, {
        query: GET_RIDER_PRIVACY_POLICY_QUERY,
        headers: noAuth,
      });

      // Main Assertion
      expect(
        getPrivacyPolicyRes.ok,
        getPrivacyPolicyRes.error || 'Get Rider Privacy Policy request failed'
      ).toBe(true);
    }
  );
});
