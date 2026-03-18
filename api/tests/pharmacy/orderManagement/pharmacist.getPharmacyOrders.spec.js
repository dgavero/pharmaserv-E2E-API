import { loginAsPharmacistAndGetTokens } from '../../../helpers/auth.js';
import { safeGraphQL, bearer } from '../../../helpers/graphqlUtils.js';
import { test, expect } from '../../../globalConfig.api.js';
import { getPharmacistCredentials } from '../../../helpers/roleCredentials.js';
import { GET_PHARMACY_ORDERS_QUERY } from './pharmacist.orderManagementQueries.js';

test.describe('GraphQL: Pharmacy Get DeliverX Order', () => {
  test(
    'PHARMA-169 | Should be able to get DeliverX Order',
    {
      tag: ['@api', '@pharmacist', '@positive', '@pharma-169'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsPharmacistAndGetTokens(api, getPharmacistCredentials('reg01'));
      expect(loginRes.ok, loginRes.error || 'Pharmacist login failed').toBe(true);

      const getDeliverXOrderRes = await safeGraphQL(api, {
        query: GET_PHARMACY_ORDERS_QUERY,
        variables: {
          type: 'DELIVER_X',
        },
        headers: bearer(accessToken),
      });

      expect(getDeliverXOrderRes.ok, getDeliverXOrderRes.error || 'Get DeliverX Orders Failed').toBe(true);
    }
  );

  test(
    'PHARMA-170 | Should be able to get Find My Meds Order ',
    {
      tag: ['@api', '@pharmacist', '@positive', '@pharma-170'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsPharmacistAndGetTokens(api, getPharmacistCredentials('pse01'));
      expect(loginRes.ok, loginRes.error || 'Pharmacist login failed').toBe(true);

      const getFindMyMedsOrderRes = await safeGraphQL(api, {
        query: GET_PHARMACY_ORDERS_QUERY,
        variables: {
          type: 'FIND_MY_MEDS',
        },
        headers: bearer(accessToken),
      });

      expect(getFindMyMedsOrderRes.ok, getFindMyMedsOrderRes.error || 'Get Find My Meds Orders Failed').toBe(true);
    }
  );

  test(
    'PHARMA-171 | Should be able to get Pabili Order ',
    {
      tag: ['@api', '@pharmacist', '@positive', '@pharma-171'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsPharmacistAndGetTokens(api, getPharmacistCredentials('pse01'));
      expect(loginRes.ok, loginRes.error || 'Pharmacist login failed').toBe(true);

      const getPabiliOrderRes = await safeGraphQL(api, {
        query: GET_PHARMACY_ORDERS_QUERY,
        variables: {
          type: 'PABILI',
        },
        headers: bearer(accessToken),
      });

      expect(getPabiliOrderRes.ok, getPabiliOrderRes.error || 'Get Pabili Orders Failed').toBe(true);
    }
  );
});
