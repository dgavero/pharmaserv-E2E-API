import { test, expect } from '../../../globalConfig.api.js';
import {
  GET_NOTIFICATIONS_QUERY,
  GET_NOTIFICATIONS_COUNT_QUERY,
  SEEN_NOTIFICATION_QUERY,
  SEEN_ALL_NOTIFICATIONS_QUERY,
  REMOVE_NOTIFICATION_QUERY,
} from './rider.notificationQueries.js';
import {
  safeGraphQL,
  bearer,
  getGQLError,
  NOAUTH_MESSAGE_PATTERN,
  NOAUTH_CLASSIFICATIONS,
  NOAUTH_CODES,
  riderLoginAndGetTokens,
  NOAUTH_HTTP_STATUSES,
} from '../../../helpers/testUtilsAPI.js';

async function getFirstNotificationId(api, accessToken) {
  const getNotificationsRes = await safeGraphQL(api, {
    query: GET_NOTIFICATIONS_QUERY,
    headers: bearer(accessToken),
  });
  expect(getNotificationsRes.ok, getNotificationsRes.error || 'Get Notifications request failed').toBe(true);

  const notificationsNode = getNotificationsRes.body?.data?.rider?.notifications;
  expect(Array.isArray(notificationsNode), 'notifications should be an array').toBe(true);
  if (notificationsNode.length < 1) return null;
  return notificationsNode[0].id;
}

test.describe('GraphQL: Rider Notification Actions', () => {
  test(
    'PHARMA-135 | Should be able to get notifications as a rider',
    {
      tag: ['@api', '@rider', '@positive', '@pharma-135'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await riderLoginAndGetTokens(api, {
        username: process.env.RIDER_USERNAME,
        password: process.env.RIDER_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Rider login failed').toBe(true);

      const getNotificationsRes = await safeGraphQL(api, {
        query: GET_NOTIFICATIONS_QUERY,
        headers: bearer(accessToken),
      });

      // Main Assertion
      expect(
        getNotificationsRes.ok,
        getNotificationsRes.error || 'Get Notifications request failed'
      ).toBe(true);

      const node = getNotificationsRes.body.data.rider.notifications;
      expect(Array.isArray(node)).toBe(true);
    }
  );

  test(
    'PHARMA-136 | Should NOT be able to get notifications without authentication',
    {
      tag: ['@api', '@rider', '@negative', '@pharma-136'],
    },
    async ({ api, noAuth }) => {
      const getNotificationsResNoAuth = await safeGraphQL(api, {
        query: GET_NOTIFICATIONS_QUERY,
        headers: noAuth,
      });

      // Main Assertion
      expect(
        getNotificationsResNoAuth.ok,
        getNotificationsResNoAuth.error || 'Get Notifications is expected to fail'
      ).toBe(false);

      const { message, classification, code } = getGQLError(getNotificationsResNoAuth);
      expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
      expect(NOAUTH_CLASSIFICATIONS).toContain(classification);
      expect(NOAUTH_CODES).toContain(code);
    }
  );

  test(
    'PHARMA-137 | Should NOT be able to get notifications with invalid authentication',
    {
      tag: ['@api', '@rider', '@negative', '@pharma-137'],
    },
    async ({ api, invalidAuth }) => {
      const getNotificationsResInvalidAuth = await safeGraphQL(api, {
        query: GET_NOTIFICATIONS_QUERY,
        headers: invalidAuth,
      });

      // Main Assertion
      expect(
        getNotificationsResInvalidAuth.ok,
        getNotificationsResInvalidAuth.error || 'Get Notifications is expected to fail'
      ).toBe(false);

      // Transport-level 401 (no GraphQL errors[])
      expect(getNotificationsResInvalidAuth.ok).toBe(false);
      expect(getNotificationsResInvalidAuth.httpOk).toBe(false);
      expect(NOAUTH_HTTP_STATUSES).toContain(getNotificationsResInvalidAuth.httpStatus);
    }
  );

  test(
    'PHARMA-321 | Should be able to get notifications count',
    {
      tag: ['@api', '@rider', '@positive', '@pharma-321'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await riderLoginAndGetTokens(api, {
        username: process.env.RIDER_USERNAME,
        password: process.env.RIDER_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Rider login failed').toBe(true);

      const getNotificationsCountRes = await safeGraphQL(api, {
        query: GET_NOTIFICATIONS_COUNT_QUERY,
        headers: bearer(accessToken),
      });
      expect(
        getNotificationsCountRes.ok,
        getNotificationsCountRes.error || 'Get Notifications Count request failed'
      ).toBe(true);

      const notificationCountNode = getNotificationsCountRes.body?.data?.rider?.notificationCount;
      expect.soft(typeof notificationCountNode).toBe('number');
      expect.soft(notificationCountNode).toBeGreaterThanOrEqual(0);
    }
  );

  test(
    'PHARMA-322 | Should NOT be able to get notifications count with missing auth tokens',
    {
      tag: ['@api', '@rider', '@negative', '@pharma-322'],
    },
    async ({ api, noAuth }) => {
      const getNotificationsCountNoAuthRes = await safeGraphQL(api, {
        query: GET_NOTIFICATIONS_COUNT_QUERY,
        headers: noAuth,
      });
      expect(getNotificationsCountNoAuthRes.ok).toBe(false);

      if (!getNotificationsCountNoAuthRes.httpOk) {
        expect(NOAUTH_HTTP_STATUSES).toContain(getNotificationsCountNoAuthRes.httpStatus);
      } else {
        const { message, classification, code } = getGQLError(getNotificationsCountNoAuthRes);
        expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
        expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
        expect.soft(NOAUTH_CODES).toContain(code);
      }
    }
  );

  test(
    'PHARMA-323 | Should NOT be able to get notifications count with invalid auth tokens',
    {
      tag: ['@api', '@rider', '@negative', '@pharma-323'],
    },
    async ({ api, invalidAuth }) => {
      const getNotificationsCountInvalidAuthRes = await safeGraphQL(api, {
        query: GET_NOTIFICATIONS_COUNT_QUERY,
        headers: invalidAuth,
      });
      expect(getNotificationsCountInvalidAuthRes.ok).toBe(false);

      if (!getNotificationsCountInvalidAuthRes.httpOk) {
        expect(NOAUTH_HTTP_STATUSES).toContain(getNotificationsCountInvalidAuthRes.httpStatus);
      } else {
        const { message, classification, code } = getGQLError(getNotificationsCountInvalidAuthRes);
        expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
        expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
        expect.soft(NOAUTH_CODES).toContain(code);
      }
    }
  );

  test(
    'PHARMA-324 | Should be able to mark notification as SEEN',
    {
      tag: ['@api', '@rider', '@positive', '@pharma-324'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await riderLoginAndGetTokens(api, {
        username: process.env.RIDER_USERNAME,
        password: process.env.RIDER_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Rider login failed').toBe(true);

      const notificationId = await getFirstNotificationId(api, accessToken);
      test.skip(!notificationId, 'No notifications available for rider to mark as seen');
      const seenNotificationRes = await safeGraphQL(api, {
        query: SEEN_NOTIFICATION_QUERY,
        variables: { notificationId },
        headers: bearer(accessToken),
      });
      expect(seenNotificationRes.ok, seenNotificationRes.error || 'Seen Notification request failed').toBe(
        true
      );
    }
  );

  test(
    'PHARMA-325 | Should NOT be able to mark notification as SEEN with missing auth tokens',
    {
      tag: ['@api', '@rider', '@negative', '@pharma-325'],
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
        const { message, classification, code } = getGQLError(seenNotificationNoAuthRes);
        expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
        expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
        expect.soft(NOAUTH_CODES).toContain(code);
      }
    }
  );

  test(
    'PHARMA-326 | Should NOT be able to mark notification as SEEN with invalid auth tokens',
    {
      tag: ['@api', '@rider', '@negative', '@pharma-326'],
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
        const { message, classification, code } = getGQLError(seenNotificationInvalidAuthRes);
        expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
        expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
        expect.soft(NOAUTH_CODES).toContain(code);
      }
    }
  );

  test(
    'PHARMA-327 | Should be able to mark all notifications as SEEN',
    {
      tag: ['@api', '@rider', '@positive', '@pharma-327'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await riderLoginAndGetTokens(api, {
        username: process.env.RIDER_USERNAME,
        password: process.env.RIDER_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Rider login failed').toBe(true);

      const seenAllNotificationsRes = await safeGraphQL(api, {
        query: SEEN_ALL_NOTIFICATIONS_QUERY,
        headers: bearer(accessToken),
      });
      expect(
        seenAllNotificationsRes.ok,
        seenAllNotificationsRes.error || 'Seen All Notifications request failed'
      ).toBe(true);
    }
  );

  test(
    'PHARMA-328 | Should NOT be able to mark all notifications as SEEN with missing auth tokens',
    {
      tag: ['@api', '@rider', '@negative', '@pharma-328'],
    },
    async ({ api, noAuth }) => {
      const seenAllNotificationsNoAuthRes = await safeGraphQL(api, {
        query: SEEN_ALL_NOTIFICATIONS_QUERY,
        headers: noAuth,
      });
      expect(seenAllNotificationsNoAuthRes.ok).toBe(false);

      if (!seenAllNotificationsNoAuthRes.httpOk) {
        expect(NOAUTH_HTTP_STATUSES).toContain(seenAllNotificationsNoAuthRes.httpStatus);
      } else {
        const { message, classification, code } = getGQLError(seenAllNotificationsNoAuthRes);
        expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
        expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
        expect.soft(NOAUTH_CODES).toContain(code);
      }
    }
  );

  test(
    'PHARMA-329 | Should NOT be able to mark all notifications as SEEN with invalid auth tokens',
    {
      tag: ['@api', '@rider', '@negative', '@pharma-329'],
    },
    async ({ api, invalidAuth }) => {
      const seenAllNotificationsInvalidAuthRes = await safeGraphQL(api, {
        query: SEEN_ALL_NOTIFICATIONS_QUERY,
        headers: invalidAuth,
      });
      expect(seenAllNotificationsInvalidAuthRes.ok).toBe(false);

      if (!seenAllNotificationsInvalidAuthRes.httpOk) {
        expect(NOAUTH_HTTP_STATUSES).toContain(seenAllNotificationsInvalidAuthRes.httpStatus);
      } else {
        const { message, classification, code } = getGQLError(seenAllNotificationsInvalidAuthRes);
        expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
        expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
        expect.soft(NOAUTH_CODES).toContain(code);
      }
    }
  );

  test(
    'PHARMA-330 | Should be able to remove notification',
    {
      tag: ['@api', '@rider', '@positive', '@pharma-330'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await riderLoginAndGetTokens(api, {
        username: process.env.RIDER_USERNAME,
        password: process.env.RIDER_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Rider login failed').toBe(true);

      const notificationId = await getFirstNotificationId(api, accessToken);
      test.skip(!notificationId, 'No notifications available for rider to remove');
      const removeNotificationRes = await safeGraphQL(api, {
        query: REMOVE_NOTIFICATION_QUERY,
        variables: { notificationId },
        headers: bearer(accessToken),
      });
      expect(removeNotificationRes.ok, removeNotificationRes.error || 'Remove Notification request failed').toBe(
        true
      );
    }
  );

  test(
    'PHARMA-331 | Should NOT be able to remove notification with missing auth tokens',
    {
      tag: ['@api', '@rider', '@negative', '@pharma-331'],
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
        const { message, classification, code } = getGQLError(removeNotificationNoAuthRes);
        expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
        expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
        expect.soft(NOAUTH_CODES).toContain(code);
      }
    }
  );

  test(
    'PHARMA-332 | Should NOT be able to remove notification with invalid auth tokens',
    {
      tag: ['@api', '@rider', '@negative', '@pharma-332'],
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
        const { message, classification, code } = getGQLError(removeNotificationInvalidAuthRes);
        expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
        expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
        expect.soft(NOAUTH_CODES).toContain(code);
      }
    }
  );
});
