import { test, expect } from '../../../globalConfig.api.js';
import {
  GET_NOTIFICATIONS_QUERY,
  GET_NOTIFICATIONS_COUNT_QUERY,
  SEEN_ALL_NOTIF_QUERY,
  SEEN_NOTIFICATION_QUERY,
  REMOVE_NOTIFICATION_QUERY,
} from './patient.getHistoryNotificationQueries.js';
import {
  safeGraphQL,
  bearer,
  loginAndGetTokens,
  getGQLError,
  NOAUTH_CODES,
  NOAUTH_CLASSIFICATIONS,
  NOAUTH_HTTP_STATUSES,
  NOAUTH_MESSAGE_PATTERN,
} from '../../../helpers/testUtilsAPI.js';

async function getFirstNotificationId(api, accessToken) {
  const getNotificationsRes = await safeGraphQL(api, {
    query: GET_NOTIFICATIONS_QUERY,
    headers: bearer(accessToken),
  });
  expect(getNotificationsRes.ok, getNotificationsRes.error || 'Get Notifications failed').toBe(true);

  const notificationsNode = getNotificationsRes.body?.data?.patient?.notifications;
  expect(Array.isArray(notificationsNode), 'notifications should be an array').toBe(true);
  expect(notificationsNode.length, 'No notifications found for patient').toBeGreaterThan(0);
  return notificationsNode[0].id;
}

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
      const notificationCountNode = getNotificationsCountRes.body?.data?.patient?.notificationCount;
      expect.soft(typeof notificationCountNode).toBe('number');
      expect.soft(notificationCountNode).toBeGreaterThanOrEqual(0);
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

  test(
    'PHARMA-300 | Should be able to mark notification as SEEN',
    {
      tag: ['@api', '@patient', '@positive', '@pharma-300'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAndGetTokens(api, {
        username: process.env.PATIENT_USER_USERNAME,
        password: process.env.PATIENT_USER_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Patient login failed').toBe(true);

      const notificationId = await getFirstNotificationId(api, accessToken);
      const seenNotificationRes = await safeGraphQL(api, {
        query: SEEN_NOTIFICATION_QUERY,
        variables: { notificationId },
        headers: bearer(accessToken),
      });

      expect(seenNotificationRes.ok, seenNotificationRes.error || 'Seen notification failed').toBe(true);
    }
  );

  test(
    'PHARMA-301 | Should NOT be able to mark notification as SEEN with missing auth tokens',
    {
      tag: ['@api', '@patient', '@negative', '@pharma-301'],
    },
    async ({ api, noAuth }) => {
      const seenNotificationNoAuthRes = await safeGraphQL(api, {
        query: SEEN_NOTIFICATION_QUERY,
        variables: { notificationId: 1 },
        headers: noAuth,
      });
      expect(seenNotificationNoAuthRes.ok).toBe(false);

      if (!seenNotificationNoAuthRes.httpOk) {
        expect(NOAUTH_HTTP_STATUSES).toContain(seenNotificationNoAuthRes.httpStatus);
      } else {
        const { message, code, classification } = getGQLError(seenNotificationNoAuthRes);
        expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
        expect.soft(NOAUTH_CODES).toContain(code);
        expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
      }
    }
  );

  test(
    'PHARMA-302 | Should NOT be able to mark notification as SEEN with invalid auth tokens',
    {
      tag: ['@api', '@patient', '@negative', '@pharma-302'],
    },
    async ({ api, invalidAuth }) => {
      const seenNotificationInvalidAuthRes = await safeGraphQL(api, {
        query: SEEN_NOTIFICATION_QUERY,
        variables: { notificationId: 1 },
        headers: invalidAuth,
      });
      expect(seenNotificationInvalidAuthRes.ok).toBe(false);

      if (!seenNotificationInvalidAuthRes.httpOk) {
        expect(NOAUTH_HTTP_STATUSES).toContain(seenNotificationInvalidAuthRes.httpStatus);
      } else {
        const { message, code, classification } = getGQLError(seenNotificationInvalidAuthRes);
        expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
        expect.soft(NOAUTH_CODES).toContain(code);
        expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
      }
    }
  );

  test(
    'PHARMA-303 | Should be able to remove notification',
    {
      tag: ['@api', '@patient', '@positive', '@pharma-303'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAndGetTokens(api, {
        username: process.env.PATIENT_USER_USERNAME,
        password: process.env.PATIENT_USER_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Patient login failed').toBe(true);

      const notificationId = await getFirstNotificationId(api, accessToken);
      const removeNotificationRes = await safeGraphQL(api, {
        query: REMOVE_NOTIFICATION_QUERY,
        variables: { notificationId },
        headers: bearer(accessToken),
      });

      expect(removeNotificationRes.ok, removeNotificationRes.error || 'Remove notification failed').toBe(
        true
      );
    }
  );

  test(
    'PHARMA-304 | Should NOT be able to remove notification with missing auth tokens',
    {
      tag: ['@api', '@patient', '@negative', '@pharma-304'],
    },
    async ({ api, noAuth }) => {
      const removeNotificationNoAuthRes = await safeGraphQL(api, {
        query: REMOVE_NOTIFICATION_QUERY,
        variables: { notificationId: 1 },
        headers: noAuth,
      });
      expect(removeNotificationNoAuthRes.ok).toBe(false);

      if (!removeNotificationNoAuthRes.httpOk) {
        expect(NOAUTH_HTTP_STATUSES).toContain(removeNotificationNoAuthRes.httpStatus);
      } else {
        const { message, code, classification } = getGQLError(removeNotificationNoAuthRes);
        expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
        expect.soft(NOAUTH_CODES).toContain(code);
        expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
      }
    }
  );

  test(
    'PHARMA-305 | Should NOT be able to remove notification with invalid auth tokens',
    {
      tag: ['@api', '@patient', '@negative', '@pharma-305'],
    },
    async ({ api, invalidAuth }) => {
      const removeNotificationInvalidAuthRes = await safeGraphQL(api, {
        query: REMOVE_NOTIFICATION_QUERY,
        variables: { notificationId: 1 },
        headers: invalidAuth,
      });
      expect(removeNotificationInvalidAuthRes.ok).toBe(false);

      if (!removeNotificationInvalidAuthRes.httpOk) {
        expect(NOAUTH_HTTP_STATUSES).toContain(removeNotificationInvalidAuthRes.httpStatus);
      } else {
        const { message, code, classification } = getGQLError(removeNotificationInvalidAuthRes);
        expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
        expect.soft(NOAUTH_CODES).toContain(code);
        expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
      }
    }
  );
});
