import { test, expect } from '../../../globalConfig.api.js';
import { GET_ORDER_BY_ID_QUERY } from '../orderManagement/pharmacist.orderManagementQueries.js';
import {
  safeGraphQL,
  bearer,
  adminLoginAndGetTokens,
  getGQLError,
  NOAUTH_MESSAGE_PATTERN,
  NOAUTH_CLASSIFICATIONS,
  NOAUTH_CODES,
  NOAUTH_HTTP_STATUSES,
  pharmacistLoginAndGetTokens,
} from '../../../helpers/testUtilsAPI.js';

test.describe('GraphQL: Pharmacy Get Order By ID', () => {
  test(
    'PHARMA-172 | Should be able to get Order by ID if order is under the branch',
    {
      tag: ['@api', '@pharmacist', '@positive', '@pharma-172'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await pharmacistLoginAndGetTokens(api, {
        username: process.env.PHARMACIST_USERNAME,
        password: process.env.PHARMACIST_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Pharmacist login failed').toBe(true);

      const getOrderByIdRes = await safeGraphQL(api, {
        query: GET_ORDER_BY_ID_QUERY,
        variables: {
          orderId: process.env.PHARMACIST_REUSABLE_ORDERID,
        },
        headers: bearer(accessToken),
      });

      expect(getOrderByIdRes.ok, getOrderByIdRes.error || 'Get order by ID failed').toBe(true);
    }
  );

  test(
    'PHARMA-173 | Should NOT be able to get Order by ID if order is NOT UNDER the branch',
    {
      tag: ['@api', '@pharmacist', '@negative', '@pharma-173'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await pharmacistLoginAndGetTokens(api, {
        username: process.env.PHARMACIST_USERNAME,
        password: process.env.PHARMACIST_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Pharmacist login failed').toBe(true);

      const getOrderByIdRes = await safeGraphQL(api, {
        query: GET_ORDER_BY_ID_QUERY,
        variables: {
          orderId: 1, // order not under branch
        },
        headers: bearer(accessToken),
      });

      expect(
        getOrderByIdRes.ok,
        getOrderByIdRes.error || 'Get order by ID is expected to fail on order:1'
      ).toBe(false);
    }
  );
});
