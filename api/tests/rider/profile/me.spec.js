import { test, expect } from '../../../globalConfig.api.js';
import { ME_RIDER_QUERY } from '../profile/rider.profileQueries.js';
import {
  safeGraphQL,
  bearer,
  riderLoginAndGetTokens,
  NOAUTH_MESSAGE_PATTERN,
  NOAUTH_CLASSIFICATIONS,
  NOAUTH_CODES,
  getGQLError,
  NOAUTH_HTTP_STATUSES,
} from '../../../helpers/testUtilsAPI.js';

test.describe('GraphQL: Get Rider Profile', () => {
  test(
    'PHARMA-118 | Should be able to get rider profile with valid auth',
    {
      tag: ['@api', '@rider', '@positive', '@pharma-118'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await riderLoginAndGetTokens(api, {
        username: process.env.RIDER_USERNAME,
        password: process.env.RIDER_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Rider login failed').toBe(true);

      const meRiderRes = await safeGraphQL(api, {
        query: ME_RIDER_QUERY,
        headers: bearer(accessToken),
      });

      // Main Assertion
      expect(meRiderRes.ok, meRiderRes.error || 'Get Rider Profile request failed').toBe(true);

      const riderNode = meRiderRes.body.data.rider.me;
      expect(riderNode).toBeTruthy();
      expect.soft(riderNode.id).toBe(process.env.RIDER_USERID);
      expect.soft(riderNode.username).toBe(process.env.RIDER_USERNAME);
    }
  );

  test(
    'PHARMA-119 | Should NOT be able to get rider details with No Auth',
    {
      tag: ['@api', '@rider', '@negative', '@pharma-119'],
    },
    async ({ api, noAuth }) => {
      const meRiderResNoAuth = await safeGraphQL(api, {
        query: ME_RIDER_QUERY,
        headers: noAuth,
      });

      // Main Assertion
      expect(
        meRiderResNoAuth.ok,
        meRiderResNoAuth.error || 'Get Rider Profile request is expected to fail'
      ).toBe(false);

      const { message, classification, code } = getGQLError(meRiderResNoAuth);
      expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
      expect(NOAUTH_CODES).toContain(code);
      expect(NOAUTH_CLASSIFICATIONS).toContain(classification);
    }
  );

  test(
    'PHARMA-120 | Should NOT be able to get rider details with Invalid Auth',
    {
      tag: ['@api', '@rider', '@negative', '@pharma-120'],
    },
    async ({ api, invalidAuth }) => {
      const meRiderResInvalidAuth = await safeGraphQL(api, {
        query: ME_RIDER_QUERY,
        headers: invalidAuth,
      });

      // Main Assertion
      expect(
        meRiderResInvalidAuth.ok,
        meRiderResInvalidAuth.error || 'Get Rider Profile request is expected to fail'
      ).toBe(false);

      // Transport-level 401 (no GraphQL errors[])
      expect(meRiderResInvalidAuth.ok).toBe(false);
      expect(meRiderResInvalidAuth.httpOk).toBe(false);
      expect(NOAUTH_HTTP_STATUSES).toContain(meRiderResInvalidAuth.httpStatus);
    }
  );
});
