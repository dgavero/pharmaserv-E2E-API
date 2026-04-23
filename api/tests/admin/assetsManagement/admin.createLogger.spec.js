import {
  loginAsAdminAndGetTokens,
  loginAsPatientAndGetTokens,
  loginAsRiderAndGetTokens,
  loginAsPharmacistAndGetTokens,
  NOAUTH_MESSAGE_PATTERN,
  NOAUTH_CLASSIFICATIONS,
  NOAUTH_CODES,
  NOAUTH_HTTP_STATUSES,
} from '../../../helpers/auth.js';
import { safeGraphQL, bearer, getGQLError } from '../../../helpers/graphqlUtils.js';
import { test, expect } from '../../../globalConfig.api.js';
import { getAdminCredentials, getPatientAccount, getRiderAccount, getPharmacistAccount } from '../../../helpers/roleCredentials.js';
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
      const { accessToken, raw: loginRes } = await loginAsAdminAndGetTokens(api, getAdminCredentials('default'));
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

  test(
    'PHARMA-430 | Should fail create logger when status enum is invalid',
    {
      tag: ['@api', '@admin', '@negative', '@create', '@pharma-430'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsAdminAndGetTokens(api, getAdminCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Admin login failed').toBe(true);

      const invalidLoggerInput = {
        ...buildLoggerInput(),
        status: 'INVALID_STATUS',
      };

      const createLoggerInvalidInputRes = await safeGraphQL(api, {
        query: CREATE_LOGGER_MUTATION,
        variables: { logger: invalidLoggerInput },
        headers: bearer(accessToken),
      });

      expect(createLoggerInvalidInputRes.ok).toBe(false);
      if (createLoggerInvalidInputRes.httpOk) {
        const { message, code, classification } = getGQLError(createLoggerInvalidInputRes);
        expect(message, 'Expected GraphQL validation message for invalid status').toBeTruthy();
        expect.soft(code || classification, 'Expected GraphQL validation code/classification').toBeTruthy();
      } else {
        expect.soft(createLoggerInvalidInputRes.httpStatus).toBeGreaterThanOrEqual(400);
      }
    }
  );

  test(
    'PHARMA-442 | Should reuse existing logger when Idempotency-Key is reused',
    {
      tag: ['@api', '@admin', '@positive', '@create', '@pharma-442'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsAdminAndGetTokens(api, getAdminCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Admin login failed').toBe(true);

      const loggerInput = buildLoggerInput();
      const firstIdempotencyKey = `logger-${randomAlphanumeric(16)}`;

      const firstCreateRes = await safeGraphQL(api, {
        query: CREATE_LOGGER_MUTATION,
        variables: { logger: loggerInput },
        headers: { ...bearer(accessToken), 'Idempotency-Key': firstIdempotencyKey },
      });
      expect(firstCreateRes.ok, firstCreateRes.error || 'First create logger call failed').toBe(true);

      const firstNode = firstCreateRes.body?.data?.administrator?.asset?.createLogger;
      expect(firstNode, 'Missing first create logger node').toBeTruthy();
      expect.soft(typeof firstNode.id).toBe('string');

      const secondCreateSameKeyRes = await safeGraphQL(api, {
        query: CREATE_LOGGER_MUTATION,
        variables: { logger: loggerInput },
        headers: { ...bearer(accessToken), 'Idempotency-Key': firstIdempotencyKey },
      });
      expect(
        secondCreateSameKeyRes.ok,
        secondCreateSameKeyRes.error || 'Second create logger call with same key failed'
      ).toBe(true);

      const secondSameKeyNode = secondCreateSameKeyRes.body?.data?.administrator?.asset?.createLogger;
      expect(secondSameKeyNode, 'Missing second create logger node (same key)').toBeTruthy();
      expect(secondSameKeyNode.id).toBe(firstNode.id);
    }
  );

  test(
    'PHARMA-446 | Should reject create logger for non-admin roles',
    {
      tag: ['@api', '@admin', '@negative', '@create', '@pharma-446'],
    },
    async ({ api }) => {
      const roleCases = [
        {
          role: 'patient',
          login: () => loginAsPatientAndGetTokens(api, getPatientAccount('default')),
        },
        {
          role: 'rider',
          login: () => loginAsRiderAndGetTokens(api, getRiderAccount('default')),
        },
        {
          role: 'pharmacist',
          login: () => loginAsPharmacistAndGetTokens(api, getPharmacistAccount('reg01')),
        },
      ];

      for (const roleCase of roleCases) {
        const { accessToken, raw: loginRes } = await roleCase.login();
        expect(loginRes.ok, `${roleCase.role} login failed`).toBe(true);

        const createLoggerRes = await safeGraphQL(api, {
          query: CREATE_LOGGER_MUTATION,
          variables: { logger: buildLoggerInput() },
          headers: bearer(accessToken),
        });

        expect(createLoggerRes.ok, `${roleCase.role} should not be authorized to create logger`).toBe(false);

        if (!createLoggerRes.httpOk) {
          expect(
            NOAUTH_HTTP_STATUSES,
            `${roleCase.role} expected unauthorized transport status`
          ).toContain(createLoggerRes.httpStatus);
        } else {
          const { message, code, classification } = getGQLError(createLoggerRes);
          expect(message, `${roleCase.role} expected GraphQL auth/permission message`).toMatch(NOAUTH_MESSAGE_PATTERN);
          expect.soft(NOAUTH_CODES, `${roleCase.role} expected auth/permission code`).toContain(code);
          expect.soft(NOAUTH_CLASSIFICATIONS, `${roleCase.role} expected auth classification`).toContain(classification);
        }
      }
    }
  );
});
