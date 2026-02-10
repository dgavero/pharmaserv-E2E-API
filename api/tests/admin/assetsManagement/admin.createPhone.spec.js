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
import { randomNum } from '../../../../helpers/globalTestUtils.js';
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
      const { accessToken, raw: loginRes } = await adminLoginAndGetTokens(api, {
        username: process.env.ADMIN_USERNAME,
        password: process.env.ADMIN_PASSWORD,
      });
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
});
