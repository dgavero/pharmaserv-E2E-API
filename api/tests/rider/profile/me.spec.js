import { loginAsRiderAndGetTokens, NOAUTH_MESSAGE_PATTERN, NOAUTH_CLASSIFICATIONS, NOAUTH_CODES, NOAUTH_HTTP_STATUSES } from '../../../helpers/auth.js';
import { safeGraphQL, bearer, getGQLError } from '../../../helpers/graphqlUtils.js';
import { test, expect } from '../../../globalConfig.api.js';
import { getRiderAccount } from '../../../helpers/roleCredentials.js';
import { ME_RIDER_QUERY } from './rider.profileQueries.js';

const defaultRiderAccount = getRiderAccount('default');

test.describe('GraphQL: Get Rider Profile', () => {
  test(
    'PHARMA-118 | Should be able to get rider profile with valid auth',
    {
      tag: ['@api', '@rider', '@positive', '@pharma-118', '@smoke'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsRiderAndGetTokens(api, defaultRiderAccount);
      expect(loginRes.ok, loginRes.error || 'Rider login failed').toBe(true);

      const meRiderRes = await safeGraphQL(api, {
        query: ME_RIDER_QUERY,
        headers: bearer(accessToken),
      });

      // Main Assertion
      expect(meRiderRes.ok, meRiderRes.error || 'Get Rider Profile request failed').toBe(true);

      const riderNode = meRiderRes.body.data.rider.me;
      expect(riderNode).toBeTruthy();
      expect.soft(riderNode.id).toBe(defaultRiderAccount.riderId);
      expect.soft(riderNode.username).toBe(defaultRiderAccount.username);
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

  test(
    'PHARMA-567 | Rider me should satisfy response contract shape',
    {
      tag: ['@api', '@rider', '@positive', '@pharma-567'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsRiderAndGetTokens(api, defaultRiderAccount);
      expect(loginRes.ok, loginRes.error || 'Rider login failed').toBe(true);

      const meRiderRes = await safeGraphQL(api, {
        query: ME_RIDER_QUERY,
        headers: bearer(accessToken),
      });

      expect(meRiderRes.httpStatus).toBe(200);
      expect(meRiderRes.httpOk).toBe(true);
      expect(meRiderRes.ok, meRiderRes.error || 'Get Rider Profile request failed').toBe(true);

      const riderNode = meRiderRes.body?.data?.rider?.me;
      expect(riderNode, 'Missing data.rider.me').toBeTruthy();
      expect.soft(typeof riderNode?.id).toBe('string');
      expect.soft(typeof riderNode?.username).toBe('string');
      expect.soft(typeof riderNode?.status).toBe('string');
    }
  );
});
