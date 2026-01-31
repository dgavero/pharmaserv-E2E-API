import { test, expect } from '../../../globalConfig.api.js';
import {
  safeGraphQL,
  bearer,
  getGQLError,
  NOAUTH_MESSAGE_PATTERN,
  NOAUTH_CLASSIFICATIONS,
  NOAUTH_CODES,
  pharmacistLoginAndGetTokens,
  NOAUTH_HTTP_STATUSES,
} from '../../../helpers/testUtilsAPI.js';
import { PHARMACIST_GET_MY_PHARMACY_QUERY } from './pharmacy.profileQueries.js';

test.describe('GraphQL: Get My Pharmacy', () => {
  test(
    'PHARMA-150 | Should be able to get myPharmacy as Pharmacist',
    {
      tag: ['@api', '@pharmacist', '@positive', '@pharma-150'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await pharmacistLoginAndGetTokens(api, {
        username: process.env.PHARMACIST_USERNAME_REG01,
        password: process.env.PHARMACIST_PASSWORD_REG01,
      });
      expect(loginRes.ok, loginRes.error || 'Pharmacist login failed').toBe(true);

      const myPharmacyRes = await safeGraphQL(api, {
        query: PHARMACIST_GET_MY_PHARMACY_QUERY,
        headers: bearer(accessToken),
      });
      expect(myPharmacyRes.ok, myPharmacyRes.error || 'Failed to get pharmacist pharmacy').toBe(true);

      const node = myPharmacyRes.body.data.pharmacy.myPharmacy;
      expect(node).toBeTruthy();
      expect(typeof node.id).toBe('string');
      expect(typeof node.name).toBe('string');
    }
  );

  test(
    'PHARMA-151 | Should NOT be able to get myPharmacy as Pharmacist with No Auth',
    {
      tag: ['@api', '@pharmacist', '@negative', '@pharma-151'],
    },
    async ({ api, noAuth }) => {
      const myPharmacyResNoAuth = await safeGraphQL(api, {
        query: PHARMACIST_GET_MY_PHARMACY_QUERY,
        headers: noAuth,
      });
      expect(myPharmacyResNoAuth.ok, 'Request with no auth should not be successful').toBe(false);
      const { message, classification, code } = getGQLError(myPharmacyResNoAuth);
      expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
      expect(NOAUTH_CLASSIFICATIONS).toContain(classification);
      expect(NOAUTH_CODES).toContain(code);
    }
  );

  test(
    'PHARMA-152 | Should NOT be able to get myPharmacy as Pharmacist with Invalid Auth',
    {
      tag: ['@api', '@pharmacist', '@negative', '@pharma-152'],
    },
    async ({ api, invalidAuth }) => {
      const myPharmacyResInvalidAuth = await safeGraphQL(api, {
        query: PHARMACIST_GET_MY_PHARMACY_QUERY,
        headers: invalidAuth,
      });
      expect(
        myPharmacyResInvalidAuth.ok,
        myPharmacyResInvalidAuth.error || 'Request with invalid auth should not be successful'
      ).toBe(false);

      // Transport-level 401 (no GraphQL errors[])
      expect(myPharmacyResInvalidAuth.ok).toBe(false);
      expect(myPharmacyResInvalidAuth.httpOk).toBe(false);
      expect(NOAUTH_HTTP_STATUSES).toContain(myPharmacyResInvalidAuth.httpStatus);
    }
  );
});
