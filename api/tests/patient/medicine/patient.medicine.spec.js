import { test, expect } from '../../../globalConfig.api.js';
import {
  ADD_FAVORITE_MEDICINE_QUERY,
  GET_FAVORITE_MEDICINE_QUERY,
} from './patient.medicineQueries.js';
import {
  safeGraphQL,
  bearer,
  loginAndGetTokens,
  getGQLError,
  NOAUTH_MESSAGE_PATTERN,
  NOAUTH_CODES,
  NOAUTH_CLASSIFICATIONS,
} from '../../../helpers/testUtilsAPI.js';

test.describe('GraphQL: Medicine Favorites', () => {
  test(
    'PHARMA-191 | Should be able to Add Favorite a medicine',
    {
      tag: ['@api', '@patient', '@positive', '@pharma-191'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAndGetTokens(api, {
        username: process.env.USER_USERNAME,
        password: process.env.USER_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Patient login failed').toBe(true);

      const medicineId = 1;
      const addFavoriteMedicineRes = await safeGraphQL(api, {
        query: ADD_FAVORITE_MEDICINE_QUERY,
        variables: {
          patientId: process.env.USER_USERNAME_PATIENT_ID,
          medicineId: medicineId,
        },
        headers: bearer(accessToken),
      });

      expect(addFavoriteMedicineRes.ok).toBe(true);
    }
  );

  test(
    'PHARMA-192 | Should NOT be able to Add Favorite a medicine to other patient',
    {
      tag: ['@api', '@patience', '@negative', '@pharma-192'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAndGetTokens(api, {
        username: process.env.USER_USERNAME,
        password: process.env.USER_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Patient login failed').toBe(true);

      const medicineId = 1;
      const addFavoriteMedicineRes = await safeGraphQL(api, {
        query: ADD_FAVORITE_MEDICINE_QUERY,
        variables: {
          patientId: 5, // patientId not related to logged in user
          medicineId: medicineId,
        },
        headers: bearer(accessToken),
      });

      expect(addFavoriteMedicineRes.ok).toBe(false);

      const { message, code, classification } = getGQLError(addFavoriteMedicineRes);
      expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
      expect.soft(NOAUTH_CODES).toContain(code);
      expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
    }
  );

  test(
    'PHARMA-193 | Should be able to Get Favorite Medicine as Patient',
    {
      tag: ['@api', '@patient', '@positive', '@pharma-193'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAndGetTokens(api, {
        username: process.env.USER_USERNAME,
        password: process.env.USER_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Patient login failed').toBe(true);

      const getFavoriteMedicineRes = await safeGraphQL(api, {
        query: GET_FAVORITE_MEDICINE_QUERY,
        variables: {
          patientId: process.env.USER_USERNAME_PATIENT_ID,
        },
        headers: bearer(accessToken),
      });

      expect(getFavoriteMedicineRes.ok).toBe(true);
    }
  );

  // remove medicine to add later once api is implemented
});
