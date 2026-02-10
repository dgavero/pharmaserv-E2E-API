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
import { randomAlphanumeric } from '../../../../helpers/globalTestUtils.js';
import { SEND_CHAT_MESSAGE_BY_ORDER_ID_MUTATION } from './patient.chatMessagingQueries.js';
import { CHAT_ORDER_ID, CHAT_SENDER_PATIENT } from './patient.chatMessagingConstants.js';

function buildChatMessageInput() {
  return {
    sender: CHAT_SENDER_PATIENT,
    message: `This is a sample API message ${randomAlphanumeric(9)}`,
  };
}

test.describe('GraphQL: Patient Send Chat Message By Order Id', () => {
  test(
    'PHARMA-273 | Should send chat message by order id with valid auth tokens',
    {
      tag: ['@api', '@patient', '@positive', '@pharma-273'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAndGetTokens(api, {
        username: process.env.PATIENT_USER_USERNAME,
        password: process.env.PATIENT_USER_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Patient login failed').toBe(true);

      const chatInput = buildChatMessageInput();

      const sendChatMessageRes = await safeGraphQL(api, {
        query: SEND_CHAT_MESSAGE_BY_ORDER_ID_MUTATION,
        variables: { orderId: CHAT_ORDER_ID, chat: chatInput },
        headers: bearer(accessToken),
      });

      expect(
        sendChatMessageRes.ok,
        sendChatMessageRes.error || 'Send chat message by order id endpoint failed'
      ).toBe(true);

      const node = sendChatMessageRes.body?.data?.patient?.chat?.sendOrderMessage;
      expect(node, 'Send chat message by order id endpoint returned no data').toBeTruthy();
      expect(node.message).toBe(chatInput.message);
    }
  );

  test(
    'PHARMA-274 | Should NOT send chat message by order id with missing auth tokens',
    {
      tag: ['@api', '@patient', '@negative', '@pharma-274'],
    },
    async ({ api, noAuth }) => {
      const chatInput = buildChatMessageInput();

      const sendChatMessageNoAuthRes = await safeGraphQL(api, {
        query: SEND_CHAT_MESSAGE_BY_ORDER_ID_MUTATION,
        variables: { orderId: CHAT_ORDER_ID, chat: chatInput },
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
    'PHARMA-275 | Should NOT send chat message by order id with invalid auth tokens',
    {
      tag: ['@api', '@patient', '@negative', '@pharma-275'],
    },
    async ({ api, invalidAuth }) => {
      const chatInput = buildChatMessageInput();

      const sendChatMessageInvalidAuthRes = await safeGraphQL(api, {
        query: SEND_CHAT_MESSAGE_BY_ORDER_ID_MUTATION,
        variables: { orderId: CHAT_ORDER_ID, chat: chatInput },
        headers: invalidAuth,
      });

      expect(sendChatMessageInvalidAuthRes.ok).toBe(false);
      expect(sendChatMessageInvalidAuthRes.httpOk).toBe(false);
      expect(NOAUTH_HTTP_STATUSES).toContain(sendChatMessageInvalidAuthRes.httpStatus);
    }
  );
});