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
import { GET_BOX_QUERY } from './admin.assetsManagementQueries.js';

test.describe('GraphQL: Admin Get Box', () => {
  test(
    'PHARMA-228 | Should get box with valid auth tokens',
    {
      tag: ['@api', '@admin', '@positive', '@pharma-228'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await adminLoginAndGetTokens(api, {
        username: process.env.ADMIN_USERNAME,
        password: process.env.ADMIN_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Admin login failed').toBe(true);

      const getBoxRes = await safeGraphQL(api, {
        query: GET_BOX_QUERY,
        variables: { assetReferenceId: 1 },
        headers: bearer(accessToken),
      });

      expect(getBoxRes.ok, getBoxRes.error || 'Get box endpoint failed').toBe(true);

      const node = getBoxRes.body?.data?.administrator?.asset?.box;
      expect(node, 'Get box endpoint returned no box data').toBeTruthy();
    }
  );

  test(
    'PHARMA-229 | Should NOT get box with missing auth tokens',
    {
      tag: ['@api', '@admin', '@negative', '@pharma-229'],
    },
    async ({ api, noAuth }) => {
      const getBoxNoAuthRes = await safeGraphQL(api, {
        query: GET_BOX_QUERY,
        variables: { assetReferenceId: 1 },
        headers: noAuth,
      });

      expect(getBoxNoAuthRes.ok, getBoxNoAuthRes.error || 'Expected UNAUTHORIZED when missing token').toBe(false);

      if (!getBoxNoAuthRes.httpOk) {
        expect(NOAUTH_HTTP_STATUSES).toContain(getBoxNoAuthRes.httpStatus);
      } else {
        const { message, code, classification } = getGQLError(getBoxNoAuthRes);
        expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
        expect.soft(NOAUTH_CODES).toContain(code);
        expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
      }
    }
  );

  test(
    'PHARMA-230 | Should NOT get box with invalid auth tokens',
    {
      tag: ['@api', '@admin', '@negative', '@pharma-230'],
    },
    async ({ api, invalidAuth }) => {
      const getBoxInvalidAuthRes = await safeGraphQL(api, {
        query: GET_BOX_QUERY,
        variables: { assetReferenceId: 1 },
        headers: invalidAuth,
      });

      expect(getBoxInvalidAuthRes.ok).toBe(false);
      expect(getBoxInvalidAuthRes.httpOk).toBe(false);
      expect(NOAUTH_HTTP_STATUSES).toContain(getBoxInvalidAuthRes.httpStatus);
    }
  );
});
