import { randomAlphanumeric, randomNum } from '../../../../helpers/globalTestUtils.js';
import { test, expect } from '../../../globalConfig.api.js';
import { UPDATE_DISCOUNT_CARD_QUERY } from './patient.profileQueries.js';
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

function updateDiscountCardInput() {
  const patientId = process.env.PATIENT_USER_USERNAME_ID; // Existing patient ID for testing
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
      const { accessToken, raw: loginRes } = await loginAndGetTokens(api, {
        username: process.env.PATIENT_USER_USERNAME,
        password: process.env.PATIENT_USER_PASSWORD,
      });
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
