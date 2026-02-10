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
import { SEND_CHAT_PHOTO_BY_ORDER_ID_MUTATION } from './patient.chatMessagingQueries.js';
import { CHAT_ORDER_ID, CHAT_SENDER_PATIENT, CHAT_PHOTO_NAME } from './patient.chatMessagingConstants.js';

function buildChatPhotoInput() {
  return {
    sender: CHAT_SENDER_PATIENT,
    photo: CHAT_PHOTO_NAME,
  };
}

test.describe('GraphQL: Patient Send Chat Photo By Order Id', () => {
  test(
    'PHARMA-279 | Should send chat photo by order id with valid auth tokens',
    {
      tag: ['@api', '@patient', '@positive', '@pharma-279'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAndGetTokens(api, {
        username: process.env.PATIENT_USER_USERNAME,
        password: process.env.PATIENT_USER_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Patient login failed').toBe(true);

      const chatInput = buildChatPhotoInput();

      const sendChatPhotoRes = await safeGraphQL(api, {
        query: SEND_CHAT_PHOTO_BY_ORDER_ID_MUTATION,
        variables: { orderId: CHAT_ORDER_ID, chat: chatInput },
        headers: bearer(accessToken),
      });

      expect(
        sendChatPhotoRes.ok,
        sendChatPhotoRes.error || 'Send chat photo by order id endpoint failed'
      ).toBe(true);

      const node = sendChatPhotoRes.body?.data?.patient?.chat?.sendOrderMessage;
      expect(node, 'Send chat photo by order id endpoint returned no data').toBeTruthy();
      expect(node.photo).toBe(CHAT_PHOTO_NAME);
    }
  );

  test(
    'PHARMA-280 | Should NOT send chat photo by order id with missing auth tokens',
    {
      tag: ['@api', '@patient', '@negative', '@pharma-280'],
    },
    async ({ api, noAuth }) => {
      const chatInput = buildChatPhotoInput();

      const sendChatPhotoNoAuthRes = await safeGraphQL(api, {
        query: SEND_CHAT_PHOTO_BY_ORDER_ID_MUTATION,
        variables: { orderId: CHAT_ORDER_ID, chat: chatInput },
        headers: noAuth,
      });

      expect(
        sendChatPhotoNoAuthRes.ok,
        sendChatPhotoNoAuthRes.error || 'Expected UNAUTHORIZED when missing token'
      ).toBe(false);

      if (!sendChatPhotoNoAuthRes.httpOk) {
        expect(NOAUTH_HTTP_STATUSES).toContain(sendChatPhotoNoAuthRes.httpStatus);
      } else {
        const { message, code, classification } = getGQLError(sendChatPhotoNoAuthRes);
        expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
        expect.soft(NOAUTH_CODES).toContain(code);
        expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
      }
    }
  );

  test(
    'PHARMA-281 | Should NOT send chat photo by order id with invalid auth tokens',
    {
      tag: ['@api', '@patient', '@negative', '@pharma-281'],
    },
    async ({ api, invalidAuth }) => {
      const chatInput = buildChatPhotoInput();

      const sendChatPhotoInvalidAuthRes = await safeGraphQL(api, {
        query: SEND_CHAT_PHOTO_BY_ORDER_ID_MUTATION,
        variables: { orderId: CHAT_ORDER_ID, chat: chatInput },
        headers: invalidAuth,
      });

      expect(sendChatPhotoInvalidAuthRes.ok).toBe(false);
      expect(sendChatPhotoInvalidAuthRes.httpOk).toBe(false);
      expect(NOAUTH_HTTP_STATUSES).toContain(sendChatPhotoInvalidAuthRes.httpStatus);
    }
  );
});