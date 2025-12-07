import { randomAlphanumeric, randomNum } from '../../../../helpers/globalTestUtils.js';
import { test, expect } from '../../../globalConfig.api.js';
import { SUBMIT_PABILI_ORDER_QUERY } from './patient.orderingQueries.js';
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

function orderDetailsInput() {
  return {
    deliveryType: 'PABILI',
    patientId: process.env.USER_USERNAME_PATIENT_ID,
    branchId: 1,
    prescriptionItems: [
      {
        medicineId: 1,
        quantity: 2,
        source: 'SEARCH',
        specialInstructions: null,
      },
      {
        medicineId: 2,
        quantity: 2,
        source: 'SEARCH',
        specialInstructions: null,
      },
    ],
    addressName: 'Home',
    address: 'Unit 243 Baranca Bldg, Mandaluyong Housing',
    lat: 14.582019317323562,
    lng: 121.01251092551259,
  };
}

test.describe('GraphQL: Submit Pabili Order', () => {
  test(
    'PHARMA-104 | Should be able to submit a Pabili order',
    {
      tag: ['@api', '@patient', '@positive', '@pharma-104'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAndGetTokens(api, {
        username: process.env.USER_USERNAME,
        password: process.env.USER_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Patient login failed').toBe(true);

      const pabiliOrderRes = await safeGraphQL(api, {
        query: SUBMIT_PABILI_ORDER_QUERY,
        variables: { order: orderDetailsInput() },
        headers: bearer(accessToken),
      });

      // Main Assertions
      expect(pabiliOrderRes.ok, pabiliOrderRes.error || 'Submit Pabili Order request failed').toBe(
        true
      );

      const node = pabiliOrderRes.body.data.patient.order.book;
      expect(node).toBeTruthy();
      expect(typeof node.id).toBe('string');
      expect(typeof node.code).toBe('string');
      expect(typeof node.trackingCode).toBe('string');
      expect(node.status).toBe('NEW_ORDER');
    }
  );

  test(
    'PHARMA-105 | Should NOT be able to submit a Pabili order with No Auth',
    {
      tag: ['@api', '@patient', '@negative', '@pharma-105'],
    },
    async ({ api, noAuth }) => {
      const pabiliOrderResNoAuth = await safeGraphQL(api, {
        query: SUBMIT_PABILI_ORDER_QUERY,
        variables: { order: orderDetailsInput() },
        headers: noAuth,
      });

      // Main Assertions
      expect(
        pabiliOrderResNoAuth.ok,
        pabiliOrderResNoAuth.error || 'Submit Pabili Order request failed'
      ).toBe(false);

      const { message, classification, code } = getGQLError(pabiliOrderResNoAuth);
      expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
      expect(NOAUTH_CLASSIFICATIONS).toContain(classification);
      expect(NOAUTH_CODES).toContain(code);
    }
  );

  test(
    'PHARMA-106 | Should NOT be able to submit a Pabili order with Invalid Auth',
    {
      tag: ['@api', '@patient', '@negative', '@pharma-106'],
    },
    async ({ api, invalidAuth }) => {
      const pabiliOrderResInvalidAuth = await safeGraphQL(api, {
        query: SUBMIT_PABILI_ORDER_QUERY,
        variables: { order: orderDetailsInput() },
        headers: invalidAuth,
      });

      // Main Assertions
      expect(
        pabiliOrderResInvalidAuth.ok,
        pabiliOrderResInvalidAuth.error ||
          'Submit Pabili Order with Invalid Auth request did not fail as expected'
      ).toBe(false);

      // Transport-level 401 (no GraphQL errors[])
      expect(pabiliOrderResInvalidAuth.ok).toBe(false);
      expect(pabiliOrderResInvalidAuth.httpOk).toBe(false);
      expect(NOAUTH_HTTP_STATUSES).toContain(pabiliOrderResInvalidAuth.httpStatus);
    }
  );
});
