import {
  loginAsPatientAndGetTokens,
  NOAUTH_MESSAGE_PATTERN,
  NOAUTH_CLASSIFICATIONS,
  NOAUTH_CODES,
  NOAUTH_HTTP_STATUSES,
} from '../../../helpers/auth.js';
import { safeGraphQL, bearer, getGQLError } from '../../../helpers/graphqlUtils.js';
import { test, expect } from '../../../globalConfig.api.js';
import { getPatientCredentials } from '../../../helpers/roleCredentials.js';
import { SET_CHAT_THREAD_SEEN_MUTATION } from './patient.chatMessagingQueries.js';
import { CHAT_THREAD_ID } from './patient.chatMessagingConstants.js';

test.describe('GraphQL: Patient Set Thread Seen', () => {
  test(
    'PHARMA-410 | Should set chat thread seen with valid auth tokens',
    {
      tag: ['@api', '@patient', '@positive', '@pharma-410'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsPatientAndGetTokens(api, getPatientCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Patient login failed').toBe(true);

      const setThreadSeenRes = await safeGraphQL(api, {
        query: SET_CHAT_THREAD_SEEN_MUTATION,
        variables: { threadId: CHAT_THREAD_ID },
        headers: bearer(accessToken),
      });

      expect(setThreadSeenRes.ok, setThreadSeenRes.error || 'Set thread seen endpoint failed').toBe(true);
    }
  );

  test(
    'PHARMA-411 | Should NOT set chat thread seen with missing auth tokens',
    {
      tag: ['@api', '@patient', '@negative', '@pharma-411'],
    },
    async ({ api, noAuth }) => {
      const setThreadSeenNoAuthRes = await safeGraphQL(api, {
        query: SET_CHAT_THREAD_SEEN_MUTATION,
        variables: { threadId: CHAT_THREAD_ID },
        headers: noAuth,
      });

      expect(
        setThreadSeenNoAuthRes.ok,
        setThreadSeenNoAuthRes.error || 'Expected UNAUTHORIZED when missing token'
      ).toBe(false);

      if (!setThreadSeenNoAuthRes.httpOk) {
        expect(NOAUTH_HTTP_STATUSES).toContain(setThreadSeenNoAuthRes.httpStatus);
      } else {
        const { message, code, classification } = getGQLError(setThreadSeenNoAuthRes);
        expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
        expect.soft(NOAUTH_CODES).toContain(code);
        expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
      }
    }
  );

  test(
    'PHARMA-412 | Should NOT set chat thread seen with invalid auth tokens',
    {
      tag: ['@api', '@patient', '@negative', '@pharma-412'],
    },
    async ({ api, invalidAuth }) => {
      const setThreadSeenInvalidAuthRes = await safeGraphQL(api, {
        query: SET_CHAT_THREAD_SEEN_MUTATION,
        variables: { threadId: CHAT_THREAD_ID },
        headers: invalidAuth,
      });

      expect(setThreadSeenInvalidAuthRes.ok).toBe(false);
      expect(setThreadSeenInvalidAuthRes.httpOk).toBe(false);
      expect(NOAUTH_HTTP_STATUSES).toContain(setThreadSeenInvalidAuthRes.httpStatus);
    }
  );
});
