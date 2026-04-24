import { loginAsPatientAndGetTokens, NOAUTH_MESSAGE_PATTERN, NOAUTH_CLASSIFICATIONS, NOAUTH_CODES, NOAUTH_HTTP_STATUSES } from '../../../helpers/auth.js';
import { safeGraphQL, bearer, getGQLError } from '../../../helpers/graphqlUtils.js';
import { test, expect } from '../../../globalConfig.api.js';
import { getPatientCredentials } from '../../../helpers/roleCredentials.js';
import { randomAlphanumeric } from '../../../../helpers/globalTestUtils.js';
import { SUBMIT_FINDMYMEDS_ORDER_QUERY } from './patient.orderingQueries.js';
import { buildPatientFindMyMedsOrderInput } from './patient.testData.js';
import { loginPharmacist, declineOrderAsPharmacist } from '../../e2e/shared/steps/pharmacist.steps.js';

async function declineSubmittedOrder(api, orderId) {
  const { pharmacistAccessToken } = await loginPharmacist(api, { accountKey: 'pse01' });
  await declineOrderAsPharmacist(api, {
    pharmacistAccessToken,
    orderId,
    reason: 'Order is declined via API automated test (FindMyMeds)',
  });
}

test.describe('GraphQL: Submit FindMyMeds Order', () => {
  test(
    'PHARMA-107 | Should be able to submit a FindMyMeds order',
    {
      tag: ['@api', '@patient', '@positive', '@pharma-107'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsPatientAndGetTokens(api, getPatientCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Patient login failed').toBe(true);

      const orderDetails = buildPatientFindMyMedsOrderInput();
      console.log('Order Details Input:', orderDetails);
      const submitFindMyMedsRes = await safeGraphQL(api, {
        query: SUBMIT_FINDMYMEDS_ORDER_QUERY,
        variables: { order: orderDetails },
        headers: bearer(accessToken),
      });

      // Main Assertion
      expect(submitFindMyMedsRes.ok, submitFindMyMedsRes.error || 'Submit FindMyMeds Order request failed').toBe(true);

      const node = submitFindMyMedsRes.body.data.patient.order.book;
      expect(node).toBeTruthy();
      expect(typeof node.id).toBe('string');
      expect(typeof node.patient.firstName).toBe('string');
      expect(typeof node.patient.lastName).toBe('string');

      const orderId = node.id;
      await declineSubmittedOrder(api, orderId);
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
        variables: { order: buildPatientFindMyMedsOrderInput() },
        headers: noAuth,
      });

      // Main Assertion
      expect(
        submitFindMyMedsResNoAuth.ok,
        submitFindMyMedsResNoAuth.error || 'Submit FindMyMeds Order No Auth request did not fail as expected'
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
        variables: { order: buildPatientFindMyMedsOrderInput() },
        headers: invalidAuth,
      });

      // Main Assertion
      expect(
        submitFindMyMedsResInvalidAuth.ok,
        submitFindMyMedsResInvalidAuth.error || 'Submit FindMyMeds Order Invalid Auth request did not fail as expected'
      ).toBe(false);

      // Transport-level 401 (no GraphQL errors[])
      expect(submitFindMyMedsResInvalidAuth.ok).toBe(false);
      expect(submitFindMyMedsResInvalidAuth.httpOk).toBe(false);
      expect(NOAUTH_HTTP_STATUSES).toContain(submitFindMyMedsResInvalidAuth.httpStatus);
    }
  );

  test(
    'PHARMA-504 | Submit FindMyMeds order should satisfy response contract shape',
    {
      tag: ['@api', '@patient', '@positive', '@pharma-504'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsPatientAndGetTokens(api, getPatientCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Patient login failed').toBe(true);

      const submitFindMyMedsRes = await safeGraphQL(api, {
        query: SUBMIT_FINDMYMEDS_ORDER_QUERY,
        variables: { order: buildPatientFindMyMedsOrderInput() },
        headers: bearer(accessToken),
      });

      expect(submitFindMyMedsRes.httpStatus).toBe(200);
      expect(submitFindMyMedsRes.httpOk).toBe(true);
      expect(submitFindMyMedsRes.ok, submitFindMyMedsRes.error || 'Submit FindMyMeds Order request failed').toBe(true);

      const node = submitFindMyMedsRes.body?.data?.patient?.order?.book;
      expect(node, 'Missing data.patient.order.book').toBeTruthy();
      expect.soft(typeof node?.id).toBe('string');
      expect.soft(typeof node?.patient?.firstName).toBe('string');
      expect.soft(typeof node?.patient?.lastName).toBe('string');

      await declineSubmittedOrder(api, node.id);
    }
  );

  test(
    'PHARMA-508 | Should reuse existing FindMyMeds order when Idempotency-Key is reused',
    {
      tag: ['@api', '@patient', '@positive', '@pharma-508'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsPatientAndGetTokens(api, getPatientCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Patient login failed').toBe(true);

      const orderInput = buildPatientFindMyMedsOrderInput();
      const firstIdempotencyKey = `findmymeds-${randomAlphanumeric(16)}`;

      const firstSubmitRes = await safeGraphQL(api, {
        query: SUBMIT_FINDMYMEDS_ORDER_QUERY,
        variables: { order: orderInput },
        headers: { ...bearer(accessToken), 'Idempotency-Key': firstIdempotencyKey },
      });
      expect(firstSubmitRes.ok, firstSubmitRes.error || 'First submit FindMyMeds order call failed').toBe(true);

      const firstNode = firstSubmitRes.body?.data?.patient?.order?.book;
      expect(firstNode, 'Missing first submit FindMyMeds order node').toBeTruthy();
      expect.soft(typeof firstNode.id).toBe('string');

      const secondSubmitRes = await safeGraphQL(api, {
        query: SUBMIT_FINDMYMEDS_ORDER_QUERY,
        variables: { order: orderInput },
        headers: { ...bearer(accessToken), 'Idempotency-Key': firstIdempotencyKey },
      });
      expect(
        secondSubmitRes.ok,
        secondSubmitRes.error || 'Second submit FindMyMeds order call with same key failed'
      ).toBe(true);

      const secondNode = secondSubmitRes.body?.data?.patient?.order?.book;
      expect(secondNode, 'Missing second submit FindMyMeds order node').toBeTruthy();
      expect(secondNode.id).toBe(firstNode.id);

      await declineSubmittedOrder(api, firstNode.id);
    }
  );
});
