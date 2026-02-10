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
import { GET_PAGED_ASSETS_QUERY } from './admin.assetsManagementQueries.js';

function buildPagedAssetsFilter() {
  return {
    pageSize: 100,
    page: 1,
    startDate: '2025-01-01',
    endDate: '2025-12-31',
    ascending: false,
  };
}

test.describe('GraphQL: Admin Get Paged Assets', () => {
  test(
    'PHARMA-249 | Should get paged assets with valid auth tokens',
    {
      tag: ['@api', '@admin', '@positive', '@pharma-249'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await adminLoginAndGetTokens(api, {
        username: process.env.ADMIN_USERNAME,
        password: process.env.ADMIN_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Admin login failed').toBe(true);

      const filterInput = buildPagedAssetsFilter();

      const getPagedAssetsRes = await safeGraphQL(api, {
        query: GET_PAGED_ASSETS_QUERY,
        variables: { filter: filterInput },
        headers: bearer(accessToken),
      });

      expect(getPagedAssetsRes.ok, getPagedAssetsRes.error || 'Get paged assets endpoint failed').toBe(
        true
      );
    }
  );

  test(
    'PHARMA-250 | Should NOT get paged assets with missing auth tokens',
    {
      tag: ['@api', '@admin', '@negative', '@pharma-250'],
    },
    async ({ api, noAuth }) => {
      const filterInput = buildPagedAssetsFilter();

      const getPagedAssetsNoAuthRes = await safeGraphQL(api, {
        query: GET_PAGED_ASSETS_QUERY,
        variables: { filter: filterInput },
        headers: noAuth,
      });

      expect(
        getPagedAssetsNoAuthRes.ok,
        getPagedAssetsNoAuthRes.error || 'Expected UNAUTHORIZED when missing token'
      ).toBe(false);

      if (!getPagedAssetsNoAuthRes.httpOk) {
        expect(NOAUTH_HTTP_STATUSES).toContain(getPagedAssetsNoAuthRes.httpStatus);
      } else {
        const { message, code, classification } = getGQLError(getPagedAssetsNoAuthRes);
        expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
        expect.soft(NOAUTH_CODES).toContain(code);
        expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
      }
    }
  );

  test(
    'PHARMA-251 | Should NOT get paged assets with invalid auth tokens',
    {
      tag: ['@api', '@admin', '@negative', '@pharma-251'],
    },
    async ({ api, invalidAuth }) => {
      const filterInput = buildPagedAssetsFilter();

      const getPagedAssetsInvalidAuthRes = await safeGraphQL(api, {
        query: GET_PAGED_ASSETS_QUERY,
        variables: { filter: filterInput },
        headers: invalidAuth,
      });

      expect(getPagedAssetsInvalidAuthRes.ok).toBe(false);
      expect(getPagedAssetsInvalidAuthRes.httpOk).toBe(false);
      expect(NOAUTH_HTTP_STATUSES).toContain(getPagedAssetsInvalidAuthRes.httpStatus);
    }
  );
});
