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
import { randomAlphanumeric, randomNum } from '../../../../helpers/globalTestUtils.js';
import { CREATE_PHONE_MUTATION } from './admin.assetsManagementQueries.js';

function buildPhoneInput() {
  const deviceType = Math.random() < 0.5 ? 'IOS' : 'ANDROID';
  const model = `SEMSONG-${randomNum(5)}`;
  const imei = randomNum(12);
  const imei2 = randomNum(12);
  return {
    status: 'UNDER_MAINTENANCE',
    deviceType,
    model,
    imei,
    imei2,
    dateAcquired: '2026-01-01',
  };
}

test.describe('GraphQL: Admin Create Phone', () => {
  test(
    'PHARMA-237 | Should create a phone with valid auth tokens',
    {
      tag: ['@api', '@admin', '@positive', '@create', '@pharma-237'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsAdminAndGetTokens(api, getAdminCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Admin login failed').toBe(true);

      const phoneInput = buildPhoneInput();

      const createPhoneRes = await safeGraphQL(api, {
        query: CREATE_PHONE_MUTATION,
        variables: { phone: phoneInput },
        headers: bearer(accessToken),
      });

      expect(createPhoneRes.ok, createPhoneRes.error || 'Create phone endpoint failed').toBe(true);

      const node = createPhoneRes.body?.data?.administrator?.asset?.createPhone;
      expect(node, 'Create phone endpoint returned no data').toBeTruthy();
      expect.soft(node.model).toBe(phoneInput.model);
      expect.soft(node.imei).toBe(phoneInput.imei);
      expect.soft(node.imei2).toBe(phoneInput.imei2);
      expect.soft(node.deviceType).toBe(phoneInput.deviceType);
    }
  );

  test(
    'PHARMA-238 | Should NOT create a phone with missing auth tokens',
    {
      tag: ['@api', '@admin', '@negative', '@create', '@pharma-238'],
    },
    async ({ api, noAuth }) => {
      const phoneInput = buildPhoneInput();

      const createPhoneNoAuthRes = await safeGraphQL(api, {
        query: CREATE_PHONE_MUTATION,
        variables: { phone: phoneInput },
        headers: noAuth,
      });

      expect(createPhoneNoAuthRes.ok, createPhoneNoAuthRes.error || 'Expected UNAUTHORIZED when missing token').toBe(
        false
      );

      if (!createPhoneNoAuthRes.httpOk) {
        expect(NOAUTH_HTTP_STATUSES).toContain(createPhoneNoAuthRes.httpStatus);
      } else {
        const { message, code, classification } = getGQLError(createPhoneNoAuthRes);
        expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
        expect.soft(NOAUTH_CODES).toContain(code);
        expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
      }
    }
  );

  test(
    'PHARMA-239 | Should NOT create a phone with invalid auth tokens',
    {
      tag: ['@api', '@admin', '@negative', '@create', '@pharma-239'],
    },
    async ({ api, invalidAuth }) => {
      const phoneInput = buildPhoneInput();

      const createPhoneInvalidAuthRes = await safeGraphQL(api, {
        query: CREATE_PHONE_MUTATION,
        variables: { phone: phoneInput },
        headers: invalidAuth,
      });

      expect(createPhoneInvalidAuthRes.ok).toBe(false);
      expect(createPhoneInvalidAuthRes.httpOk).toBe(false);
      expect(NOAUTH_HTTP_STATUSES).toContain(createPhoneInvalidAuthRes.httpStatus);
    }
  );

  test(
    'PHARMA-431 | Should fail create phone when deviceType enum is invalid',
    {
      tag: ['@api', '@admin', '@negative', '@create', '@pharma-431'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsAdminAndGetTokens(api, getAdminCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Admin login failed').toBe(true);

      const invalidPhoneInput = {
        ...buildPhoneInput(),
        deviceType: 'INVALID_DEVICE_TYPE',
      };

      const createPhoneInvalidInputRes = await safeGraphQL(api, {
        query: CREATE_PHONE_MUTATION,
        variables: { phone: invalidPhoneInput },
        headers: bearer(accessToken),
      });

      expect(createPhoneInvalidInputRes.ok).toBe(false);
      if (createPhoneInvalidInputRes.httpOk) {
        const { message, code, classification } = getGQLError(createPhoneInvalidInputRes);
        expect(message, 'Expected GraphQL validation message for invalid deviceType').toBeTruthy();
        expect.soft(code || classification, 'Expected GraphQL validation code/classification').toBeTruthy();
      } else {
        expect.soft(createPhoneInvalidInputRes.httpStatus).toBeGreaterThanOrEqual(400);
      }
    }
  );

  test(
    'PHARMA-443 | Should reuse existing phone when Idempotency-Key is reused',
    {
      tag: ['@api', '@admin', '@positive', '@create', '@pharma-443'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsAdminAndGetTokens(api, getAdminCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Admin login failed').toBe(true);

      const phoneInput = buildPhoneInput();
      const firstIdempotencyKey = `phone-${randomAlphanumeric(16)}`;

      const firstCreateRes = await safeGraphQL(api, {
        query: CREATE_PHONE_MUTATION,
        variables: { phone: phoneInput },
        headers: { ...bearer(accessToken), 'Idempotency-Key': firstIdempotencyKey },
      });
      expect(firstCreateRes.ok, firstCreateRes.error || 'First create phone call failed').toBe(true);

      const firstNode = firstCreateRes.body?.data?.administrator?.asset?.createPhone;
      expect(firstNode, 'Missing first create phone node').toBeTruthy();
      expect.soft(typeof firstNode.id).toBe('string');

      const secondCreateSameKeyRes = await safeGraphQL(api, {
        query: CREATE_PHONE_MUTATION,
        variables: { phone: phoneInput },
        headers: { ...bearer(accessToken), 'Idempotency-Key': firstIdempotencyKey },
      });
      expect(secondCreateSameKeyRes.ok, secondCreateSameKeyRes.error || 'Second create phone call with same key failed').toBe(
        true
      );

      const secondSameKeyNode = secondCreateSameKeyRes.body?.data?.administrator?.asset?.createPhone;
      expect(secondSameKeyNode, 'Missing second create phone node (same key)').toBeTruthy();
      expect(secondSameKeyNode.id).toBe(firstNode.id);
    }
  );

  test(
    'PHARMA-447 | Should reject create phone for non-admin roles',
    {
      tag: ['@api', '@admin', '@negative', '@create', '@pharma-447'],
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

        const createPhoneRes = await safeGraphQL(api, {
          query: CREATE_PHONE_MUTATION,
          variables: { phone: buildPhoneInput() },
          headers: bearer(accessToken),
        });

        expect(createPhoneRes.ok, `${roleCase.role} should not be authorized to create phone`).toBe(false);

        if (!createPhoneRes.httpOk) {
          expect(
            NOAUTH_HTTP_STATUSES,
            `${roleCase.role} expected unauthorized transport status`
          ).toContain(createPhoneRes.httpStatus);
        } else {
          const { message, code, classification } = getGQLError(createPhoneRes);
          expect(message, `${roleCase.role} expected GraphQL auth/permission message`).toMatch(NOAUTH_MESSAGE_PATTERN);
          expect.soft(NOAUTH_CODES, `${roleCase.role} expected auth/permission code`).toContain(code);
          expect.soft(NOAUTH_CLASSIFICATIONS, `${roleCase.role} expected auth classification`).toContain(classification);
        }
      }
    }
  );
});
