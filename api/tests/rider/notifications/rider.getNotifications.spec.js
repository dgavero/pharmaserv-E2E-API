import { test, expect } from '../../../globalConfig.api.js';
import { GET_NOTIFICATIONS_QUERY } from './rider.notificationQueries.js';
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

test.describe('GraphQL: Rider Get Notifications', () => {
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
});
