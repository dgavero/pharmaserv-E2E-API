import { test, expect } from '../../../globalConfig.api.js';
import {
  GET_NOTIFICATIONS_QUERY,
  GET_NOTIFICATIONS_COUNT_QUERY,
  SEEN_ALL_NOTIF_QUERY,
} from './patient.getHistoryNotificationQueries.js';
import { safeGraphQL, bearer, loginAndGetTokens } from '../../../helpers/testUtilsAPI.js';

test.describe('GraphQL: Notification Details Patient', () => {
  test(
    'PHARMA-188 | Should be able to get Notifications',
    {
      tag: ['@api', '@patient', '@positive', '@pharma-188'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAndGetTokens(api, {
        username: process.env.PATIENT_USER_USERNAME,
        password: process.env.PATIENT_USER_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Patient login failed').toBe(true);

      const getNotificationsRes = await safeGraphQL(api, {
        query: GET_NOTIFICATIONS_QUERY,
        headers: bearer(accessToken),
      });

      expect(getNotificationsRes.ok).toBe(true);
    }
  );

  test(
    'PHARMA-189 | Should be able to get Notifications Count',
    {
      tag: ['@api', '@patient', '@positive', '@pharma-189'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAndGetTokens(api, {
        username: process.env.PATIENT_USER_USERNAME,
        password: process.env.PATIENT_USER_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Patient login failed').toBe(true);

      const getNotificationsCountRes = await safeGraphQL(api, {
        query: GET_NOTIFICATIONS_COUNT_QUERY,
        headers: bearer(accessToken),
      });

      expect(getNotificationsCountRes.ok).toBe(true);
    }
  );

  test(
    'PHARMA-190 | Should be able to mark all notifications as SEEN',
    {
      tag: ['@api', '@patient', '@positive', '@pharma-190'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAndGetTokens(api, {
        username: process.env.PATIENT_USER_USERNAME,
        password: process.env.PATIENT_USER_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Patient login failed').toBe(true);

      const seenAllRes = await safeGraphQL(api, {
        query: SEEN_ALL_NOTIF_QUERY,
        headers: bearer(accessToken),
      });

      expect(seenAllRes.ok).toBe(true);
    }
  );
});
