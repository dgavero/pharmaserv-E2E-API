import { loginAsPatientAndGetTokens, NOAUTH_MESSAGE_PATTERN, NOAUTH_CLASSIFICATIONS, NOAUTH_CODES } from '../../../helpers/auth.js';
import { safeGraphQL, bearer, getGQLError } from '../../../helpers/graphqlUtils.js';
import { test, expect } from '../../../globalConfig.api.js';
import { getPatientAccount, getPatientCredentials } from '../../../helpers/roleCredentials.js';
import { ADD_FAVORITE_MEDICINE_QUERY, GET_FAVORITE_MEDICINE_QUERY } from './patient.medicineQueries.js';

const defaultPatientAccount = getPatientAccount('default');

test.describe('GraphQL: Medicine Favorites', () => {
  test(
    'PHARMA-191 | Should be able to Add Favorite a medicine',
    {
      tag: ['@api', '@patient', '@positive', '@pharma-191'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsPatientAndGetTokens(api, getPatientCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Patient login failed').toBe(true);

      const medicineId = 1;
      const addFavoriteMedicineRes = await safeGraphQL(api, {
        query: ADD_FAVORITE_MEDICINE_QUERY,
        variables: {
          patientId: defaultPatientAccount.patientId,
          medicineId: medicineId,
        },
        headers: bearer(accessToken),
      });

      const { message } = getGQLError(addFavoriteMedicineRes);

      if (!addFavoriteMedicineRes.ok) {
        if (!/already exists/i.test(message)) {
          expect(addFavoriteMedicineRes.ok, addFavoriteMedicineRes.error || 'Add favorite medicine failed').toBe(true);
        } else console.log(`MedicineID already added as favorite.`);
      }
    }
  );

  test(
    'PHARMA-192 | Should NOT be able to Add Favorite a medicine to other patient',
    {
      tag: ['@api', '@patience', '@negative', '@pharma-192'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsPatientAndGetTokens(api, getPatientCredentials('default'));
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

      expect(
        addFavoriteMedicineRes.ok,
        addFavoriteMedicineRes.error || 'Add favorite medicine for another patient should fail'
      ).toBe(false);

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
      const { accessToken, raw: loginRes } = await loginAsPatientAndGetTokens(api, getPatientCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Patient login failed').toBe(true);

      const getFavoriteMedicineRes = await safeGraphQL(api, {
        query: GET_FAVORITE_MEDICINE_QUERY,
        variables: {
          patientId: defaultPatientAccount.patientId,
        },
        headers: bearer(accessToken),
      });

      expect(
        getFavoriteMedicineRes.ok,
        getFavoriteMedicineRes.error || 'Get favorite medicine failed'
      ).toBe(true);
    }
  );

  // remove medicine to add later once api is implemented
});
