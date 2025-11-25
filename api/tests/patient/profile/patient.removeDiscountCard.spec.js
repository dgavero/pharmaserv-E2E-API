import { randomAlphanumeric, randomNum } from '../../../../helpers/globalTestUtils.js';
import { test, expect } from '../../../globalConfig.api.js';
import { loginAndGetTokens } from '../../../helpers/testUtilsAPI';
import {
  safeGraphQL,
  bearer,
  adminLoginAndGetTokens,
  getGQLError,
  NOAUTH_MESSAGE_PATTERN,
  NOAUTH_CLASSIFICATIONS,
  NOAUTH_CODES,
  NOAUTH_HTTP_STATUSES,
} from '../../../helpers/testUtilsAPI.js';

const REMOVE_DC_CARD = /* GraphQL */ `
  mutation ($discountCardId: ID!) {
    patient {
      discountCard {
        remove(discountCardId: $discountCardId)
      }
    }
  }
`;

const CREATE_DC_CARD = /* GraphQL */ `
  mutation ($discountCard: DiscountCardRequest!) {
    patient {
      discountCard {
        create(discountCard: $discountCard) {
          id
          name
          cardType
          cardNumber
          photo
        }
      }
    }
  }
`;

const unownedDiscountCardId = 1;

// Will be used to create and then remove the discount card
function discountCardInput() {
  const patientId = 296; // Existing patient ID for testing
  const cardType = `Discount Card`;
  const name = `Suki Card - Watsons`;
  const cardNumber = `Wats-${randomAlphanumeric(8)}`;
  const expiryDate = `2030-12-31`;
  return { patientId, cardType, name, cardNumber, expiryDate };
}

test.describe('GraphQL: Patient Remove Discount Card', () => {
  test(
    'PHARMA-80 | Should be able to remove Discount Card of Patient',
    {
      tag: ['@api', '@patient', '@positive', '@pharma-80'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAndGetTokens(api, {
        username: process.env.USER_USERNAME,
        password: process.env.USER_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Patient login failed').toBe(true);

      // Create a discount card to be removed and get its ID
      const discountCardData = discountCardInput();
      const createDCRes = await safeGraphQL(api, {
        query: CREATE_DC_CARD,
        variables: { discountCard: discountCardData },
        headers: bearer(accessToken),
      });
      expect(createDCRes.ok, createDCRes.error || 'Create Discount Card request failed').toBe(true);

      // Get the created discount card ID
      const createdDCNode = createDCRes.body.data.patient.discountCard.create;
      const discountCardId = createdDCNode.id;

      // Remove the created discount card
      const removeDiscountCardRes = await safeGraphQL(api, {
        query: REMOVE_DC_CARD,
        variables: { discountCardId },
        headers: bearer(accessToken),
      });

      // Main Assertion
      expect(
        removeDiscountCardRes.ok,
        removeDiscountCardRes.error || 'Remove Discount Card request failed'
      ).toBe(true);

      const removeDiscountCardNode = removeDiscountCardRes.body.data.patient.discountCard;
      expect(removeDiscountCardNode.remove).toContain('removed successfully');
    }
  );

  test(
    'PHARMA-81 | Should NOT be able to remove unowned Discount Card of Patient',
    {
      tag: ['@api', '@patient', '@negative', '@pharma-81'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAndGetTokens(api, {
        username: process.env.USER_USERNAME,
        password: process.env.USER_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Patient login failed').toBe(true);
      const removeDiscountCardRes = await safeGraphQL(api, {
        query: REMOVE_DC_CARD,
        variables: { discountCardId: unownedDiscountCardId },
        headers: bearer(accessToken),
      });

      // Main Assertion
      expect(
        removeDiscountCardRes.ok,
        'Remove Discount Card request for UNOWNED CARD should have failed'
      ).toBe(false);

      const { message, code, classification } = getGQLError(removeDiscountCardRes);
      expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
      expect(NOAUTH_CLASSIFICATIONS).toContain(classification);
      expect(NOAUTH_CODES).toContain(code);
    }
  );
});
