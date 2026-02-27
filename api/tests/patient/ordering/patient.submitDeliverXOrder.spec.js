import { test, expect } from '../../../globalConfig.api.js';
import { declineOrderAsPharmacist } from '../../../helpers/orderHelpers.js';
import { SUBMIT_DELIVERX_ORDER_QUERY } from './patient.orderingQueries.js';
import { buildPatientDeliverXOrderInput } from './patient.testData.js';
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

test.describe('GraphQL: Submit DeliverX Order', () => {
  test(
    'PHARMA-101 | Should be able to submit a DeliverX order',
    {
      tag: ['@api', '@patient', '@positive', '@pharma-101'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAndGetTokens(api, {
        username: process.env.PATIENT_USER_USERNAME,
        password: process.env.PATIENT_USER_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Patient login failed').toBe(true);

      const orderDetails = buildPatientDeliverXOrderInput();
      console.log('Order Details Input:', orderDetails);
      const submitDeliverXRes = await safeGraphQL(api, {
        query: SUBMIT_DELIVERX_ORDER_QUERY,
        variables: { order: orderDetails },
        headers: bearer(accessToken),
      });

      // Main Assertion
      expect(submitDeliverXRes.ok, submitDeliverXRes.error || 'Submit DeliverX Order request failed').toBe(true);

      const node = submitDeliverXRes.body.data.patient.order.book;
      expect(node).toBeTruthy();
      expect(typeof node.id).toBe('string');
      expect(typeof node.trackingCode).toBe('string');
      expect(node.status).toBe('NEW_ORDER');

      const orderId = node.id;
      await declineOrderAsPharmacist(api, orderId);
    }
  );

  test(
    'PHARMA-102 | Should NOT be able to submit a DeliverX order with No authentication',
    {
      tag: ['@api', '@patient', '@negative', '@pharma-102'],
    },
    async ({ api, noAuth }) => {
      const submitDeliverXResNoAuth = await safeGraphQL(api, {
        query: SUBMIT_DELIVERX_ORDER_QUERY,
        variables: { order: buildPatientDeliverXOrderInput() },
        headers: noAuth,
      });

      // Main Assertion
      expect(
        submitDeliverXResNoAuth.ok,
        submitDeliverXResNoAuth.error || 'Submit DeliverX Order No Auth request did not fail as expected'
      ).toBe(false);

      const { message, classification, code } = getGQLError(submitDeliverXResNoAuth);
      expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
      expect(NOAUTH_CLASSIFICATIONS).toContain(classification);
      expect(NOAUTH_CODES).toContain(code);
    }
  );

  test(
    'PHARMA-103 | Should NOT be able to submit a DeliverX order with invalid authentication',
    {
      tag: ['@api', '@patient', '@negative', '@pharma-103'],
    },
    async ({ api, invalidAuth }) => {
      const submitDeliverXResInvalidAuth = await safeGraphQL(api, {
        query: SUBMIT_DELIVERX_ORDER_QUERY,
        variables: { order: buildPatientDeliverXOrderInput() },
        headers: invalidAuth,
      });

      // Main Assertion
      expect(
        submitDeliverXResInvalidAuth.ok,
        submitDeliverXResInvalidAuth.error || 'Submit DeliverX Order Invalid Auth request did not fail as expected'
      ).toBe(false);

      // Transport-level 401 (no GraphQL errors[])
      expect(submitDeliverXResInvalidAuth.ok).toBe(false);
      expect(submitDeliverXResInvalidAuth.httpOk).toBe(false);
      expect(NOAUTH_HTTP_STATUSES).toContain(submitDeliverXResInvalidAuth.httpStatus);
    }
  );
});
