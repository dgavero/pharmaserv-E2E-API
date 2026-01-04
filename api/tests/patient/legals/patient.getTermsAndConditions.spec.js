import { test, expect } from '../../../globalConfig.api.js';
import { safeGraphQL } from '../../../helpers/testUtilsAPI.js';

const GET_TNC_QUERY = /* GraphQL */ `
  query {
    patient {
      legals {
        termsAndConditions {
          title
          content
        }
      }
    }
  }
`;

test.describe('GraphQL: Get Terms and Conditions', () => {
  test(
    'PHARMA-60 | Should be able to load Terms and Conditions',
    {
      tag: ['@api', '@patient', '@positive', '@pharma-60', '@legals'],
    },
    async ({ api, noAuth }) => {
      const getTNCRes = await safeGraphQL(api, {
        query: GET_TNC_QUERY,
        headers: noAuth,
      });

      // Main Assertion
      expect(getTNCRes.ok, getTNCRes.error || 'Get Terms and Conditions failed').toBe(true);

      const node = getTNCRes.body?.data?.patient?.legals?.termsAndConditions;
      expect(node, 'Missing data.patient.legals.termsAndConditions').toBeTruthy();

      // Print to CLI
      console.log('Terms and Conditions Title:', node.title);
      console.log('Terms and Conditions Content:', node.content);

      // Soft checks on fields
      expect.soft(typeof node.title).toBe('string');
      expect.soft(typeof node.content).toBe('string');
    }
  );
});
