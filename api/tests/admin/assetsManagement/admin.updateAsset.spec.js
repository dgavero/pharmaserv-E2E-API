import { loginAsAdminAndGetTokens, NOAUTH_MESSAGE_PATTERN, NOAUTH_CLASSIFICATIONS, NOAUTH_CODES, NOAUTH_HTTP_STATUSES } from '../../../helpers/auth.js';
import { safeGraphQL, bearer, getGQLError } from '../../../helpers/graphqlUtils.js';
import { test, expect } from '../../../globalConfig.api.js';
import { getAdminCredentials } from '../../../helpers/roleCredentials.js';
import { UPDATE_ASSET_MUTATION } from './admin.assetsManagementQueries.js';

const UPDATE_ASSET_INPUT = {
  assetId: 1,
  asset: {
    status: 'INACTIVE',
    assignedTo: 'Doe, John',
  },
};

test.describe('GraphQL: Admin Update Asset', () => {
  test(
    'PHARMA-252 | Should update asset with valid auth tokens',
    {
      tag: ['@api', '@admin', '@positive', '@pharma-252'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsAdminAndGetTokens(api, getAdminCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Admin login failed').toBe(true);

      const updateAssetRes = await safeGraphQL(api, {
        query: UPDATE_ASSET_MUTATION,
        variables: UPDATE_ASSET_INPUT,
        headers: bearer(accessToken),
      });

      expect(updateAssetRes.ok, updateAssetRes.error || 'Update asset endpoint failed').toBe(true);
    }
  );

  test(
    'PHARMA-253 | Should NOT update asset with missing auth tokens',
    {
      tag: ['@api', '@admin', '@negative', '@pharma-253'],
    },
    async ({ api, noAuth }) => {
      const updateAssetNoAuthRes = await safeGraphQL(api, {
        query: UPDATE_ASSET_MUTATION,
        variables: UPDATE_ASSET_INPUT,
        headers: noAuth,
      });

      expect(
        updateAssetNoAuthRes.ok,
        updateAssetNoAuthRes.error || 'Expected UNAUTHORIZED when missing token'
      ).toBe(false);

      if (!updateAssetNoAuthRes.httpOk) {
        expect(NOAUTH_HTTP_STATUSES).toContain(updateAssetNoAuthRes.httpStatus);
      } else {
        const { message, code, classification } = getGQLError(updateAssetNoAuthRes);
        expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
        expect.soft(NOAUTH_CODES).toContain(code);
        expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
      }
    }
  );

  test(
    'PHARMA-254 | Should NOT update asset with invalid auth tokens',
    {
      tag: ['@api', '@admin', '@negative', '@pharma-254'],
    },
    async ({ api, invalidAuth }) => {
      const updateAssetInvalidAuthRes = await safeGraphQL(api, {
        query: UPDATE_ASSET_MUTATION,
        variables: UPDATE_ASSET_INPUT,
        headers: invalidAuth,
      });

      expect(updateAssetInvalidAuthRes.ok).toBe(false);
      expect(updateAssetInvalidAuthRes.httpOk).toBe(false);
      expect(NOAUTH_HTTP_STATUSES).toContain(updateAssetInvalidAuthRes.httpStatus);
    }
  );
});
