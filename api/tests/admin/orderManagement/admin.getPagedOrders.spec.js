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
import { GET_PAGED_ORDERS_QUERY } from './admin.orderManagementQueries.js';

function buildPagedOrdersFilter() {
  return {
    pageSize: 100,
    page: 1,
    startDate: '2025-01-01',
    endDate: '2026-12-31',
    ascending: false,
  };
}

test.describe('GraphQL: Admin Get Paged Orders', () => {
  test(
    'PHARMA-261 | Should get paged orders with valid auth tokens',
    {
      tag: ['@api', '@admin', '@positive', '@pharma-261'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await adminLoginAndGetTokens(api, {
        username: process.env.ADMIN_USERNAME,
        password: process.env.ADMIN_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Admin login failed').toBe(true);

      const filterInput = buildPagedOrdersFilter();

      const getPagedOrdersRes = await safeGraphQL(api, {
        query: GET_PAGED_ORDERS_QUERY,
        variables: { filter: filterInput },
        headers: bearer(accessToken),
      });

      expect(getPagedOrdersRes.ok, getPagedOrdersRes.error || 'Get paged orders endpoint failed').toBe(
        true
      );
    }
  );

  test(
    'PHARMA-262 | Should NOT get paged orders with missing auth tokens',
    {
      tag: ['@api', '@admin', '@negative', '@pharma-262'],
    },
    async ({ api, noAuth }) => {
      const filterInput = buildPagedOrdersFilter();

      const getPagedOrdersNoAuthRes = await safeGraphQL(api, {
        query: GET_PAGED_ORDERS_QUERY,
        variables: { filter: filterInput },
        headers: noAuth,
      });

      expect(
        getPagedOrdersNoAuthRes.ok,
        getPagedOrdersNoAuthRes.error || 'Expected UNAUTHORIZED when missing token'
      ).toBe(false);

      if (!getPagedOrdersNoAuthRes.httpOk) {
        expect(NOAUTH_HTTP_STATUSES).toContain(getPagedOrdersNoAuthRes.httpStatus);
      } else {
        const { message, code, classification } = getGQLError(getPagedOrdersNoAuthRes);
        expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
        expect.soft(NOAUTH_CODES).toContain(code);
        expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
      }
    }
  );

  test(
    'PHARMA-263 | Should NOT get paged orders with invalid auth tokens',
    {
      tag: ['@api', '@admin', '@negative', '@pharma-263'],
    },
    async ({ api, invalidAuth }) => {
      const filterInput = buildPagedOrdersFilter();

      const getPagedOrdersInvalidAuthRes = await safeGraphQL(api, {
        query: GET_PAGED_ORDERS_QUERY,
        variables: { filter: filterInput },
        headers: invalidAuth,
      });

      expect(getPagedOrdersInvalidAuthRes.ok).toBe(false);
      expect(getPagedOrdersInvalidAuthRes.httpOk).toBe(false);
      expect(NOAUTH_HTTP_STATUSES).toContain(getPagedOrdersInvalidAuthRes.httpStatus);
    }
  );
});
