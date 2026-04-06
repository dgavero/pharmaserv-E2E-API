import { test, expect } from '../../../globalConfig.api.js';
import { randomAlphanumeric } from '../../../../helpers/globalTestUtils.js';
import { getPatientAccount } from '../../../helpers/roleCredentials.js';
import { safeGraphQL, bearer, getGQLError } from '../../../helpers/graphqlUtils.js';
import {
  loginAsPatientAndGetTokens,
  NOAUTH_MESSAGE_PATTERN,
  NOAUTH_CLASSIFICATIONS,
  NOAUTH_CODES,
  NOAUTH_HTTP_STATUSES,
} from '../../../helpers/auth.js';
import {
  CREATE_IDENTIFICATION_CARD_QUERY,
  GET_IDENTIFICATION_CARDS_QUERY,
  UPDATE_IDENTIFICATION_CARD_QUERY,
  REMOVE_IDENTIFICATION_CARD_QUERY,
} from './patient.profileQueries.js';

const defaultPatientAccount = getPatientAccount('default');

function buildCreateIdentificationCardInput() {
  const suffix = randomAlphanumeric(8);
  return {
    patientId: defaultPatientAccount.patientId,
    cardType: 'QA-Automation Card',
    name: `Auto-${suffix}`,
    cardId: `ID-${suffix}`,
    frontPhoto: `id-front-${suffix}.png`,
    backPhoto: `id-back-${suffix}.png`,
  };
}

function buildUpdateIdentificationCardInput() {
  const suffix = randomAlphanumeric(8);
  return {
    patientId: defaultPatientAccount.patientId,
    cardType: 'Discount Card',
    name: `Discount-${suffix}`,
    cardId: `UPD-${suffix}`,
    frontPhoto: `id-updated-front-${suffix}.png`,
    backPhoto: `id-updated-back-${suffix}.png`,
  };
}

async function createIdentificationCardAsPatient(api, accessToken) {
  const identificationCard = buildCreateIdentificationCardInput();
  const createIdentificationCardRes = await safeGraphQL(api, {
    query: CREATE_IDENTIFICATION_CARD_QUERY,
    variables: { identificationCard },
    headers: bearer(accessToken),
  });

  expect(
    createIdentificationCardRes.ok,
    createIdentificationCardRes.error || 'Create Identification Card request failed'
  ).toBe(true);

  const identificationCardNode = createIdentificationCardRes.body?.data?.patient?.identificationCard?.create;
  expect(identificationCardNode, 'Missing data.patient.identificationCard.create').toBeTruthy();

  return { identificationCard, identificationCardNode };
}

test.describe('GraphQL: Patient Identification Card Management', () => {
  test(
    'PHARMA-395 | Should be able to create Identification Card as Patient',
    {
      tag: ['@api', '@patient', '@positive', '@pharma-395'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsPatientAndGetTokens(api, defaultPatientAccount);
      expect(loginRes.ok, loginRes.error || 'Patient login failed').toBe(true);

      const { identificationCard, identificationCardNode } = await createIdentificationCardAsPatient(api, accessToken);

      expect.soft(identificationCardNode.cardType).toBe(identificationCard.cardType);
      expect.soft(identificationCardNode.cardId).toBe(identificationCard.cardId);
      expect.soft(identificationCardNode.frontPhoto).toBe(identificationCard.frontPhoto);
      expect.soft(identificationCardNode.backPhoto).toBe(identificationCard.backPhoto);
    }
  );

  test(
    'PHARMA-396 | Should NOT be able to create Identification Card as Patient without Authentication',
    {
      tag: ['@api', '@patient', '@negative', '@pharma-396'],
    },
    async ({ api, noAuth }) => {
      const createIdentificationCardRes = await safeGraphQL(api, {
        query: CREATE_IDENTIFICATION_CARD_QUERY,
        variables: { identificationCard: buildCreateIdentificationCardInput() },
        headers: noAuth,
      });

      expect(createIdentificationCardRes.ok, 'Create Identification Card without auth should fail').toBe(false);

      const { message, code, classification } = getGQLError(createIdentificationCardRes);
      expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
      expect(NOAUTH_CODES).toContain(code);
      expect(NOAUTH_CLASSIFICATIONS).toContain(classification);
    }
  );

  test(
    'PHARMA-397 | Should NOT be able to create Identification Card as Patient with invalid Authentication',
    {
      tag: ['@api', '@patient', '@negative', '@pharma-397'],
    },
    async ({ api, invalidAuth }) => {
      const createIdentificationCardRes = await safeGraphQL(api, {
        query: CREATE_IDENTIFICATION_CARD_QUERY,
        variables: { identificationCard: buildCreateIdentificationCardInput() },
        headers: invalidAuth,
      });

      expect(createIdentificationCardRes.ok, 'Create Identification Card with invalid auth should fail').toBe(false);
      expect(createIdentificationCardRes.httpOk).toBe(false);
      expect(NOAUTH_HTTP_STATUSES).toContain(createIdentificationCardRes.httpStatus);
    }
  );

  test(
    'PHARMA-398 | Should be able to get Identification Cards as Patient',
    {
      tag: ['@api', '@patient', '@positive', '@pharma-398'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsPatientAndGetTokens(api, defaultPatientAccount);
      expect(loginRes.ok, loginRes.error || 'Patient login failed').toBe(true);

      const { identificationCardNode } = await createIdentificationCardAsPatient(api, accessToken);
      const getIdentificationCardsRes = await safeGraphQL(api, {
        query: GET_IDENTIFICATION_CARDS_QUERY,
        variables: { patientId: defaultPatientAccount.patientId },
        headers: bearer(accessToken),
      });

      expect(
        getIdentificationCardsRes.ok,
        getIdentificationCardsRes.error || 'Get Identification Cards request failed'
      ).toBe(true);

      const identificationCardsNode = getIdentificationCardsRes.body?.data?.patient?.identificationCards;
      expect(Array.isArray(identificationCardsNode), 'Expected identificationCards to be an array').toBe(true);
      expect(
        identificationCardsNode.some((card) => String(card?.id) === String(identificationCardNode.id)),
        `Expected created identification card ${identificationCardNode.id} to be returned`
      ).toBe(true);
    }
  );

  test(
    'PHARMA-399 | Should NOT be able to get Identification Cards as Patient without Authentication',
    {
      tag: ['@api', '@patient', '@negative', '@pharma-399'],
    },
    async ({ api, noAuth }) => {
      const getIdentificationCardsRes = await safeGraphQL(api, {
        query: GET_IDENTIFICATION_CARDS_QUERY,
        variables: { patientId: defaultPatientAccount.patientId },
        headers: noAuth,
      });

      expect(getIdentificationCardsRes.ok, 'Get Identification Cards without auth should fail').toBe(false);

      const { message, code, classification } = getGQLError(getIdentificationCardsRes);
      expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
      expect(NOAUTH_CODES).toContain(code);
      expect(NOAUTH_CLASSIFICATIONS).toContain(classification);
    }
  );

  test(
    'PHARMA-400 | Should NOT be able to get Identification Cards as Patient with invalid Authentication',
    {
      tag: ['@api', '@patient', '@negative', '@pharma-400'],
    },
    async ({ api, invalidAuth }) => {
      const getIdentificationCardsRes = await safeGraphQL(api, {
        query: GET_IDENTIFICATION_CARDS_QUERY,
        variables: { patientId: defaultPatientAccount.patientId },
        headers: invalidAuth,
      });

      expect(getIdentificationCardsRes.ok, 'Get Identification Cards with invalid auth should fail').toBe(false);
      expect(getIdentificationCardsRes.httpOk).toBe(false);
      expect(NOAUTH_HTTP_STATUSES).toContain(getIdentificationCardsRes.httpStatus);
    }
  );

  test(
    'PHARMA-401 | Should be able to update Identification Card as Patient',
    {
      tag: ['@api', '@patient', '@positive', '@pharma-401'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsPatientAndGetTokens(api, defaultPatientAccount);
      expect(loginRes.ok, loginRes.error || 'Patient login failed').toBe(true);

      const { identificationCardNode } = await createIdentificationCardAsPatient(api, accessToken);
      const updatedIdentificationCard = buildUpdateIdentificationCardInput();
      const updateIdentificationCardRes = await safeGraphQL(api, {
        query: UPDATE_IDENTIFICATION_CARD_QUERY,
        variables: {
          identificationCardId: identificationCardNode.id,
          identificationCard: updatedIdentificationCard,
        },
        headers: bearer(accessToken),
      });

      expect(
        updateIdentificationCardRes.ok,
        updateIdentificationCardRes.error || 'Update Identification Card request failed'
      ).toBe(true);

      const updatedIdentificationCardNode = updateIdentificationCardRes.body?.data?.patient?.identificationCard?.update;
      expect(updatedIdentificationCardNode, 'Missing data.patient.identificationCard.update').toBeTruthy();
      expect.soft(updatedIdentificationCardNode.cardType).toBe(updatedIdentificationCard.cardType);
      expect.soft(updatedIdentificationCardNode.cardId).toBe(updatedIdentificationCard.cardId);
      expect.soft(updatedIdentificationCardNode.frontPhoto).toBe(updatedIdentificationCard.frontPhoto);
      expect.soft(updatedIdentificationCardNode.backPhoto).toBe(updatedIdentificationCard.backPhoto);
    }
  );

  test(
    'PHARMA-402 | Should NOT be able to update Identification Card as Patient without Authentication',
    {
      tag: ['@api', '@patient', '@negative', '@pharma-402'],
    },
    async ({ api, noAuth }) => {
      const updateIdentificationCardRes = await safeGraphQL(api, {
        query: UPDATE_IDENTIFICATION_CARD_QUERY,
        variables: {
          identificationCardId: '1',
          identificationCard: buildUpdateIdentificationCardInput(),
        },
        headers: noAuth,
      });

      expect(updateIdentificationCardRes.ok, 'Update Identification Card without auth should fail').toBe(false);

      const { message, code, classification } = getGQLError(updateIdentificationCardRes);
      expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
      expect(NOAUTH_CODES).toContain(code);
      expect(NOAUTH_CLASSIFICATIONS).toContain(classification);
    }
  );

  test(
    'PHARMA-403 | Should NOT be able to update Identification Card as Patient with invalid Authentication',
    {
      tag: ['@api', '@patient', '@negative', '@pharma-403'],
    },
    async ({ api, invalidAuth }) => {
      const updateIdentificationCardRes = await safeGraphQL(api, {
        query: UPDATE_IDENTIFICATION_CARD_QUERY,
        variables: {
          identificationCardId: '1',
          identificationCard: buildUpdateIdentificationCardInput(),
        },
        headers: invalidAuth,
      });

      expect(updateIdentificationCardRes.ok, 'Update Identification Card with invalid auth should fail').toBe(false);
      expect(updateIdentificationCardRes.httpOk).toBe(false);
      expect(NOAUTH_HTTP_STATUSES).toContain(updateIdentificationCardRes.httpStatus);
    }
  );

  test(
    'PHARMA-404 | Should be able to remove Identification Card as Patient',
    {
      tag: ['@api', '@patient', '@positive', '@pharma-404'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsPatientAndGetTokens(api, defaultPatientAccount);
      expect(loginRes.ok, loginRes.error || 'Patient login failed').toBe(true);

      const { identificationCardNode } = await createIdentificationCardAsPatient(api, accessToken);
      const removeIdentificationCardRes = await safeGraphQL(api, {
        query: REMOVE_IDENTIFICATION_CARD_QUERY,
        variables: { identificationCardId: identificationCardNode.id },
        headers: bearer(accessToken),
      });

      expect(
        removeIdentificationCardRes.ok,
        removeIdentificationCardRes.error || 'Remove Identification Card request failed'
      ).toBe(true);

      const removeIdentificationCardNode = removeIdentificationCardRes.body?.data?.patient?.identificationCard;
      expect(removeIdentificationCardNode?.remove).toContain('removed successfully');
    }
  );

  test(
    'PHARMA-405 | Should NOT be able to remove Identification Card as Patient without Authentication',
    {
      tag: ['@api', '@patient', '@negative', '@pharma-405'],
    },
    async ({ api, noAuth }) => {
      const removeIdentificationCardRes = await safeGraphQL(api, {
        query: REMOVE_IDENTIFICATION_CARD_QUERY,
        variables: { identificationCardId: '1' },
        headers: noAuth,
      });

      expect(removeIdentificationCardRes.ok, 'Remove Identification Card without auth should fail').toBe(false);

      const { message, code, classification } = getGQLError(removeIdentificationCardRes);
      expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
      expect(NOAUTH_CODES).toContain(code);
      expect(NOAUTH_CLASSIFICATIONS).toContain(classification);
    }
  );

  test(
    'PHARMA-406 | Should NOT be able to remove Identification Card as Patient with invalid Authentication',
    {
      tag: ['@api', '@patient', '@negative', '@pharma-406'],
    },
    async ({ api, invalidAuth }) => {
      const removeIdentificationCardRes = await safeGraphQL(api, {
        query: REMOVE_IDENTIFICATION_CARD_QUERY,
        variables: { identificationCardId: '1' },
        headers: invalidAuth,
      });

      expect(removeIdentificationCardRes.ok, 'Remove Identification Card with invalid auth should fail').toBe(false);
      expect(removeIdentificationCardRes.httpOk).toBe(false);
      expect(NOAUTH_HTTP_STATUSES).toContain(removeIdentificationCardRes.httpStatus);
    }
  );
});
