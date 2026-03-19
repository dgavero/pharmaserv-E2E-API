import { loginAsPatientAndGetTokens } from '../../../helpers/auth.js';
import { safeGraphQL, bearer } from '../../../helpers/graphqlUtils.js';
import { test, expect } from '../../../globalConfig.api.js';
import { getPatientAccount, getPatientCredentials } from '../../../helpers/roleCredentials.js';
import { UPDATE_DISCOUNT_CARD_QUERY } from './patient.profileQueries.js';
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
      const patientCardId = process.env.PATIENT_USER_USENAME_CARDID;

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
});
