import { test, expect } from '../../../globalConfig.api.js';
import {
  PHARMACIST_GET_CHAT_REGULAR_BRANCH_THREAD_QUERY,
  PHARMACIST_GET_CHAT_PSE_BRANCH_THREAD_QUERY,
  PHARMACIST_GET_CHAT_THREAD_BY_ID_QUERY,
  PHARMACIST_GET_CHAT_MESSAGES_BY_ORDER_ID_QUERY,
  PHARMACIST_GET_CHAT_MESSAGES_BY_THREAD_ID_QUERY,
  PHARMACIST_SEND_CHAT_MESSAGES_BY_ORDER_ID_QUERY,
  PHARMACIST_SEND_CHAT_MESSAGES_BY_THREAD_ID_QUERY,
  PHARMACIST_SET_THREAD_SEEN_QUERY,
} from '../chatsMessaging/pharmacist.chatMessagingQueries.js';
import { safeGraphQL, bearer, pharmacistLoginAndGetTokens } from '../../../helpers/testUtilsAPI.js';
import { randomAlphanumeric, randomNum } from '../../../../helpers/globalTestUtils.js';

function resolveTestData() {
  const testEnv = String(process.env.TEST_ENV || 'DEV').toUpperCase();

  const testData = {
    DEV: {
      orderId: 88,
      threadId: 80,
    },
    QA: {
      orderId: 534,
      threadId: 426,
    },
    PROD: {
      orderId: 216,
      threadId: 85,
    },
  };

  if (!testData[testEnv]) {
    throw new Error(`Unsupported TEST_ENV: ${testEnv}`);
  }

  return testData[testEnv];
}

test.describe('GraphQL: Regular Pharmacist Messaging', () => {
  test(
    'PHARMA-196 | Should be able to GET Chat details as regular pharmacist for onboarded orders',
    {
      tag: ['@api', '@pharmacist', '@positive', '@pharma-196'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await pharmacistLoginAndGetTokens(api, {
        username: process.env.PHARMACIST_USERNAME_REG01,
        password: process.env.PHARMACIST_PASSWORD_REG01,
      });
      expect(loginRes.ok, loginRes.error || 'Pharmacist login failed').toBe(true);

      const getChatRegBranchThreadRes = await safeGraphQL(api, {
        query: PHARMACIST_GET_CHAT_REGULAR_BRANCH_THREAD_QUERY,
        headers: bearer(accessToken),
      });

      expect(getChatRegBranchThreadRes.ok).toBe(true);
    }
  );

  test(
    'PHARMA-197 | Should NOT be able to GET Chat details as regular pharmacist for NON-onboarded orders',
    {
      tag: ['@api', '@pharmacist', '@negative', '@pharma-197'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await pharmacistLoginAndGetTokens(api, {
        username: process.env.PHARMACIST_USERNAME_REG01,
        password: process.env.PHARMACIST_PASSWORD_REG01,
      });
      expect(loginRes.ok, loginRes.error || 'Pharmacist login failed').toBe(true);

      const getChatPSEBranchThreadRes = await safeGraphQL(api, {
        query: PHARMACIST_GET_CHAT_PSE_BRANCH_THREAD_QUERY,
        headers: bearer(accessToken),
      });

      expect(getChatPSEBranchThreadRes.ok).toBe(false);
    }
  );

  test(
    'PHARMA-198 | Should be able to Get Chat Thread Id as Regular Pharmacist',
    {
      tag: ['@api', '@pharmacist', '@positive', '@pharma-198'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await pharmacistLoginAndGetTokens(api, {
        username: process.env.PHARMACIST_USERNAME_REG01,
        password: process.env.PHARMACIST_PASSWORD_REG01,
      });
      expect(loginRes.ok, loginRes.error || 'Pharmacist login failed').toBe(true);

      const testData = resolveTestData();

      const getChatThreadIdRes = await safeGraphQL(api, {
        query: PHARMACIST_GET_CHAT_THREAD_BY_ID_QUERY,
        variables: {
          orderId: testData.orderId,
          type: `PATIENT_PHARMACY`,
        },
        headers: bearer(accessToken),
      });

      expect(getChatThreadIdRes.ok).toBe(true);
    }
  );

  test(
    'PHARMA-199 | Should be able to Get Chat Messages by Order Id as Regular Pharmacist',
    {
      tag: ['@api', '@pharmacist', '@positive', '@pharma-199'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await pharmacistLoginAndGetTokens(api, {
        username: process.env.PHARMACIST_USERNAME_REG01,
        password: process.env.PHARMACIST_PASSWORD_REG01,
      });
      expect(loginRes.ok, loginRes.error || 'Pharmacist login failed').toBe(true);

      const testData = resolveTestData();

      const getChatMessageByOrderIdRes = await safeGraphQL(api, {
        query: PHARMACIST_GET_CHAT_MESSAGES_BY_ORDER_ID_QUERY,
        variables: {
          orderId: testData.orderId,
        },
        headers: bearer(accessToken),
      });
      expect(getChatMessageByOrderIdRes.ok).toBe(true);
    }
  );

  test(
    'PHARMA-200 | Should be able to Get Chat Messages by Thread Id as Regular Pharmacist',
    {
      tag: ['@api', '@pharmacist', '@positive', '@pharma-200'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await pharmacistLoginAndGetTokens(api, {
        username: process.env.PHARMACIST_USERNAME_REG01,
        password: process.env.PHARMACIST_PASSWORD_REG01,
      });
      expect(loginRes.ok, loginRes.error || 'Pharmacist login failed').toBe(true);

      const testData = resolveTestData();

      const getChatMessageByThreadIdRes = await safeGraphQL(api, {
        query: PHARMACIST_GET_CHAT_MESSAGES_BY_THREAD_ID_QUERY,
        variables: {
          threadId: testData.threadId,
        },
        headers: bearer(accessToken),
      });
      expect(getChatMessageByThreadIdRes.ok).toBe(true);
    }
  );

  test(
    'PHARMA-201 | Should be able to send Chat message by Order ID as Regular Pharmacist',
    {
      tag: ['@api', '@pharmacist', '@positive', '@pharma-201'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await pharmacistLoginAndGetTokens(api, {
        username: process.env.PHARMACIST_USERNAME_REG01,
        password: process.env.PHARMACIST_PASSWORD_REG01,
      });
      expect(loginRes.ok, loginRes.error || 'Pharmacist login failed').toBe(true);

      const testData = resolveTestData();

      const sendChatMessageByOrderIdRes = await safeGraphQL(api, {
        query: PHARMACIST_SEND_CHAT_MESSAGES_BY_ORDER_ID_QUERY,
        variables: {
          orderId: testData.orderId,
          chat: {
            sender: `PHARMACIST`,
            message: `Sample message from api - ${randomAlphanumeric(6)}`,
          },
        },
        headers: bearer(accessToken),
      });
      expect(sendChatMessageByOrderIdRes.ok).toBe(true);
    }
  );

  test(
    'PHARMA-202 | Should be able to send Chat message by Thread ID as Regular Pharmacist',
    {
      tag: ['@api', '@pharmacist', '@positive', '@pharma-202'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await pharmacistLoginAndGetTokens(api, {
        username: process.env.PHARMACIST_USERNAME_REG01,
        password: process.env.PHARMACIST_PASSWORD_REG01,
      });
      expect(loginRes.ok, loginRes.error || 'Pharmacist login failed').toBe(true);

      const testData = resolveTestData();

      const sendChatMessageByThreadIdRes = await safeGraphQL(api, {
        query: PHARMACIST_SEND_CHAT_MESSAGES_BY_THREAD_ID_QUERY,
        variables: {
          threadId: testData.threadId,
          chat: {
            sender: `PHARMACIST`,
            message: `Sample message from api - ${randomAlphanumeric(6)}`,
          },
        },
        headers: bearer(accessToken),
      });
      expect(sendChatMessageByThreadIdRes.ok).toBe(true);
    }
  );

  test(
    'PHARMA-203 | Should be able to SEEN a message thread as Regular Pharmacist',
    {
      tag: ['@api', '@pharmacist', '@positive', '@pharma-203'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await pharmacistLoginAndGetTokens(api, {
        username: process.env.PHARMACIST_USERNAME_REG01,
        password: process.env.PHARMACIST_PASSWORD_REG01,
      });
      expect(loginRes.ok, loginRes.error || 'Pharmacist login failed').toBe(true);

      const testData = resolveTestData();

      const setThreadSeenRes = await safeGraphQL(api, {
        query: PHARMACIST_SET_THREAD_SEEN_QUERY,
        variables: {
          threadId: testData.threadId,
        },
        headers: bearer(accessToken),
      });

      expect(setThreadSeenRes.ok).toBe(true);
    }
  );
});
