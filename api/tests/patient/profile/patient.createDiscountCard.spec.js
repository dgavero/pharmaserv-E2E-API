import { test, expect } from '../../../globalConfig.api.js';
import { getPatientAccount, getPatientCredentials, getAdminCredentials } from '../../../helpers/roleCredentials.js';
import { safeGraphQL, bearer, getGQLError } from '../../../helpers/graphqlUtils.js';
import {
  loginAsPatientAndGetTokens,
  loginAsAdminAndGetTokens,
  NOAUTH_MESSAGE_PATTERN,
  NOAUTH_CLASSIFICATIONS,
  NOAUTH_CODES,
  NOAUTH_HTTP_STATUSES,
} from '../../../helpers/auth.js';
import { randomAlphanumeric } from '../../../../helpers/globalTestUtils.js';

const defaultPatientAccount = getPatientAccount('default');

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
  const patientId = defaultPatientAccount.patientId;
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
      const { accessToken, raw: loginRes } = await loginAsPatientAndGetTokens(api, getPatientCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Patient login failed').toBe(true);

      const discountCardData = discountCardInput();
      const createDiscountCardRes = await safeGraphQL(api, {
        query: CREATE_DC_CARD,
        variables: { discountCard: discountCardData },
        headers: bearer(accessToken),
      });

      // Main Assertion
      expect(
        createDiscountCardRes.ok,
        createDiscountCardRes.error || 'Create Discount Card request failed'
      ).toBe(true);

      const createdDCNode = createDiscountCardRes.body.data.patient.discountCard.create;
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
      const createDiscountCardNoAuthRes = await safeGraphQL(api, {
        query: CREATE_DC_CARD,
        variables: { discountCard: discountCardData },
        headers: noAuth,
      });

      // Main Assertion
      expect(createDiscountCardNoAuthRes.ok, 'Create Discount Card no auth request should fail').toBe(false);

      const { message, code, classification } = getGQLError(createDiscountCardNoAuthRes);
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
      const createDiscountCardInvalidAuthRes = await safeGraphQL(api, {
        query: CREATE_DC_CARD,
        variables: { discountCard: discountCardData },
        headers: invalidAuth,
      });

      // Main Assertion
      expect(
        createDiscountCardInvalidAuthRes.ok,
        'Create Discount Card with invalid auth request should fail'
      ).toBe(false);

      // Transport-level 401 (no GraphQL errors[])
      expect(createDiscountCardInvalidAuthRes.ok).toBe(false);
      expect(createDiscountCardInvalidAuthRes.httpOk).toBe(false);
      expect(NOAUTH_HTTP_STATUSES).toContain(createDiscountCardInvalidAuthRes.httpStatus);
    }
  );

  test(
    'PHARMA-75 |Should NOT be able to create Discount Card as Patient with missing data [Name]',
    {
      tag: ['@api', '@patient', '@negative', '@pharma-75'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsAdminAndGetTokens(api, getAdminCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Admin login failed').toBe(true);

      const discountCardData = discountCardInput();
      discountCardData.name = ''; // Missing name
      const createDiscountCardRes = await safeGraphQL(api, {
        query: CREATE_DC_CARD,
        variables: { discountCard: discountCardData },
        headers: bearer(accessToken),
      });

      // Main Assertion
      expect(
        createDiscountCardRes.ok,
        createDiscountCardRes.error || 'Create Discount Card with missing name should fail with missing Name'
      ).toBe(false);

      const { message, code, classification } = getGQLError(createDiscountCardRes);
      expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
      expect(NOAUTH_CODES).toContain(code);
      expect(NOAUTH_CLASSIFICATIONS).toContain(classification);
    }
  );
});
