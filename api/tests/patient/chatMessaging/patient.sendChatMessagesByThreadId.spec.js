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
import { randomNum } from '../../../../helpers/globalTestUtils.js';
import { SEND_CHAT_MESSAGE_BY_THREAD_ID_MUTATION } from './patient.chatMessagingQueries.js';
import { CHAT_THREAD_ID, CHAT_SENDER_PATIENT } from './patient.chatMessagingConstants.js';

function buildChatMessageInput() {
  return {
    sender: CHAT_SENDER_PATIENT,
    message: `This is a sample API message ${randomNum(9)}`,
  };
}

test.describe('GraphQL: Patient Send Chat Message By Thread Id', () => {
  test(
    'PHARMA-276 | Should send chat message by thread id with valid auth tokens',
    {
      tag: ['@api', '@patient', '@positive', '@pharma-276'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAndGetTokens(api, {
        username: process.env.PATIENT_USER_USERNAME,
        password: process.env.PATIENT_USER_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Patient login failed').toBe(true);

      const chatInput = buildChatMessageInput();

      const sendChatMessageRes = await safeGraphQL(api, {
        query: SEND_CHAT_MESSAGE_BY_THREAD_ID_MUTATION,
        variables: { threadId: CHAT_THREAD_ID, chat: chatInput },
        headers: bearer(accessToken),
      });

      expect(
        sendChatMessageRes.ok,
        sendChatMessageRes.error || 'Send chat message by thread id endpoint failed'
      ).toBe(true);

      const node = sendChatMessageRes.body?.data?.patient?.chat?.sendThreadMessage;
      expect(node, 'Send chat message by thread id endpoint returned no data').toBeTruthy();
      expect(node.message).toBe(chatInput.message);
    }
  );

  test(
    'PHARMA-277 | Should NOT send chat message by thread id with missing auth tokens',
    {
      tag: ['@api', '@patient', '@negative', '@pharma-277'],
    },
    async ({ api, noAuth }) => {
      const chatInput = buildChatMessageInput();

      const sendChatMessageNoAuthRes = await safeGraphQL(api, {
        query: SEND_CHAT_MESSAGE_BY_THREAD_ID_MUTATION,
        variables: { threadId: CHAT_THREAD_ID, chat: chatInput },
        headers: noAuth,
      });

      expect(
        sendChatMessageNoAuthRes.ok,
        sendChatMessageNoAuthRes.error || 'Expected UNAUTHORIZED when missing token'
      ).toBe(false);

      if (!sendChatMessageNoAuthRes.httpOk) {
        expect(NOAUTH_HTTP_STATUSES).toContain(sendChatMessageNoAuthRes.httpStatus);
      } else {
        const { message, code, classification } = getGQLError(sendChatMessageNoAuthRes);
        expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
        expect.soft(NOAUTH_CODES).toContain(code);
        expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
      }
    }
  );

  test(
    'PHARMA-278 | Should NOT send chat message by thread id with invalid auth tokens',
    {
      tag: ['@api', '@patient', '@negative', '@pharma-278'],
    },
    async ({ api, invalidAuth }) => {
      const chatInput = buildChatMessageInput();

      const sendChatMessageInvalidAuthRes = await safeGraphQL(api, {
        query: SEND_CHAT_MESSAGE_BY_THREAD_ID_MUTATION,
        variables: { threadId: CHAT_THREAD_ID, chat: chatInput },
        headers: invalidAuth,
      });

      expect(sendChatMessageInvalidAuthRes.ok).toBe(false);
      expect(sendChatMessageInvalidAuthRes.httpOk).toBe(false);
      expect(NOAUTH_HTTP_STATUSES).toContain(sendChatMessageInvalidAuthRes.httpStatus);
    }
  );
});