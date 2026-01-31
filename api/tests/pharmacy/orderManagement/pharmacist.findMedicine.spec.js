import { test, expect } from '../../../globalConfig.api.js';
import { FIND_MEDICINES_QUERY } from '../orderManagement/pharmacist.orderManagementQueries.js';
import {
  safeGraphQL,
  bearer,
  adminLoginAndGetTokens,
  getGQLError,
  NOAUTH_MESSAGE_PATTERN,
  NOAUTH_CLASSIFICATIONS,
  NOAUTH_CODES,
  NOAUTH_HTTP_STATUSES,
  pharmacistLoginAndGetTokens,
} from '../../../helpers/testUtilsAPI.js';

test.describe('GraphQL: Pharmacy Find Medicines by search', () => {
  test(
    'PHARMA-176 | Should be able to find medicines by searching a keyword',
    {
      tag: ['@api', '@admin', '@positive', '@pharma-176'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await pharmacistLoginAndGetTokens(api, {
        username: process.env.PHARMACIST_USERNAME_REG01,
        password: process.env.PHARMACIST_PASSWORD_REG01,
      });
      expect(loginRes.ok, loginRes.error || 'Pharmacist login failed').toBe(true);

      const findMedicineRes = await safeGraphQL(api, {
        query: FIND_MEDICINES_QUERY,
        variables: {
          query: 'a',
        },
        headers: bearer(accessToken),
      });

      expect(findMedicineRes.ok, findMedicineRes.error || 'Find medicines failed').toBe(true);
    }
  );
});
