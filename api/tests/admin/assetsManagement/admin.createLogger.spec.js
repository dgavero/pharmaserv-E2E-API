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
import { randomAlphanumeric, randomLetters, randomNum } from '../../../../helpers/globalTestUtils.js';
import { CREATE_LOGGER_MUTATION } from './admin.assetsManagementQueries.js';

function buildLoggerInput() {
  const loggerNumber = `${randomNum(4)}-${randomNum(4)}-${randomNum(4)}`;
  return {
    status: 'INACTIVE',
    loggerNumber,
    dateAcquired: '2026-01-01',
    assignedTo: `QA ${randomLetters(5)} ${randomAlphanumeric(4)}`,
  };
}

test.describe('GraphQL: Admin Create Logger', () => {
  test(
    'PHARMA-231 | Should create a logger with valid auth tokens',
    {
      tag: ['@api', '@admin', '@positive', '@create', '@pharma-231'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await adminLoginAndGetTokens(api, {
        username: process.env.ADMIN_USERNAME,
        password: process.env.ADMIN_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Admin login failed').toBe(true);

      const loggerInput = buildLoggerInput();

      const createLoggerRes = await safeGraphQL(api, {
        query: CREATE_LOGGER_MUTATION,
        variables: { logger: loggerInput },
        headers: bearer(accessToken),
      });

      expect(
        createLoggerRes.ok,
        createLoggerRes.error || 'Create logger endpoint failed'
      ).toBe(true);

      const node = createLoggerRes.body?.data?.administrator?.asset?.createLogger;
      expect(node, 'Create logger endpoint returned no data').toBeTruthy();
      expect.soft(node.loggerNumber).toBe(loggerInput.loggerNumber);
    }
  );

  test(
    'PHARMA-232 | Should NOT create a logger with missing auth tokens',
    {
      tag: ['@api', '@admin', '@negative', '@create', '@pharma-232'],
    },
    async ({ api, noAuth }) => {
      const loggerInput = buildLoggerInput();

      const createLoggerNoAuthRes = await safeGraphQL(api, {
        query: CREATE_LOGGER_MUTATION,
        variables: { logger: loggerInput },
        headers: noAuth,
      });

      expect(
        createLoggerNoAuthRes.ok,
        createLoggerNoAuthRes.error || 'Expected UNAUTHORIZED when missing token'
      ).toBe(false);

      if (!createLoggerNoAuthRes.httpOk) {
        expect(NOAUTH_HTTP_STATUSES).toContain(createLoggerNoAuthRes.httpStatus);
      } else {
        const { message, code, classification } = getGQLError(createLoggerNoAuthRes);
        expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
        expect.soft(NOAUTH_CODES).toContain(code);
        expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
      }
    }
  );

  test(
    'PHARMA-233 | Should NOT create a logger with invalid auth tokens',
    {
      tag: ['@api', '@admin', '@negative', '@create', '@pharma-233'],
    },
    async ({ api, invalidAuth }) => {
      const loggerInput = buildLoggerInput();

      const createLoggerInvalidAuthRes = await safeGraphQL(api, {
        query: CREATE_LOGGER_MUTATION,
        variables: { logger: loggerInput },
        headers: invalidAuth,
      });

      expect(createLoggerInvalidAuthRes.ok).toBe(false);
      expect(createLoggerInvalidAuthRes.httpOk).toBe(false);
      expect(NOAUTH_HTTP_STATUSES).toContain(createLoggerInvalidAuthRes.httpStatus);
    }
  );
});
