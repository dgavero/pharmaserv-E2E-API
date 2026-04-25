import { loginAsPharmacistAndGetTokens } from '../../../helpers/auth.js';
import { safeGraphQL, bearer } from '../../../helpers/graphqlUtils.js';
import { test, expect } from '../../../globalConfig.api.js';
import { getPharmacistCredentials } from '../../../helpers/roleCredentials.js';
import { GET_DISCOUNT_CARD_BY_ID_QUERY } from './pharmacist.orderManagementQueries.js';

test.describe('GraphQL: Pharmacy Get Discount Card', () => {
  test(
    'PHARMA-177 | Should be able to get Discount Card',
    {
      tag: ['@api', '@pharmacist', '@positive', '@pharma-177'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsPharmacistAndGetTokens(api, getPharmacistCredentials('reg01'));
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

  test(
    'PHARMA-541 | Get discount card should satisfy response contract shape',
    {
      tag: ['@api', '@pharmacist', '@positive', '@pharma-541'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsPharmacistAndGetTokens(api, getPharmacistCredentials('reg01'));
      expect(loginRes.ok, loginRes.error || 'Pharmacist login failed').toBe(true);

      const getDiscountCardRes = await safeGraphQL(api, {
        query: GET_DISCOUNT_CARD_BY_ID_QUERY,
        variables: {
          discountCardId: 1,
        },
        headers: bearer(accessToken),
      });

      expect(getDiscountCardRes.httpStatus).toBe(200);
      expect(getDiscountCardRes.httpOk).toBe(true);
      expect(getDiscountCardRes.ok, getDiscountCardRes.error || 'Get Discount Card failed').toBe(true);

      const node = getDiscountCardRes.body?.data?.pharmacy?.discountCard;
      expect(node, 'Missing data.pharmacy.discountCard').toBeTruthy();
      expect.soft(typeof node?.id).toBe('string');
      expect.soft(typeof node?.cardType).toBe('string');
      expect.soft(typeof node?.name).toBe('string');
      expect.soft(typeof node?.cardNumber).toBe('string');
    }
  );
});
