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
      orderId: 216,
      threadId: 85,
    },
    QA: {
      orderId: 686,
      threadId: 526,
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

test.describe('GraphQL: PSE Pharmacist Messaging', () => {
  test(
    'PHARMA-204 | Should be able to GET Chat details as PSE pharmacist for NON-onboarded orders',
    {
      tag: ['@api', '@pharmacist', '@positive', '@pharma-204'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await pharmacistLoginAndGetTokens(api, {
        username: process.env.PHARMACIST_USERNAME_PSE01,
        password: process.env.PHARMACIST_PASSWORD_PSE01,
      });
      expect(loginRes.ok, loginRes.error || 'Pharmacist login failed').toBe(true);

      const getChatPSEBranchThreadRes = await safeGraphQL(api, {
        query: PHARMACIST_GET_CHAT_PSE_BRANCH_THREAD_QUERY,
        headers: bearer(accessToken),
      });

      expect(getChatPSEBranchThreadRes.ok).toBe(true);
    }
  );

  test(
    'PHARMA-205 | Should NOT be able to GET Chat details as PSE pharmacist for onboarded orders',
    {
      tag: ['@api', '@pharmacist', '@negative', '@pharma-205'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await pharmacistLoginAndGetTokens(api, {
        username: process.env.PHARMACIST_USERNAME_PSE01,
        password: process.env.PHARMACIST_PASSWORD_PSE01,
      });
      expect(loginRes.ok, loginRes.error || 'Pharmacist login failed').toBe(true);

      const getChatRegBranchThreadRes = await safeGraphQL(api, {
        query: PHARMACIST_GET_CHAT_REGULAR_BRANCH_THREAD_QUERY,
        headers: bearer(accessToken),
      });

      expect(getChatRegBranchThreadRes.ok).toBe(false);
    }
  );

  test(
    'PHARMA-206 | Should be able to Get Chat Thread Id as PSE Pharmacist',
    {
      tag: ['@api', '@pharmacist', '@positive', '@pharma-206'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await pharmacistLoginAndGetTokens(api, {
        username: process.env.PHARMACIST_USERNAME_PSE01,
        password: process.env.PHARMACIST_PASSWORD_PSE01,
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
    'PHARMA-207 | Should be able to Get Chat Messages by Order Id as PSE Pharmacist',
    {
      tag: ['@api', '@pharmacist', '@positive', '@pharma-207'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await pharmacistLoginAndGetTokens(api, {
        username: process.env.PHARMACIST_USERNAME_PSE01,
        password: process.env.PHARMACIST_PASSWORD_PSE01,
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
    'PHARMA-208 | Should be able to Get Chat Messages by Thread Id as PSE Pharmacist',
    {
      tag: ['@api', '@pharmacist', '@positive', '@pharma-208'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await pharmacistLoginAndGetTokens(api, {
        username: process.env.PHARMACIST_USERNAME_PSE01,
        password: process.env.PHARMACIST_PASSWORD_PSE01,
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
    'PHARMA-209 | Should be able to send Chat message by Order ID as PSE Pharmacist',
    {
      tag: ['@api', '@pharmacist', '@positive', '@pharma-209'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await pharmacistLoginAndGetTokens(api, {
        username: process.env.PHARMACIST_USERNAME_PSE01,
        password: process.env.PHARMACIST_PASSWORD_PSE01,
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
    'PHARMA-210 | Should be able to send Chat message by Thread ID as PSE Pharmacist',
    {
      tag: ['@api', '@pharmacist', '@positive', '@pharma-210'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await pharmacistLoginAndGetTokens(api, {
        username: process.env.PHARMACIST_USERNAME_PSE01,
        password: process.env.PHARMACIST_PASSWORD_PSE01,
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
    'PHARMA-211 | Should be able to SEEN a message thread as PSE Pharmacist',
    {
      tag: ['@api', '@pharmacist', '@positive', '@pharma-211'],
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
