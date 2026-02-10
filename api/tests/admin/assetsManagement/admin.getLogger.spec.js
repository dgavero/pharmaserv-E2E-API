import { test, expect } from '../../../globalConfig.api.js';
import {
  safeGraphQL,
  adminLoginAndGetTokens,
  bearer,
  getGQLError,
  NOAUTH_MESSAGE_PATTERN,
  NOAUTH_CODES,
  NOAUTH_CLASSIFICATIONS,
  NOAUTH_HTTP_STATUSES,
} from '../../../helpers/testUtilsAPI.js';
import { GET_LOGGER_QUERY } from './admin.assetsManagementQueries.js';

test.describe('GraphQL: Admin Get Logger', () => {
  test(
    'PHARMA-234 | Should get logger with valid auth tokens',
    {
      tag: ['@api', '@admin', '@positive', '@pharma-234'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await adminLoginAndGetTokens(api, {
        username: process.env.ADMIN_USERNAME,
        password: process.env.ADMIN_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Admin login failed').toBe(true);

      const getLoggerRes = await safeGraphQL(api, {
        query: GET_LOGGER_QUERY,
        variables: { assetReferenceId: 1 },
        headers: bearer(accessToken),
      });

      expect(getLoggerRes.ok, getLoggerRes.error || 'Get logger endpoint failed').toBe(true);

      const node = getLoggerRes.body?.data?.administrator?.asset?.logger;
      expect(node, 'Get logger endpoint returned no logger data').toBeTruthy();
      expect.soft(node.loggerNumber).toBe('DL-1234');
    }
  );

  test(
    'PHARMA-235 | Should NOT get logger with missing auth tokens',
    {
      tag: ['@api', '@admin', '@negative', '@pharma-235'],
    },
    async ({ api, noAuth }) => {
      const getLoggerNoAuthRes = await safeGraphQL(api, {
        query: GET_LOGGER_QUERY,
        variables: { assetReferenceId: 1 },
        headers: noAuth,
      });

      expect(getLoggerNoAuthRes.ok, getLoggerNoAuthRes.error || 'Expected UNAUTHORIZED when missing token').toBe(
        false
      );

      if (!getLoggerNoAuthRes.httpOk) {
        expect(NOAUTH_HTTP_STATUSES).toContain(getLoggerNoAuthRes.httpStatus);
      } else {
        const { message, code, classification } = getGQLError(getLoggerNoAuthRes);
        expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
        expect.soft(NOAUTH_CODES).toContain(code);
        expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
      }
    }
  );

  test(
    'PHARMA-236 | Should NOT get logger with invalid auth tokens',
    {
      tag: ['@api', '@admin', '@negative', '@pharma-236'],
    },
    async ({ api, invalidAuth }) => {
      const getLoggerInvalidAuthRes = await safeGraphQL(api, {
        query: GET_LOGGER_QUERY,
        variables: { assetReferenceId: 1 },
        headers: invalidAuth,
      });

      expect(getLoggerInvalidAuthRes.ok).toBe(false);
      expect(getLoggerInvalidAuthRes.httpOk).toBe(false);
      expect(NOAUTH_HTTP_STATUSES).toContain(getLoggerInvalidAuthRes.httpStatus);
    }
  );
});
