import { loginAsPatientAndGetTokens } from '../../../helpers/auth.js';
import { safeGraphQL, bearer } from '../../../helpers/graphqlUtils.js';
import { test, expect } from '../../../globalConfig.api.js';
import { getPatientAccount, getPatientCredentials } from '../../../helpers/roleCredentials.js';
import { GET_DISCOUNT_CARDS_QUERY, UPDATE_DISCOUNT_CARD_QUERY } from './patient.profileQueries.js';
import { randomAlphanumeric } from '../../../../helpers/globalTestUtils.js';

const defaultPatientAccount = getPatientAccount('default');

function updateDiscountCardInput() {
  const patientId = defaultPatientAccount.patientId;
  const cardType = `Watsons Club Card`;
  const name = `Suki Card - Watsons`;
  const cardNumber = `${randomAlphanumeric(8)}`;
  const photo = `sc-5c898f21-9863-4d47-93ef-52fb3cb9a37c.jpeg`;
  return { patientId, cardType, name, cardNumber, photo };
}

test.describe('GraphQL: Update Discount Card Patient', () => {
  test(
    'PHARMA-179 | Should be able to update Discount Card as Patient',
    {
      tag: ['@api', '@patient', '@positive', '@pharma-179'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsPatientAndGetTokens(api, getPatientCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Patient login failed').toBe(true);

      const updateCardData = updateDiscountCardInput();
      const getDiscountCardsRes = await safeGraphQL(api, {
        query: GET_DISCOUNT_CARDS_QUERY,
        variables: { patientId: defaultPatientAccount.patientId },
        headers: bearer(accessToken),
      });
      expect(getDiscountCardsRes.ok, getDiscountCardsRes.error || 'Get discount cards request failed').toBe(true);

      const patientCardId = getDiscountCardsRes.body?.data?.patient?.discountCards?.[0]?.id;
      expect(patientCardId, 'Missing existing discount card id for update test').toBeTruthy();

      const updateDiscountCardRes = await safeGraphQL(api, {
        query: UPDATE_DISCOUNT_CARD_QUERY,
        variables: {
          discountCardId: patientCardId,
          discountCard: updateCardData,
        },
        headers: bearer(accessToken),
      });

      expect(updateDiscountCardRes.ok).toBe(true);
    }
  );

  test(
    'PHARMA-528 | Update discount card should satisfy response contract shape',
    {
      tag: ['@api', '@patient', '@positive', '@pharma-528'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsPatientAndGetTokens(api, getPatientCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Patient login failed').toBe(true);

      const getDiscountCardsRes = await safeGraphQL(api, {
        query: GET_DISCOUNT_CARDS_QUERY,
        variables: { patientId: defaultPatientAccount.patientId },
        headers: bearer(accessToken),
      });
      expect(getDiscountCardsRes.ok, getDiscountCardsRes.error || 'Get discount cards request failed').toBe(true);

      const patientCardId = getDiscountCardsRes.body?.data?.patient?.discountCards?.[0]?.id;
      expect(patientCardId, 'Missing existing discount card id for update test').toBeTruthy();

      const updateDiscountCardRes = await safeGraphQL(api, {
        query: UPDATE_DISCOUNT_CARD_QUERY,
        variables: {
          discountCardId: patientCardId,
          discountCard: updateDiscountCardInput(),
        },
        headers: bearer(accessToken),
      });

      expect(updateDiscountCardRes.httpStatus).toBe(200);
      expect(updateDiscountCardRes.httpOk).toBe(true);
      expect(updateDiscountCardRes.ok, updateDiscountCardRes.error || 'Update discount card request failed').toBe(true);

      const node = updateDiscountCardRes.body?.data?.patient?.discountCard?.update;
      expect(node, 'Missing data.patient.discountCard.update').toBeTruthy();
      expect.soft(typeof node?.id).toBe('string');
      expect.soft(typeof node?.name).toBe('string');
      expect.soft(typeof node?.cardType).toBe('string');
      expect.soft(typeof node?.cardNumber).toBe('string');
    }
  );
});
