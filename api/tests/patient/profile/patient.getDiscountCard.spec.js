import { randomAlphanumeric, randomNum } from '../../../../helpers/globalTestUtils.js';
import { test, expect } from '../../../globalConfig.api.js';
import { loginAndGetTokens } from '../../../helpers/testUtilsAPI';
import {
  safeGraphQL,
  bearer,
  getGQLError,
  NOAUTH_MESSAGE_PATTERN,
  NOAUTH_CLASSIFICATIONS,
  NOAUTH_CODES,
  NOAUTH_HTTP_STATUSES,
} from '../../../helpers/testUtilsAPI.js';

const GET_DC_CARD = /* GraphQL */ `
  query ($patientId: ID!) {
    patient {
      discountCards(patientId: $patientId) {
        id
        name
        cardType
        cardNumber
        photo
      }
    }
  }
`;

const patientId = process.env.USER_USERNAME_PATIENT_ID; // Existing patient ID
const incorrectPatientId = 999; // Non-existing patient ID

test.describe('GraphQL: Patient Get Discount Card Details', () => {
  test(
    'PHARMA-76 | Should be able to Get Discount Card Details of Patient',
    {
      tag: ['@api', '@patient', '@positive', '@pharma-76'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAndGetTokens(api, {
        username: process.env.USER_USERNAME,
        password: process.env.USER_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Patient login failed').toBe(true);

      const getDCRes = await safeGraphQL(api, {
        query: GET_DC_CARD,
        variables: { patientId },
        headers: bearer(accessToken),
      });

      // Main Assertion
      expect(getDCRes.ok, getDCRes.error || 'Get Discount Card request failed').toBe(true);
    }
  );

  test(
    'PHARMA-77 | Should NOT be able to Get Discount Card Details with incorrect Patient ID',
    {
      tag: ['@api', '@patient', '@negative', '@pharma-77'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAndGetTokens(api, {
        username: process.env.USER_USERNAME,
        password: process.env.USER_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Patient login failed').toBe(true);
      const getDCRes = await safeGraphQL(api, {
        query: GET_DC_CARD,
        variables: { patientId: incorrectPatientId },
        headers: bearer(accessToken),
      });

      // Main Assertion
      expect(getDCRes.ok, 'Get Discount Card request should have failed').toBe(false);

      const { message, code, classification } = getGQLError(getDCRes);
      expect.soft(message).toMatch(NOAUTH_MESSAGE_PATTERN);
      expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
      expect.soft(NOAUTH_CODES).toContain(code);
    }
  );

  test(
    'PHARMA-78 | Should NOT be able to Get Discount Card Details of Patient without Authentication',
    {
      tag: ['@api', '@patient', '@negative', '@pharma-78'],
    },
    async ({ api, noAuth }) => {
      const getDCNoAuthRes = await safeGraphQL(api, {
        query: GET_DC_CARD,
        variables: { patientId },
        headers: noAuth,
      });

      // Main Assertion
      expect(getDCNoAuthRes.ok, 'Get Discount Card no auth request should fail').toBe(false);

      const { message, code, classification } = getGQLError(getDCNoAuthRes);
      expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
      expect(NOAUTH_CODES).toContain(code);
      expect(NOAUTH_CLASSIFICATIONS).toContain(classification);
    }
  );

  test(
    'PHARMA-79 | Should NOT be able to Get Discount Card Details of Patient with invalid Authentication',
    {
      tag: ['@api', '@patient', '@negative', '@pharma-79'],
    },
    async ({ api, invalidAuth }) => {
      const getDCInvalidAuthRes = await safeGraphQL(api, {
        query: GET_DC_CARD,
        variables: { patientId },
        headers: invalidAuth,
      });

      // Main Assertion
      expect(getDCInvalidAuthRes.ok, 'Get Discount Card invalid auth request should fail').toBe(
        false
      );

      // Transport-level 401 (no GraphQL errors[])
      expect(getDCInvalidAuthRes.ok).toBe(false);
      expect(getDCInvalidAuthRes.httpOk).toBe(false);
      expect(NOAUTH_HTTP_STATUSES).toContain(getDCInvalidAuthRes.httpStatus);
    }
  );
});
