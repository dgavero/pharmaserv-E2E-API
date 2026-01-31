import { test, expect } from '../../../globalConfig.api.js';
import { GET_DISCOUNT_CARD_BY_ID_QUERY } from '../orderManagement/pharmacist.orderManagementQueries.js';
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

test.describe('GraphQL: Pharmacy Get Discount Card', () => {
  test(
    'PHARMA-177 | Should be able to get Discount Card',
    {
      tag: ['@api', '@pharmacist', '@positive', '@pharma-177'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await pharmacistLoginAndGetTokens(api, {
        username: process.env.PHARMACIST_USERNAME_REG01,
        password: process.env.PHARMACIST_PASSWORD_REG01,
      });
      expect(loginRes.ok, loginRes.error || 'Pharmacist login failed').toBe(true);

      const getDiscountCardRes = await safeGraphQL(api, {
        query: GET_DISCOUNT_CARD_BY_ID_QUERY,
        variables: {
          discountCardId: 1,
        },
        headers: bearer(accessToken),
      });

      expect(getDiscountCardRes.ok, getDiscountCardRes.error || 'Get Discount Card failed').toBe(true);
    }
  );
});
