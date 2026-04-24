import { loginAsPatientAndGetTokens, NOAUTH_MESSAGE_PATTERN, NOAUTH_CLASSIFICATIONS, NOAUTH_CODES, NOAUTH_HTTP_STATUSES } from '../../../helpers/auth.js';
import { safeGraphQL, bearer, getGQLError } from '../../../helpers/graphqlUtils.js';
import { test, expect } from '../../../globalConfig.api.js';
import { getPatientCredentials } from '../../../helpers/roleCredentials.js';
import { randomAlphanumeric } from '../../../../helpers/globalTestUtils.js';
import { SUBMIT_DELIVERX_ORDER_QUERY } from './patient.orderingQueries.js';
import { buildPatientDeliverXOrderInput } from './patient.testData.js';
import { loginPharmacist, declineOrderAsPharmacist } from '../../e2e/shared/steps/pharmacist.steps.js';

async function declineSubmittedOrder(api, orderId) {
  const { pharmacistAccessToken } = await loginPharmacist(api, { accountKey: 'reg01' });
  await declineOrderAsPharmacist(api, {
    pharmacistAccessToken,
    orderId,
    reason: 'Order is declined via API automated test (DeliverX)',
  });
}

test.describe('GraphQL: Submit DeliverX Order', () => {
  test(
    'PHARMA-101 | Should be able to submit a DeliverX order',
    {
      tag: ['@api', '@patient', '@positive', '@pharma-101', '@smoke'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsPatientAndGetTokens(api, getPatientCredentials('default'));
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
      await declineSubmittedOrder(api, orderId);
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

  test(
    'PHARMA-503 | Submit DeliverX order should satisfy response contract shape',
    {
      tag: ['@api', '@patient', '@positive', '@pharma-503'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsPatientAndGetTokens(api, getPatientCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Patient login failed').toBe(true);

      const submitDeliverXRes = await safeGraphQL(api, {
        query: SUBMIT_DELIVERX_ORDER_QUERY,
        variables: { order: buildPatientDeliverXOrderInput() },
        headers: bearer(accessToken),
      });

      expect(submitDeliverXRes.httpStatus).toBe(200);
      expect(submitDeliverXRes.httpOk).toBe(true);
      expect(submitDeliverXRes.ok, submitDeliverXRes.error || 'Submit DeliverX Order request failed').toBe(true);

      const node = submitDeliverXRes.body?.data?.patient?.order?.book;
      expect(node, 'Missing data.patient.order.book').toBeTruthy();
      expect.soft(typeof node?.id).toBe('string');
      expect.soft(typeof node?.trackingCode).toBe('string');
      expect.soft(typeof node?.status).toBe('string');
      expect.soft(node?.status).toBe('NEW_ORDER');

      await declineSubmittedOrder(api, node.id);
    }
  );

  test(
    'PHARMA-507 | Should reuse existing DeliverX order when Idempotency-Key is reused',
    {
      tag: ['@api', '@patient', '@positive', '@pharma-507'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsPatientAndGetTokens(api, getPatientCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Patient login failed').toBe(true);

      const orderInput = buildPatientDeliverXOrderInput();
      const firstIdempotencyKey = `deliverx-${randomAlphanumeric(16)}`;

      const firstSubmitRes = await safeGraphQL(api, {
        query: SUBMIT_DELIVERX_ORDER_QUERY,
        variables: { order: orderInput },
        headers: { ...bearer(accessToken), 'Idempotency-Key': firstIdempotencyKey },
      });
      expect(firstSubmitRes.ok, firstSubmitRes.error || 'First submit DeliverX order call failed').toBe(true);

      const firstNode = firstSubmitRes.body?.data?.patient?.order?.book;
      expect(firstNode, 'Missing first submit DeliverX order node').toBeTruthy();
      expect.soft(typeof firstNode.id).toBe('string');

      const secondSubmitRes = await safeGraphQL(api, {
        query: SUBMIT_DELIVERX_ORDER_QUERY,
        variables: { order: orderInput },
        headers: { ...bearer(accessToken), 'Idempotency-Key': firstIdempotencyKey },
      });
      expect(secondSubmitRes.ok, secondSubmitRes.error || 'Second submit DeliverX order call with same key failed').toBe(
        true
      );

      const secondNode = secondSubmitRes.body?.data?.patient?.order?.book;
      expect(secondNode, 'Missing second submit DeliverX order node').toBeTruthy();
      expect(secondNode.id).toBe(firstNode.id);

      await declineSubmittedOrder(api, firstNode.id);
    }
  );
});
