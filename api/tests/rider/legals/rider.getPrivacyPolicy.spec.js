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

  test(
    'PHARMA-554 | Rider privacy policy should satisfy response contract shape',
    {
      tag: ['@api', '@rider', '@positive', '@pharma-554'],
    },
    async ({ api, noAuth }) => {
      const getPrivacyPolicyRes = await safeGraphQL(api, {
        query: GET_RIDER_PRIVACY_POLICY_QUERY,
        headers: noAuth,
      });

      expect(getPrivacyPolicyRes.httpStatus).toBe(200);
      expect(getPrivacyPolicyRes.httpOk).toBe(true);
      expect(getPrivacyPolicyRes.ok, getPrivacyPolicyRes.error || 'Get Rider Privacy Policy request failed').toBe(
        true
      );

      const node = getPrivacyPolicyRes.body?.data?.rider?.legals?.privacyPolicy;
      expect(node, 'Missing data.rider.legals.privacyPolicy').toBeTruthy();
      expect.soft(typeof node?.title).toBe('string');
      expect.soft(typeof node?.content).toBe('string');
    }
  );
});
