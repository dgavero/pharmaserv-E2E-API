import { test, expect } from '../../../globalConfig.api.js';
import { safeGraphQL } from '../../../helpers/testUtilsAPI.js';

const GET_PRIVACY_POLICY_QUERY = /* GraphQL */ `
  query {
    patient {
      legals {
        privacyPolicy {
          title
          content
        }
      }
    }
  }
`;

test.describe('GraphQL: Get Privacy Policy', () => {
  test(
    'PHARMA-59 | Should be able to load Privacy Policy',
    {
      tag: ['@api', '@patient', '@positive', '@pharma-59', '@smoke', '@legals'],
    },
    async ({ api, noAuth }) => {
      const getPrivacyPolicyRes = await safeGraphQL(api, {
        query: GET_PRIVACY_POLICY_QUERY,
        headers: noAuth,
      });

      // Main Assertion
      expect(getPrivacyPolicyRes.ok, getPrivacyPolicyRes.error || 'Get Privacy Policy failed').toBe(
        true
      );

      const node = getPrivacyPolicyRes.body?.data?.patient?.legals?.privacyPolicy;
      expect(node, 'Missing data.patient.legals.privacyPolicy').toBeTruthy();

      // Print to CLI
      console.log('Privacy Policy Title:', node.title);
      console.log('Privacy Policy Content:', node.content);

      // Soft checks on fields
      expect.soft(typeof node.title).toBe('string');
      expect.soft(typeof node.content).toBe('string');
    }
  );
});
