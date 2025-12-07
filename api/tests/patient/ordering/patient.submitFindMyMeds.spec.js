import { randomAlphanumeric, randomNum } from '../../../../helpers/globalTestUtils.js';
import { test, expect } from '../../../globalConfig.api.js';
import { SUBMIT_FINDMYMEDS_ORDER_QUERY } from './patient.orderingQueries.js';
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
    deliveryType: 'FIND_MY_MEDS',
    patientId: process.env.USER_USERNAME_PATIENT_ID,
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

test.describe('GraphQL: Submit FindMyMeds Order', () => {
  test(
    'PHARMA-107 | Should be able to submit a FindMyMeds order',
    {
      tag: ['@api', '@patient', '@positive', '@pharma-107'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAndGetTokens(api, {
        username: process.env.USER_USERNAME,
        password: process.env.USER_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Patient login failed').toBe(true);

      const orderDetails = orderDetailsInput();
      console.log('Order Details Input:', orderDetails);
      const submitFindMyMedsRes = await safeGraphQL(api, {
        query: SUBMIT_FINDMYMEDS_ORDER_QUERY,
        variables: { order: orderDetails },
        headers: bearer(accessToken),
      });

      // Main Assertion
      expect(
        submitFindMyMedsRes.ok,
        submitFindMyMedsRes.error || 'Submit FindMyMeds Order request failed'
      ).toBe(true);

      const node = submitFindMyMedsRes.body.data.patient.order.book;
      expect(node).toBeTruthy();
      expect(typeof node.id).toBe('string');
      expect(typeof node.patient.firstName).toBe('string');
      expect(typeof node.patient.lastName).toBe('string');
    }
  );

  test(
    'PHARMA-108 | Should NOT be able to submit a FindMyMeds order with No authentication',
    {
      tag: ['@api', '@patient', '@negative', '@pharma-108'],
    },
    async ({ api, noAuth }) => {
      const submitFindMyMedsResNoAuth = await safeGraphQL(api, {
        query: SUBMIT_FINDMYMEDS_ORDER_QUERY,
        variables: { order: orderDetailsInput() },
        headers: noAuth,
      });

      // Main Assertion
      expect(
        submitFindMyMedsResNoAuth.ok,
        submitFindMyMedsResNoAuth.error ||
          'Submit FindMyMeds Order No Auth request did not fail as expected'
      ).toBe(false);

      const { message, classification, code } = getGQLError(submitFindMyMedsResNoAuth);
      expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
      expect(NOAUTH_CLASSIFICATIONS).toContain(classification);
      expect(NOAUTH_CODES).toContain(code);
    }
  );

  test(
    'PHARMA-109 | Should NOT be able to submit a FindMyMeds order with invalid authentication',
    {
      tag: ['@api', '@patient', '@negative', '@pharma-109'],
    },
    async ({ api, invalidAuth }) => {
      const submitFindMyMedsResInvalidAuth = await safeGraphQL(api, {
        query: SUBMIT_FINDMYMEDS_ORDER_QUERY,
        variables: { order: orderDetailsInput() },
        headers: invalidAuth,
      });

      // Main Assertion
      expect(
        submitFindMyMedsResInvalidAuth.ok,
        submitFindMyMedsResInvalidAuth.error ||
          'Submit FindMyMeds Order Invalid Auth request did not fail as expected'
      ).toBe(false);

      // Transport-level 401 (no GraphQL errors[])
      expect(submitFindMyMedsResInvalidAuth.ok).toBe(false);
      expect(submitFindMyMedsResInvalidAuth.httpOk).toBe(false);
      expect(NOAUTH_HTTP_STATUSES).toContain(submitFindMyMedsResInvalidAuth.httpStatus);
    }
  );
});
