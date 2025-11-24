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

function discountCardInput() {
  const patientId = 296; // Existing patient ID for testing
  const cardType = `Discount Card`;
  const name = `Suki Card - Watsons`;
  const cardNumber = `Wats-${randomAlphanumeric(8)}`;
  const expiryDate = `2030-12-31`;
  return { patientId, cardType, name, cardNumber, expiryDate };
}

test.describe('GraphQL: Patient Create Discount Card', () => {
  test(
    'PHARMA-72 | Should be able to create Discount Card as Patient',
    {
      tag: ['@api', '@patient', '@positive', '@pharma-72'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAndGetTokens(api, {
        username: process.env.LOGIN_USERNAME,
        password: process.env.LOGIN_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Admin login failed').toBe(true);

      const discountCardData = discountCardInput();
      const createDCRes = await safeGraphQL(api, {
        query: CREATE_DC_CARD,
        variables: { discountCard: discountCardData },
        headers: bearer(accessToken),
      });

      // Main Assertion
      expect(createDCRes.ok, createDCRes.error || 'Create Discount Card request failed').toBe(true);

      const createdDCNode = createDCRes.body.data.patient.discountCard.create;
      expect.soft(createdDCNode.name).toBe(discountCardData.name);
      expect.soft(createdDCNode.cardType).toBe(discountCardData.cardType);
      expect.soft(createdDCNode.cardNumber).toBe(discountCardData.cardNumber);
      expect.soft(typeof createdDCNode.id).toBe('string');
    }
  );

  test(
    'PHARMA-73 | Should NOT be able to create Discount Card as Patient without Authentication',
    {
      tag: ['@api', '@patient', '@negative', '@pharma-73'],
    },
    async ({ api, noAuth }) => {
      const discountCardData = discountCardInput();
      const createDCNoAuthRes = await safeGraphQL(api, {
        query: CREATE_DC_CARD,
        variables: { discountCard: discountCardData },
        headers: noAuth,
      });

      // Main Assertion
      expect(createDCNoAuthRes.ok, 'Create Discount Card no auth request should fail').toBe(false);

      const { message, code, classification } = getGQLError(createDCNoAuthRes);
      expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
      expect(NOAUTH_CODES).toContain(code);
      expect(NOAUTH_CLASSIFICATIONS).toContain(classification);
    }
  );

  test(
    'PHARMA-74 | Should NOT be able to create Discount Card as Patient with invalid Authentication',
    {
      tag: ['@api', '@patient', '@negative', '@pharma-74'],
    },
    async ({ api, invalidAuth }) => {
      const discountCardData = discountCardInput();
      const createDCInvalidAuthRes = await safeGraphQL(api, {
        query: CREATE_DC_CARD,
        variables: { discountCard: discountCardData },
        headers: invalidAuth,
      });

      // Main Assertion
      expect(
        createDCInvalidAuthRes.ok,
        'Create Discount Card with invalid auth request should fail'
      ).toBe(false);

      // Transport-level 401 (no GraphQL errors[])
      expect(createDCInvalidAuthRes.ok).toBe(false);
      expect(createDCInvalidAuthRes.httpOk).toBe(false);
      expect(NOAUTH_HTTP_STATUSES).toContain(createDCInvalidAuthRes.httpStatus);
    }
  );

  test(
    'PHARMA-75 |Should NOT be able to create Discount Card as Patient with missing data [Name]',
    {
      tag: ['@api', '@patient', '@negative', '@pharma-75'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await adminLoginAndGetTokens(api, {
        username: process.env.ADMIN_USERNAME,
        password: process.env.ADMIN_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Admin login failed').toBe(true);

      const discountCardData = discountCardInput();
      discountCardData.name = ''; // Missing name
      const createDCRes = await safeGraphQL(api, {
        query: CREATE_DC_CARD,
        variables: { discountCard: discountCardData },
        headers: bearer(accessToken),
      });

      // Main Assertion
      expect(
        createDCRes.ok,
        createDCRes.error || 'Create Discount Card with missing name should fail with missing Name'
      ).toBe(false);

      const { message, code, classification } = getGQLError(createDCRes);
      expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
      expect(NOAUTH_CODES).toContain(code);
      expect(NOAUTH_CLASSIFICATIONS).toContain(classification);
    }
  );
});
