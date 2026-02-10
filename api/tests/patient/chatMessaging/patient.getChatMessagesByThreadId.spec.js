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
import { GET_CHAT_MESSAGES_BY_THREAD_ID_QUERY } from './patient.chatMessagingQueries.js';
import { CHAT_THREAD_ID } from './patient.chatMessagingConstants.js';

test.describe('GraphQL: Patient Get Chat Messages By Thread Id', () => {
  test(
    'PHARMA-270 | Should get chat messages by thread id with valid auth tokens',
    {
      tag: ['@api', '@patient', '@positive', '@pharma-270'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAndGetTokens(api, {
        username: process.env.PATIENT_USER_USERNAME,
        password: process.env.PATIENT_USER_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Patient login failed').toBe(true);

      const getChatMessagesRes = await safeGraphQL(api, {
        query: GET_CHAT_MESSAGES_BY_THREAD_ID_QUERY,
        variables: { threadId: CHAT_THREAD_ID },
        headers: bearer(accessToken),
      });

      expect(
        getChatMessagesRes.ok,
        getChatMessagesRes.error || 'Get chat messages by thread id endpoint failed'
      ).toBe(true);
    }
  );

  test(
    'PHARMA-271 | Should NOT get chat messages by thread id with missing auth tokens',
    {
      tag: ['@api', '@patient', '@negative', '@pharma-271'],
    },
    async ({ api, noAuth }) => {
      const getChatMessagesNoAuthRes = await safeGraphQL(api, {
        query: GET_CHAT_MESSAGES_BY_THREAD_ID_QUERY,
        variables: { threadId: CHAT_THREAD_ID },
        headers: noAuth,
      });

      expect(
        getChatMessagesNoAuthRes.ok,
        getChatMessagesNoAuthRes.error || 'Expected UNAUTHORIZED when missing token'
      ).toBe(false);

      if (!getChatMessagesNoAuthRes.httpOk) {
        expect(NOAUTH_HTTP_STATUSES).toContain(getChatMessagesNoAuthRes.httpStatus);
      } else {
        const { message, code, classification } = getGQLError(getChatMessagesNoAuthRes);
        expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
        expect.soft(NOAUTH_CODES).toContain(code);
        expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
      }
    }
  );

  test(
    'PHARMA-272 | Should NOT get chat messages by thread id with invalid auth tokens',
    {
      tag: ['@api', '@patient', '@negative', '@pharma-272'],
    },
    async ({ api, invalidAuth }) => {
      const getChatMessagesInvalidAuthRes = await safeGraphQL(api, {
        query: GET_CHAT_MESSAGES_BY_THREAD_ID_QUERY,
        variables: { threadId: CHAT_THREAD_ID },
        headers: invalidAuth,
      });

      expect(getChatMessagesInvalidAuthRes.ok).toBe(false);
      expect(getChatMessagesInvalidAuthRes.httpOk).toBe(false);
      expect(NOAUTH_HTTP_STATUSES).toContain(getChatMessagesInvalidAuthRes.httpStatus);
    }
  );
});