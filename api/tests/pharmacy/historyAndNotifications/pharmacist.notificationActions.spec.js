import { test, expect } from '../../../globalConfig.api.js';
import {
  PHARMACIST_GET_NOTIFICATIONS_COUNT_QUERY,
  PHARMACIST_GET_NOTIFICATIONS_QUERY,
  PHARMACIST_GET_ORDER_HISTORY_QUERY,
  PHARMACIST_SEEN_ALL_NOTIFICATIONS_QUERY,
  PHARMACIST_SEEN_NOTIFICATION_QUERY,
  PHARMACIST_REMOVE_NOTIFICATION_QUERY,
} from '../historyAndNotifications/pharmacist.notificationQueries.js';
import {
  safeGraphQL,
  bearer,
  pharmacistLoginAndGetTokens,
  getGQLError,
  NOAUTH_CODES,
  NOAUTH_CLASSIFICATIONS,
  NOAUTH_HTTP_STATUSES,
  NOAUTH_MESSAGE_PATTERN,
} from '../../../helpers/testUtilsAPI.js';

async function getFirstNotificationId(api, accessToken) {
  const getNotificationRes = await safeGraphQL(api, {
    query: PHARMACIST_GET_NOTIFICATIONS_QUERY,
    headers: bearer(accessToken),
  });
  expect(getNotificationRes.ok, getNotificationRes.error || 'Get Notifications failed').toBe(true);

  const notificationsNode = getNotificationRes.body?.data?.pharmacy?.branch?.notifications;
  expect(Array.isArray(notificationsNode), 'notifications should be an array').toBe(true);
  expect(notificationsNode.length, 'No notifications found for pharmacist').toBeGreaterThan(0);
  return notificationsNode[0].id;
}

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

  test(
    'PHARMA-309 | Should be able to mark notification as SEEN',
    {
      tag: ['@api', '@pharmacist', '@positive', '@pharma-309'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await pharmacistLoginAndGetTokens(api, {
        username: process.env.PHARMACIST_USERNAME_REG01,
        password: process.env.PHARMACIST_PASSWORD_REG01,
      });
      expect(loginRes.ok, loginRes.error || 'Pharmacist admin login failed').toBe(true);

      const notificationId = await getFirstNotificationId(api, accessToken);
      const seenNotificationRes = await safeGraphQL(api, {
        query: PHARMACIST_SEEN_NOTIFICATION_QUERY,
        variables: { notificationId },
        headers: bearer(accessToken),
      });

      expect(seenNotificationRes.ok, seenNotificationRes.error || 'Seen notification failed').toBe(true);
    }
  );

  test(
    'PHARMA-310 | Should NOT be able to mark notification as SEEN with missing auth tokens',
    {
      tag: ['@api', '@pharmacist', '@negative', '@pharma-310'],
    },
    async ({ api, noAuth }) => {
      const seenNotificationNoAuthRes = await safeGraphQL(api, {
        query: PHARMACIST_SEEN_NOTIFICATION_QUERY,
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
    'PHARMA-311 | Should NOT be able to mark notification as SEEN with invalid auth tokens',
    {
      tag: ['@api', '@pharmacist', '@negative', '@pharma-311'],
    },
    async ({ api, invalidAuth }) => {
      const seenNotificationInvalidAuthRes = await safeGraphQL(api, {
        query: PHARMACIST_SEEN_NOTIFICATION_QUERY,
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
    'PHARMA-312 | Should be able to remove notification',
    {
      tag: ['@api', '@pharmacist', '@positive', '@pharma-312'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await pharmacistLoginAndGetTokens(api, {
        username: process.env.PHARMACIST_USERNAME_REG01,
        password: process.env.PHARMACIST_PASSWORD_REG01,
      });
      expect(loginRes.ok, loginRes.error || 'Pharmacist admin login failed').toBe(true);

      const notificationId = await getFirstNotificationId(api, accessToken);
      const removeNotificationRes = await safeGraphQL(api, {
        query: PHARMACIST_REMOVE_NOTIFICATION_QUERY,
        variables: { notificationId },
        headers: bearer(accessToken),
      });

      expect(removeNotificationRes.ok, removeNotificationRes.error || 'Remove notification failed').toBe(
        true
      );
    }
  );

  test(
    'PHARMA-313 | Should NOT be able to remove notification with missing auth tokens',
    {
      tag: ['@api', '@pharmacist', '@negative', '@pharma-313'],
    },
    async ({ api, noAuth }) => {
      const removeNotificationNoAuthRes = await safeGraphQL(api, {
        query: PHARMACIST_REMOVE_NOTIFICATION_QUERY,
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
    'PHARMA-314 | Should NOT be able to remove notification with invalid auth tokens',
    {
      tag: ['@api', '@pharmacist', '@negative', '@pharma-314'],
    },
    async ({ api, invalidAuth }) => {
      const removeNotificationInvalidAuthRes = await safeGraphQL(api, {
        query: PHARMACIST_REMOVE_NOTIFICATION_QUERY,
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
