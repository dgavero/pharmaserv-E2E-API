import { randomAlphanumeric, randomNum } from '../../../../helpers/globalTestUtils.js';
import { test, expect } from '../../../globalConfig.api.js';
import { GET_ORDER_QUERY } from './patient.orderingQueries.js';
import {
  safeGraphQL,
  bearer,
  loginAndGetTokens,
  getGQLError,
  NOAUTH_MESSAGE_PATTERN,
  NOAUTH_CLASSIFICATIONS,
  NOAUTH_CODES,
  NOAUTH_HTTP_STATUSES,
} from '../../../helpers/testUtilsAPI.js';

const orderID = 87; // Existing Order of logged in user
const nameUser = process.env.USER_USERNAME;
const wordPass = process.env.USER_PASSWORD;
const userId = 1; // ID of logged in user

test.describe('GraphQL: Patient Get Order', () => {
  test(
    'PHARMA-113 | Should be able to Get Order Detail',
    {
      tag: ['@api', '@patient', '@positive', '@pharma-113'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAndGetTokens(api, {
        username: nameUser,
        password: wordPass,
      });
      expect(loginRes.ok, loginRes.error || 'Patient login failed').toBe(true);

      const getOrderRes = await safeGraphQL(api, {
        query: GET_ORDER_QUERY,
        variables: { orderId: orderID },
        headers: bearer(accessToken),
      });

      // Main Assertion
      expect(getOrderRes.ok, getOrderRes.error || 'Get Order request failed').toBe(true);

      const node = getOrderRes.body.data.patient.order.patient;
      expect(node).toBeTruthy();
      expect(node.id).toBe(userId.toString());
      expect(typeof node.firstName).toBe('string');
    }
  );

  test(
    'PHARMA-114 | Should NOT be able to Get Order Detail without No Auth',
    {
      tag: ['@api', '@patient', '@negative', '@pharma-114'],
    },
    async ({ api, noAuth }) => {
      const getOrderResNoAuth = await safeGraphQL(api, {
        query: GET_ORDER_QUERY,
        variables: { orderId: orderID },
        headers: noAuth,
      });

      // Main Assertion
      expect(
        getOrderResNoAuth.ok,
        getOrderResNoAuth.error || 'Get Order No Auth request did not fail as expected'
      ).toBe(false);

      const { message, classification, code } = getGQLError(getOrderResNoAuth);
      expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
      expect(NOAUTH_CLASSIFICATIONS).toContain(classification);
      expect(NOAUTH_CODES).toContain(code);
    }
  );

  test(
    'PHARMA-115 | Should NOT be able to Get Order Detail with invalid Auth',
    {
      tag: ['@api', '@patient', '@negative', '@pharma-115'],
    },
    async ({ api, invalidAuth }) => {
      const getOrderResInvalidAuth = await safeGraphQL(api, {
        query: GET_ORDER_QUERY,
        variables: { orderId: orderID },
        headers: invalidAuth,
      });

      // Main Assertion
      expect(
        getOrderResInvalidAuth.ok,
        getOrderResInvalidAuth.error || 'Get Order Invalid Auth request did not fail as expected'
      ).toBe(false);

      // Transport-level 401 (no GraphQL errors[])
      expect(getOrderResInvalidAuth.ok).toBe(false);
      expect(getOrderResInvalidAuth.httpOk).toBe(false);
      expect(NOAUTH_HTTP_STATUSES).toContain(getOrderResInvalidAuth.httpStatus);
    }
  );
});
