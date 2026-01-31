import { test, expect } from '../../../globalConfig.api.js';
import { GET_PHARMACY_ORDERS_QUERY } from './pharmacist.orderManagementQueries.js';
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

test.describe('GraphQL: Pharmacy Get DeliverX Order', () => {
  test(
    'PHARMA-169 | Should be able to get DeliverX Order',
    {
      tag: ['@api', '@pharmacist', '@positive', '@pharma-169'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await pharmacistLoginAndGetTokens(api, {
        username: process.env.PHARMACIST_USERNAME_REG01,
        password: process.env.PHARMACIST_PASSWORD_REG01,
      });
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
      const { accessToken, raw: loginRes } = await pharmacistLoginAndGetTokens(api, {
        username: process.env.PHARMACIST_USERNAME_PSE01,
        password: process.env.PHARMACIST_PASSWORD_PSE01,
      });
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
      const { accessToken, raw: loginRes } = await pharmacistLoginAndGetTokens(api, {
        username: process.env.PHARMACIST_USERNAME_PSE01,
        password: process.env.PHARMACIST_PASSWORD_PSE01,
      });
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
