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
import { GET_PHONE_QUERY } from './admin.assetsManagementQueries.js';

test.describe('GraphQL: Admin Get Phone', () => {
  test(
    'PHARMA-240 | Should get phone with valid auth tokens',
    {
      tag: ['@api', '@admin', '@positive', '@pharma-240'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await adminLoginAndGetTokens(api, {
        username: process.env.ADMIN_USERNAME,
        password: process.env.ADMIN_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Admin login failed').toBe(true);

      const getPhoneRes = await safeGraphQL(api, {
        query: GET_PHONE_QUERY,
        variables: { assetReferenceId: 4 },
        headers: bearer(accessToken),
      });

      expect(getPhoneRes.ok, getPhoneRes.error || 'Get phone endpoint failed').toBe(true);

      const node = getPhoneRes.body?.data?.administrator?.asset?.phone;
      expect(node, 'Get phone endpoint returned no phone data').toBeTruthy();
      expect.soft(node.model).toBe('SEMSONG-78773');
    }
  );

  test(
    'PHARMA-241 | Should NOT get phone with missing auth tokens',
    {
      tag: ['@api', '@admin', '@negative', '@pharma-241'],
    },
    async ({ api, noAuth }) => {
      const getPhoneNoAuthRes = await safeGraphQL(api, {
        query: GET_PHONE_QUERY,
        variables: { assetReferenceId: 4 },
        headers: noAuth,
      });

      expect(getPhoneNoAuthRes.ok, getPhoneNoAuthRes.error || 'Expected UNAUTHORIZED when missing token').toBe(
        false
      );

      if (!getPhoneNoAuthRes.httpOk) {
        expect(NOAUTH_HTTP_STATUSES).toContain(getPhoneNoAuthRes.httpStatus);
      } else {
        const { message, code, classification } = getGQLError(getPhoneNoAuthRes);
        expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
        expect.soft(NOAUTH_CODES).toContain(code);
        expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
      }
    }
  );

  test(
    'PHARMA-242 | Should NOT get phone with invalid auth tokens',
    {
      tag: ['@api', '@admin', '@negative', '@pharma-242'],
    },
    async ({ api, invalidAuth }) => {
      const getPhoneInvalidAuthRes = await safeGraphQL(api, {
        query: GET_PHONE_QUERY,
        variables: { assetReferenceId: 4 },
        headers: invalidAuth,
      });

      expect(getPhoneInvalidAuthRes.ok).toBe(false);
      expect(getPhoneInvalidAuthRes.httpOk).toBe(false);
      expect(NOAUTH_HTTP_STATUSES).toContain(getPhoneInvalidAuthRes.httpStatus);
    }
  );
});
