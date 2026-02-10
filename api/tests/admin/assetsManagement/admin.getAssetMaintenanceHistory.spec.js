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
import { GET_ASSET_MAINTENANCE_HISTORY_QUERY } from './admin.assetsManagementQueries.js';

test.describe('GraphQL: Admin Get Asset Maintenance History', () => {
  test(
    'PHARMA-255 | Should get asset maintenance history with valid auth tokens',
    {
      tag: ['@api', '@admin', '@positive', '@pharma-255'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await adminLoginAndGetTokens(api, {
        username: process.env.ADMIN_USERNAME,
        password: process.env.ADMIN_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Admin login failed').toBe(true);

      const getAssetMaintenanceHistoryRes = await safeGraphQL(api, {
        query: GET_ASSET_MAINTENANCE_HISTORY_QUERY,
        variables: { assetId: 1 },
        headers: bearer(accessToken),
      });

      expect(
        getAssetMaintenanceHistoryRes.ok,
        getAssetMaintenanceHistoryRes.error || 'Get asset maintenance history endpoint failed'
      ).toBe(true);
    }
  );

  test(
    'PHARMA-256 | Should NOT get asset maintenance history with missing auth tokens',
    {
      tag: ['@api', '@admin', '@negative', '@pharma-256'],
    },
    async ({ api, noAuth }) => {
      const getAssetMaintenanceHistoryNoAuthRes = await safeGraphQL(api, {
        query: GET_ASSET_MAINTENANCE_HISTORY_QUERY,
        variables: { assetId: 1 },
        headers: noAuth,
      });

      expect(
        getAssetMaintenanceHistoryNoAuthRes.ok,
        getAssetMaintenanceHistoryNoAuthRes.error || 'Expected UNAUTHORIZED when missing token'
      ).toBe(false);

      if (!getAssetMaintenanceHistoryNoAuthRes.httpOk) {
        expect(NOAUTH_HTTP_STATUSES).toContain(getAssetMaintenanceHistoryNoAuthRes.httpStatus);
      } else {
        const { message, code, classification } = getGQLError(getAssetMaintenanceHistoryNoAuthRes);
        expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
        expect.soft(NOAUTH_CODES).toContain(code);
        expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
      }
    }
  );

  test(
    'PHARMA-257 | Should NOT get asset maintenance history with invalid auth tokens',
    {
      tag: ['@api', '@admin', '@negative', '@pharma-257'],
    },
    async ({ api, invalidAuth }) => {
      const getAssetMaintenanceHistoryInvalidAuthRes = await safeGraphQL(api, {
        query: GET_ASSET_MAINTENANCE_HISTORY_QUERY,
        variables: { assetId: 1 },
        headers: invalidAuth,
      });

      expect(getAssetMaintenanceHistoryInvalidAuthRes.ok).toBe(false);
      expect(getAssetMaintenanceHistoryInvalidAuthRes.httpOk).toBe(false);
      expect(NOAUTH_HTTP_STATUSES).toContain(getAssetMaintenanceHistoryInvalidAuthRes.httpStatus);
    }
  );
});
