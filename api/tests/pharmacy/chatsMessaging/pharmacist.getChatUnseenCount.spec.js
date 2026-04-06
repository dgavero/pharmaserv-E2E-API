import {
  loginAsPharmacistAndGetTokens,
  NOAUTH_MESSAGE_PATTERN,
  NOAUTH_CLASSIFICATIONS,
  NOAUTH_CODES,
  NOAUTH_HTTP_STATUSES,
} from '../../../helpers/auth.js';
import { safeGraphQL, bearer, getGQLError } from '../../../helpers/graphqlUtils.js';
import { test, expect } from '../../../globalConfig.api.js';
import { getPharmacistCredentials } from '../../../helpers/roleCredentials.js';
import { PHARMACIST_GET_CHAT_UNSEEN_COUNT_QUERY } from './pharmacist.chatMessagingQueries.js';

test.describe('GraphQL: Pharmacy Get Chat Unseen Count', () => {
  test(
    'PHARMA-416 | Should get chat unseen count with valid auth tokens',
    {
      tag: ['@api', '@pharmacist', '@positive', '@pharma-416'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsPharmacistAndGetTokens(api, getPharmacistCredentials('reg01'));
      expect(loginRes.ok, loginRes.error || 'Pharmacist login failed').toBe(true);

      const getChatUnseenCountRes = await safeGraphQL(api, {
        query: PHARMACIST_GET_CHAT_UNSEEN_COUNT_QUERY,
        headers: bearer(accessToken),
      });

      expect(
        getChatUnseenCountRes.ok,
        getChatUnseenCountRes.error || 'Get chat unseen count endpoint failed'
      ).toBe(true);

      const unseenCountNode = getChatUnseenCountRes.body?.data?.pharmacy?.chat?.unseenCount;
      expect(unseenCountNode, 'Missing data.pharmacy.chat.unseenCount').toBeDefined();
    }
  );

  test(
    'PHARMA-417 | Should NOT get chat unseen count with missing auth tokens',
    {
      tag: ['@api', '@pharmacist', '@negative', '@pharma-417'],
    },
    async ({ api, noAuth }) => {
      const getChatUnseenCountNoAuthRes = await safeGraphQL(api, {
        query: PHARMACIST_GET_CHAT_UNSEEN_COUNT_QUERY,
        headers: noAuth,
      });

      expect(
        getChatUnseenCountNoAuthRes.ok,
        getChatUnseenCountNoAuthRes.error || 'Expected UNAUTHORIZED when missing token'
      ).toBe(false);

      if (!getChatUnseenCountNoAuthRes.httpOk) {
        expect(NOAUTH_HTTP_STATUSES).toContain(getChatUnseenCountNoAuthRes.httpStatus);
      } else {
        const { message, code, classification } = getGQLError(getChatUnseenCountNoAuthRes);
        expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
        expect.soft(NOAUTH_CODES).toContain(code);
        expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
      }
    }
  );

  test(
    'PHARMA-418 | Should NOT get chat unseen count with invalid auth tokens',
    {
      tag: ['@api', '@pharmacist', '@negative', '@pharma-418'],
    },
    async ({ api, invalidAuth }) => {
      const getChatUnseenCountInvalidAuthRes = await safeGraphQL(api, {
        query: PHARMACIST_GET_CHAT_UNSEEN_COUNT_QUERY,
        headers: invalidAuth,
      });

      expect(getChatUnseenCountInvalidAuthRes.ok).toBe(false);
      expect(getChatUnseenCountInvalidAuthRes.httpOk).toBe(false);
      expect(NOAUTH_HTTP_STATUSES).toContain(getChatUnseenCountInvalidAuthRes.httpStatus);
    }
  );
});
