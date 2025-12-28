import { test, expect } from '../../../globalConfig.api.js';
import { ACCEPT_ORDER_QUERY } from '../orderManagement/pharmacist.orderManagementQueries.js';
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

test.describe('GraphQL: Pharmacy Accept Order', () => {
  test(
    'PHARMA-175 | Should NOT be able Accept already accepted Order',
    {
      tag: ['@api', '@pharmacist', '@negative', '@pharma-175'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await pharmacistLoginAndGetTokens(api, {
        username: process.env.PHARMACIST_USERNAME,
        password: process.env.PHARMACIST_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Pharmacist login failed').toBe(true);

      const acceptOrderRes = await safeGraphQL(api, {
        query: ACCEPT_ORDER_QUERY,
        variables: {
          orderId: process.env.PHARMACIST_REUSABLE_ORDERID, // Already accepted orderId
        },
        headers: bearer(accessToken),
      });

      expect(acceptOrderRes.ok, acceptOrderRes.error || 'Expected Accept Order to Fail').toBe(
        false
      );
    }
  );
});
