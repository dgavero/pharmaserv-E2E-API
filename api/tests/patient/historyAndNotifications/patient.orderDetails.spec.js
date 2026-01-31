import { test, expect } from '../../../globalConfig.api.js';
import { GET_ACTIVE_ORDER_QUERY, GET_ORDER_HISTORY_QUERY } from './patient.getHistoryNotificationQueries.js';
import { safeGraphQL, bearer, loginAndGetTokens } from '../../../helpers/testUtilsAPI.js';

test.describe('GraphQL: Order Details Patient', () => {
  test(
    'PHARMA-186 | Should be able to get All Active Orders as Patient',
    {
      tag: ['@api', '@patient', '@positive', '@pharma-186'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAndGetTokens(api, {
        username: process.env.PATIENT_USER_USERNAME,
        password: process.env.PATIENT_USER_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Patient login failed').toBe(true);

      const getActiveOrderRes = await safeGraphQL(api, {
        query: GET_ACTIVE_ORDER_QUERY,
        headers: bearer(accessToken),
      });

      expect(getActiveOrderRes.ok).toBe(true);
    }
  );

  test(
    'PHARMA-187 | Should be able get Order History as Patient',
    {
      tag: ['@api', '@patient', '@positive', '@pharma-187'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAndGetTokens(api, {
        username: process.env.PATIENT_USER_USERNAME,
        password: process.env.PATIENT_USER_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Patient login failed').toBe(true);

      const getOrderHistoryRes = await safeGraphQL(api, {
        query: GET_ORDER_HISTORY_QUERY,
        headers: bearer(accessToken),
      });

      expect(getOrderHistoryRes.ok).toBe(true);
    }
  );
});
