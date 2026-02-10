import { test, expect } from '../../../globalConfig.api.js';
import {
  safeGraphQL,
  loginAndGetTokens,
  bearer,
  getGQLError,
  NOAUTH_MESSAGE_PATTERN,
  NOAUTH_CODES,
  NOAUTH_CLASSIFICATIONS,
  NOAUTH_HTTP_STATUSES,
} from '../../../helpers/testUtilsAPI.js';
import { GET_CHAT_THREAD_QUERY } from './patient.chatMessagingQueries.js';
import { CHAT_ORDER_ID, CHAT_THREAD_ID, CHAT_PARTIES_TYPE } from './patient.chatMessagingConstants.js';

test.describe('GraphQL: Patient Get Chat Thread', () => {
  test(
    'PHARMA-264 | Should get chat thread with valid auth tokens',
    {
      tag: ['@api', '@patient', '@positive', '@pharma-264'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAndGetTokens(api, {
        username: process.env.PATIENT_USER_USERNAME,
        password: process.env.PATIENT_USER_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Patient login failed').toBe(true);

      const getChatThreadRes = await safeGraphQL(api, {
        query: GET_CHAT_THREAD_QUERY,
        variables: { orderId: CHAT_ORDER_ID, type: CHAT_PARTIES_TYPE },
        headers: bearer(accessToken),
      });

      expect(getChatThreadRes.ok, getChatThreadRes.error || 'Get chat thread endpoint failed').toBe(
        true
      );

      const node = getChatThreadRes.body?.data?.patient?.chat?.thread;
      expect(node, 'Get chat thread endpoint returned no thread data').toBeTruthy();
      expect.soft(node.id).toBe(String(CHAT_THREAD_ID));
    }
  );

  test(
    'PHARMA-265 | Should NOT get chat thread with missing auth tokens',
    {
      tag: ['@api', '@patient', '@negative', '@pharma-265'],
    },
    async ({ api, noAuth }) => {
      const getChatThreadNoAuthRes = await safeGraphQL(api, {
        query: GET_CHAT_THREAD_QUERY,
        variables: { orderId: CHAT_ORDER_ID, type: CHAT_PARTIES_TYPE },
        headers: noAuth,
      });

      expect(
        getChatThreadNoAuthRes.ok,
        getChatThreadNoAuthRes.error || 'Expected UNAUTHORIZED when missing token'
      ).toBe(false);

      if (!getChatThreadNoAuthRes.httpOk) {
        expect(NOAUTH_HTTP_STATUSES).toContain(getChatThreadNoAuthRes.httpStatus);
      } else {
        const { message, code, classification } = getGQLError(getChatThreadNoAuthRes);
        expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
        expect.soft(NOAUTH_CODES).toContain(code);
        expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
      }
    }
  );

  test(
    'PHARMA-266 | Should NOT get chat thread with invalid auth tokens',
    {
      tag: ['@api', '@patient', '@negative', '@pharma-266'],
    },
    async ({ api, invalidAuth }) => {
      const getChatThreadInvalidAuthRes = await safeGraphQL(api, {
        query: GET_CHAT_THREAD_QUERY,
        variables: { orderId: CHAT_ORDER_ID, type: CHAT_PARTIES_TYPE },
        headers: invalidAuth,
      });

      expect(getChatThreadInvalidAuthRes.ok).toBe(false);
      expect(getChatThreadInvalidAuthRes.httpOk).toBe(false);
      expect(NOAUTH_HTTP_STATUSES).toContain(getChatThreadInvalidAuthRes.httpStatus);
    }
  );
});