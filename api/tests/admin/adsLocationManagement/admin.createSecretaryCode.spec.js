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
import { randomAlphanumeric, randomLetters } from '../../../../helpers/globalTestUtils.js';
import { CREATE_SECRETARY_CODE_MUTATION } from './admin.adsLocationQueries.js';

function buildSecretaryCodeInput() {
  return {
    locationId: 1,
    code: randomAlphanumeric(4).toUpperCase(),
    firstName: `QA-${randomLetters(4)}`,
    lastName: `Sec-${randomLetters(4)}`,
  };
}

test.describe('GraphQL: Admin Create Secretary Code', () => {
  test(
    'PHARMA-222 | Should create secretary code with valid auth tokens',
    {
      tag: ['@api', '@admin', '@positive', '@create', '@pharma-222'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await adminLoginAndGetTokens(api, {
        username: process.env.ADMIN_USERNAME,
        password: process.env.ADMIN_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Admin login failed').toBe(true);

      const secretaryCodeInput = buildSecretaryCodeInput();

      const createSecretaryCodeRes = await safeGraphQL(api, {
        query: CREATE_SECRETARY_CODE_MUTATION,
        variables: { code: secretaryCodeInput },
        headers: bearer(accessToken),
      });

      expect(
        createSecretaryCodeRes.ok,
        createSecretaryCodeRes.error || 'Create secretary code endpoint failed'
      ).toBe(true);

      const node = createSecretaryCodeRes.body?.data?.administrator?.secretaryCode?.create;
      expect(node, 'Create secretary code endpoint returned no data').toBeTruthy();

      expect.soft(node.code).toBe(secretaryCodeInput.code);
      expect.soft(node.firstName).toBe(secretaryCodeInput.firstName);
      expect.soft(node.lastName).toBe(secretaryCodeInput.lastName);
    }
  );

  test(
    'PHARMA-223 | Should NOT create secretary code with missing auth tokens',
    {
      tag: ['@api', '@admin', '@negative', '@create', '@pharma-223'],
    },
    async ({ api, noAuth }) => {
      const secretaryCodeInput = buildSecretaryCodeInput();

      const createSecretaryCodeNoAuthRes = await safeGraphQL(api, {
        query: CREATE_SECRETARY_CODE_MUTATION,
        variables: { code: secretaryCodeInput },
        headers: noAuth,
      });

      expect(
        createSecretaryCodeNoAuthRes.ok,
        createSecretaryCodeNoAuthRes.error || 'Expected UNAUTHORIZED when missing token'
      ).toBe(false);

      if (!createSecretaryCodeNoAuthRes.httpOk) {
        expect(NOAUTH_HTTP_STATUSES).toContain(createSecretaryCodeNoAuthRes.httpStatus);
      } else {
        const { message, code, classification } = getGQLError(createSecretaryCodeNoAuthRes);
        expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
        expect.soft(NOAUTH_CODES).toContain(code);
        expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
      }
    }
  );

  test(
    'PHARMA-224 | Should NOT create secretary code with invalid auth tokens',
    {
      tag: ['@api', '@admin', '@negative', '@create', '@pharma-224'],
    },
    async ({ api, invalidAuth }) => {
      const secretaryCodeInput = buildSecretaryCodeInput();

      const createSecretaryCodeInvalidAuthRes = await safeGraphQL(api, {
        query: CREATE_SECRETARY_CODE_MUTATION,
        variables: { code: secretaryCodeInput },
        headers: invalidAuth,
      });

      expect(createSecretaryCodeInvalidAuthRes.ok).toBe(false);
      expect(createSecretaryCodeInvalidAuthRes.httpOk).toBe(false);
      expect(NOAUTH_HTTP_STATUSES).toContain(createSecretaryCodeInvalidAuthRes.httpStatus);
    }
  );
});
