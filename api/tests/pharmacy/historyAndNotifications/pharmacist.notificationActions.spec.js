import { test, expect } from '../../../globalConfig.api.js';
import {
  PHARMACIST_GET_NOTIFICATIONS_COUNT_QUERY,
  PHARMACIST_GET_NOTIFICATIONS_QUERY,
  PHARMACIST_GET_ORDER_HISTORY_QUERY,
  PHARMACIST_SEEN_ALL_NOTIFICATIONS_QUERY,
} from '../historyAndNotifications/pharmacist.notificationQueries.js';
import { safeGraphQL, bearer, pharmacistLoginAndGetTokens } from '../../../helpers/testUtilsAPI.js';

test.describe('GraphQL: Pharmacy Notifications ', () => {
  test(
    'PHARMA-215 | Should be able to Get Notifications Count for logged in Pharmacist',
    {
      tag: ['@api', '@pharmacist', '@positive', '@pharma-215'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await pharmacistLoginAndGetTokens(api, {
        username: process.env.PHARMACIST_USERNAME_REG01,
        password: process.env.PHARMACIST_PASSWORD_REG01,
      });
      expect(loginRes.ok, loginRes.error || 'Pharmacist admin login failed').toBe(true);

      const getNotificationsCountRes = await safeGraphQL(api, {
        query: PHARMACIST_GET_NOTIFICATIONS_COUNT_QUERY,
        headers: bearer(accessToken),
      });

      expect(getNotificationsCountRes.ok).toBe(true);
    }
  );

  test(
    'PHARMA-216 | Should be able to Get Notifications as logged in Pharmacist',
    {
      tag: ['@api', '@pharmacist', '@positive', '@pharma-216'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await pharmacistLoginAndGetTokens(api, {
        username: process.env.PHARMACIST_USERNAME_REG01,
        password: process.env.PHARMACIST_PASSWORD_REG01,
      });
      expect(loginRes.ok, loginRes.error || 'Pharmacist admin login failed').toBe(true);

      const getNotificationRes = await safeGraphQL(api, {
        query: PHARMACIST_GET_NOTIFICATIONS_QUERY,
        headers: bearer(accessToken),
      });

      expect(getNotificationRes.ok).toBe(true);
    }
  );

  test(
    'PHARMA-217 | Should be able to get Order History as logged in Pharmacist',
    {
      tag: ['@api', '@pharmacist', '@positive', '@pharma-217'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await pharmacistLoginAndGetTokens(api, {
        username: process.env.PHARMACIST_USERNAME_REG01,
        password: process.env.PHARMACIST_PASSWORD_REG01,
      });
      expect(loginRes.ok, loginRes.error || 'Pharmacist admin login failed').toBe(true);

      const getOrderHistoryRes = await safeGraphQL(api, {
        query: PHARMACIST_GET_ORDER_HISTORY_QUERY,
        headers: bearer(accessToken),
      });

      expect(getOrderHistoryRes.ok).toBe(true);
    }
  );

  test(
    'PHARMA-218 | Should be able to Put your test case title here',
    {
      tag: ['@api', '@pharmacist', '@positive', '@pharma-218'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await pharmacistLoginAndGetTokens(api, {
        username: process.env.PHARMACIST_USERNAME_REG01,
        password: process.env.PHARMACIST_PASSWORD_REG01,
      });
      expect(loginRes.ok, loginRes.error || 'Pharmacist admin login failed').toBe(true);

      const seenAllNotificationsRes = await safeGraphQL(api, {
        query: PHARMACIST_SEEN_ALL_NOTIFICATIONS_QUERY,
        headers: bearer(accessToken),
      });

      expect(seenAllNotificationsRes.ok).toBe(true);
    }
  );
});
