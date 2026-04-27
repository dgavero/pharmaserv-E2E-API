import { loginAsAdminAndGetTokens, NOAUTH_MESSAGE_PATTERN, NOAUTH_CLASSIFICATIONS, NOAUTH_CODES, NOAUTH_HTTP_STATUSES } from '../../../helpers/auth.js';
import { safeGraphQL, bearer, getGQLError } from '../../../helpers/graphqlUtils.js';
import { test, expect } from '../../../globalConfig.api.js';
import { getAdminCredentials } from '../../../helpers/roleCredentials.js';
import { GET_LOGGER_QUERY } from './admin.assetsManagementQueries.js';

test.describe('GraphQL: Admin Get Logger', () => {
  test(
    'PHARMA-234 | Should get logger with valid auth tokens',
    {
      tag: ['@api', '@admin', '@positive', '@pharma-234'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsAdminAndGetTokens(api, getAdminCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Admin login failed').toBe(true);

      const getLoggerRes = await safeGraphQL(api, {
        query: GET_LOGGER_QUERY,
        variables: { assetReferenceId: 1 },
        headers: bearer(accessToken),
      });

      expect(getLoggerRes.ok, getLoggerRes.error || 'Get logger endpoint failed').toBe(true);

      const node = getLoggerRes.body?.data?.administrator?.asset?.logger;
      expect(node, 'Get logger endpoint returned no logger data').toBeTruthy();
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

      expect(getLoggerNoAuthRes.ok, getLoggerNoAuthRes.error || 'Expected UNAUTHORIZED when missing token').toBe(false);

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

  test(
    'PHARMA-434 | Get logger should return contract-valid structure and types',
    {
      tag: ['@api', '@admin', '@positive', '@pharma-434'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsAdminAndGetTokens(api, getAdminCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Admin login failed').toBe(true);

      const getLoggerRes = await safeGraphQL(api, {
        query: GET_LOGGER_QUERY,
        variables: { assetReferenceId: 1 },
        headers: bearer(accessToken),
      });

      expect(getLoggerRes.httpStatus).toBe(200);
      expect(getLoggerRes.httpOk).toBe(true);
      expect(getLoggerRes.ok, getLoggerRes.error || 'Get logger endpoint failed').toBe(true);

      const node = getLoggerRes.body?.data?.administrator?.asset?.logger;
      expect(node, 'Missing data.administrator.asset.logger').toBeTruthy();
      expect.soft(typeof node.loggerNumber).toBe('string');
      expect.soft(node.loggerNumber.length).toBeGreaterThan(0);
      expect.soft(Object.keys(node).sort()).toEqual(['loggerNumber']);
    }
  );
});
