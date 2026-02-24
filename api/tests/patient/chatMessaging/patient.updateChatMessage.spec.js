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
import { UPDATE_CHAT_MESSAGE_MUTATION } from './patient.chatMessagingQueries.js';

function buildUpdatedMessage() {
  return `This is an API edited message ${randomAlphanumeric(9)}`;
}

test.describe('GraphQL: Patient Update Chat Message', () => {
  test(
    'PHARMA-282 | Should update chat message with valid auth tokens',
    {
      tag: ['@api', '@patient', '@positive', '@pharma-282'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAndGetTokens(api, {
        username: process.env.PATIENT_USER_USERNAME,
        password: process.env.PATIENT_USER_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Patient login failed').toBe(true);

      const updatedMessage = buildUpdatedMessage();

      const updateChatMessageRes = await safeGraphQL(api, {
        query: UPDATE_CHAT_MESSAGE_MUTATION,
        variables: { id: 400, message: updatedMessage },
        headers: bearer(accessToken),
      });

      expect(updateChatMessageRes.ok, updateChatMessageRes.error || 'Update chat message endpoint failed').toBe(true);

      const node = updateChatMessageRes.body?.data?.patient?.chat?.updateMessage;
      expect(node, 'Update chat message endpoint returned no data').toBeTruthy();
      expect(node.message).toBe(updatedMessage);
    }
  );

  test(
    'PHARMA-283 | Should NOT update chat message with missing auth tokens',
    {
      tag: ['@api', '@patient', '@negative', '@pharma-283'],
    },
    async ({ api, noAuth }) => {
      const updatedMessage = buildUpdatedMessage();

      const updateChatMessageNoAuthRes = await safeGraphQL(api, {
        query: UPDATE_CHAT_MESSAGE_MUTATION,
        variables: { id: 570, message: updatedMessage },
        headers: noAuth,
      });

      expect(
        updateChatMessageNoAuthRes.ok,
        updateChatMessageNoAuthRes.error || 'Expected UNAUTHORIZED when missing token'
      ).toBe(false);

      if (!updateChatMessageNoAuthRes.httpOk) {
        expect(NOAUTH_HTTP_STATUSES).toContain(updateChatMessageNoAuthRes.httpStatus);
      } else {
        const { message, code, classification } = getGQLError(updateChatMessageNoAuthRes);
        expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
        expect.soft(NOAUTH_CODES).toContain(code);
        expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
      }
    }
  );

  test(
    'PHARMA-284 | Should NOT update chat message with invalid auth tokens',
    {
      tag: ['@api', '@patient', '@negative', '@pharma-284'],
    },
    async ({ api, invalidAuth }) => {
      const updatedMessage = buildUpdatedMessage();

      const updateChatMessageInvalidAuthRes = await safeGraphQL(api, {
        query: UPDATE_CHAT_MESSAGE_MUTATION,
        variables: { id: 570, message: updatedMessage },
        headers: invalidAuth,
      });

      expect(updateChatMessageInvalidAuthRes.ok).toBe(false);
      expect(updateChatMessageInvalidAuthRes.httpOk).toBe(false);
      expect(NOAUTH_HTTP_STATUSES).toContain(updateChatMessageInvalidAuthRes.httpStatus);
    }
  );
});
