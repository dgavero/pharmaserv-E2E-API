import { loginAsPatientAndGetTokens, NOAUTH_MESSAGE_PATTERN, NOAUTH_CLASSIFICATIONS, NOAUTH_CODES, NOAUTH_HTTP_STATUSES } from '../../../helpers/auth.js';
import { safeGraphQL, bearer, getGQLError } from '../../../helpers/graphqlUtils.js';
import { test, expect } from '../../../globalConfig.api.js';
import { getPatientCredentials } from '../../../helpers/roleCredentials.js';
import { randomAlphanumeric } from '../../../../helpers/globalTestUtils.js';
import { SUBMIT_PABILI_ORDER_QUERY } from './patient.orderingQueries.js';
import { buildPatientPabiliOrderInput } from './patient.testData.js';
import { loginPharmacist, declineOrderAsPharmacist } from '../../e2e/shared/steps/pharmacist.steps.js';

async function declineSubmittedOrder(api, orderId) {
  const { pharmacistAccessToken } = await loginPharmacist(api, { accountKey: 'pse01' });
  await declineOrderAsPharmacist(api, {
    pharmacistAccessToken,
    orderId,
    reason: 'Order is declined via API automated test (Pabili)',
  });
}

test.describe('GraphQL: Submit Pabili Order', () => {
  test(
    'PHARMA-104 | Should be able to submit a Pabili order',
    {
      tag: ['@api', '@patient', '@positive', '@pharma-104'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsPatientAndGetTokens(api, getPatientCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Patient login failed').toBe(true);

      const pabiliOrderRes = await safeGraphQL(api, {
        query: SUBMIT_PABILI_ORDER_QUERY,
        variables: { order: buildPatientPabiliOrderInput() },
        headers: bearer(accessToken),
      });

      // Main Assertions
      expect(pabiliOrderRes.ok, pabiliOrderRes.error || 'Submit Pabili Order request failed').toBe(true);

      const node = pabiliOrderRes.body.data.patient.order.book;
      expect(node).toBeTruthy();
      expect(typeof node.id).toBe('string');
      expect(typeof node.trackingCode).toBe('string');
      expect(node.status).toBe('NEW_ORDER');

      const orderId = node.id;
      await declineSubmittedOrder(api, orderId);
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
        variables: { order: buildPatientPabiliOrderInput() },
        headers: noAuth,
      });

      // Main Assertions
      expect(pabiliOrderResNoAuth.ok, pabiliOrderResNoAuth.error || 'Submit Pabili Order request failed').toBe(false);

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
        variables: { order: buildPatientPabiliOrderInput() },
        headers: invalidAuth,
      });

      // Main Assertions
      expect(
        pabiliOrderResInvalidAuth.ok,
        pabiliOrderResInvalidAuth.error || 'Submit Pabili Order with Invalid Auth request did not fail as expected'
      ).toBe(false);

      // Transport-level 401 (no GraphQL errors[])
      expect(pabiliOrderResInvalidAuth.ok).toBe(false);
      expect(pabiliOrderResInvalidAuth.httpOk).toBe(false);
      expect(NOAUTH_HTTP_STATUSES).toContain(pabiliOrderResInvalidAuth.httpStatus);
    }
  );

  test(
    'PHARMA-505 | Submit Pabili order should satisfy response contract shape',
    {
      tag: ['@api', '@patient', '@positive', '@pharma-505'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsPatientAndGetTokens(api, getPatientCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Patient login failed').toBe(true);

      const pabiliOrderRes = await safeGraphQL(api, {
        query: SUBMIT_PABILI_ORDER_QUERY,
        variables: { order: buildPatientPabiliOrderInput() },
        headers: bearer(accessToken),
      });

      expect(pabiliOrderRes.httpStatus).toBe(200);
      expect(pabiliOrderRes.httpOk).toBe(true);
      expect(pabiliOrderRes.ok, pabiliOrderRes.error || 'Submit Pabili Order request failed').toBe(true);

      const node = pabiliOrderRes.body?.data?.patient?.order?.book;
      expect(node, 'Missing data.patient.order.book').toBeTruthy();
      expect.soft(typeof node?.id).toBe('string');
      expect.soft(typeof node?.trackingCode).toBe('string');
      expect.soft(typeof node?.status).toBe('string');
      expect.soft(node?.status).toBe('NEW_ORDER');

      await declineSubmittedOrder(api, node.id);
    }
  );

  test(
    'PHARMA-509 | Should reuse existing Pabili order when Idempotency-Key is reused',
    {
      tag: ['@api', '@patient', '@positive', '@pharma-509'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsPatientAndGetTokens(api, getPatientCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Patient login failed').toBe(true);

      const orderInput = buildPatientPabiliOrderInput();
      const firstIdempotencyKey = `pabili-${randomAlphanumeric(16)}`;

      const firstSubmitRes = await safeGraphQL(api, {
        query: SUBMIT_PABILI_ORDER_QUERY,
        variables: { order: orderInput },
        headers: { ...bearer(accessToken), 'Idempotency-Key': firstIdempotencyKey },
      });
      expect(firstSubmitRes.ok, firstSubmitRes.error || 'First submit Pabili order call failed').toBe(true);

      const firstNode = firstSubmitRes.body?.data?.patient?.order?.book;
      expect(firstNode, 'Missing first submit Pabili order node').toBeTruthy();
      expect.soft(typeof firstNode.id).toBe('string');

      const secondSubmitRes = await safeGraphQL(api, {
        query: SUBMIT_PABILI_ORDER_QUERY,
        variables: { order: orderInput },
        headers: { ...bearer(accessToken), 'Idempotency-Key': firstIdempotencyKey },
      });
      expect(secondSubmitRes.ok, secondSubmitRes.error || 'Second submit Pabili order call with same key failed').toBe(
        true
      );

      const secondNode = secondSubmitRes.body?.data?.patient?.order?.book;
      expect(secondNode, 'Missing second submit Pabili order node').toBeTruthy();
      expect(secondNode.id).toBe(firstNode.id);

      await declineSubmittedOrder(api, firstNode.id);
    }
  );
});
