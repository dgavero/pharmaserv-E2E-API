import {
  loginAsAdminAndGetTokens,
  NOAUTH_MESSAGE_PATTERN,
  NOAUTH_CLASSIFICATIONS,
  NOAUTH_CODES,
  NOAUTH_HTTP_STATUSES,
} from '../../../helpers/auth.js';
import { safeGraphQL, bearer, getGQLError } from '../../../helpers/graphqlUtils.js';
import { test, expect } from '../../../globalConfig.api.js';
import { getAdminCredentials } from '../../../helpers/roleCredentials.js';
import { GET_ALL_LOGGERS_QUERY } from './admin.assetsManagementQueries.js';

test.describe('GraphQL: Admin Get All Loggers', () => {
  test(
    'PHARMA-359 | Should get all loggers with valid auth tokens',
    {
      tag: ['@api', '@admin', '@positive', '@pharma-359'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsAdminAndGetTokens(api, getAdminCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Admin login failed').toBe(true);

      const getAllLoggersRes = await safeGraphQL(api, {
        query: GET_ALL_LOGGERS_QUERY,
        headers: bearer(accessToken),
      });

      expect(getAllLoggersRes.ok, getAllLoggersRes.error || 'Get all loggers endpoint failed').toBe(true);

      const node = getAllLoggersRes.body?.data?.administrator?.asset?.allLoggers;
      expect(Array.isArray(node), 'Get all loggers endpoint should return an array').toBe(true);
      expect(node.length, 'Get all loggers endpoint should return at least one logger').toBeGreaterThan(0);

      for (const loggerNode of node) {
        expect.soft(typeof loggerNode?.loggerNumber).toBe('string');
      }
    }
  );

  test(
    'PHARMA-360 | Should NOT get all loggers with missing auth tokens',
    {
      tag: ['@api', '@admin', '@negative', '@pharma-360'],
    },
    async ({ api, noAuth }) => {
      const getAllLoggersNoAuthRes = await safeGraphQL(api, {
        query: GET_ALL_LOGGERS_QUERY,
        headers: noAuth,
      });

      expect(getAllLoggersNoAuthRes.ok, getAllLoggersNoAuthRes.error || 'Expected UNAUTHORIZED when missing token').toBe(
        false
      );

      if (!getAllLoggersNoAuthRes.httpOk) {
        expect(NOAUTH_HTTP_STATUSES).toContain(getAllLoggersNoAuthRes.httpStatus);
      } else {
        const { message, code, classification } = getGQLError(getAllLoggersNoAuthRes);
        expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
        expect.soft(NOAUTH_CODES).toContain(code);
        expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
      }
    }
  );

  test(
    'PHARMA-361 | Should NOT get all loggers with invalid auth tokens',
    {
      tag: ['@api', '@admin', '@negative', '@pharma-361'],
    },
    async ({ api, invalidAuth }) => {
      const getAllLoggersInvalidAuthRes = await safeGraphQL(api, {
        query: GET_ALL_LOGGERS_QUERY,
        headers: invalidAuth,
      });

      expect(getAllLoggersInvalidAuthRes.ok).toBe(false);
      expect(getAllLoggersInvalidAuthRes.httpOk).toBe(false);
      expect(NOAUTH_HTTP_STATUSES).toContain(getAllLoggersInvalidAuthRes.httpStatus);
    }
  );
});
