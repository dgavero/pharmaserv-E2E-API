import { test, expect } from '../../../globalConfig.api.js';
import { GET_ADS_LOCATIONS_QUERY } from './patient.onboardingQueries.js';
import {
  safeGraphQL,
  bearer,
  getGQLError,
  loginAndGetTokens,
  NOAUTH_CODES,
  NOAUTH_CLASSIFICATIONS,
  NOAUTH_HTTP_STATUSES,
  NOAUTH_MESSAGE_PATTERN,
} from '../../../helpers/testUtilsAPI.js';

test.describe('GraphQL: Patient Get Ads Locations', () => {
  test(
    'PHARMA-285 | Should be able to get ads locations',
    {
      tag: ['@api', '@patient', '@positive', '@pharma-285', '@smoke'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAndGetTokens(api, {
        username: process.env.PATIENT_USER_USERNAME,
        password: process.env.PATIENT_USER_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Patient login failed').toBe(true);

      const getAdsLocationsRes = await safeGraphQL(api, {
        query: GET_ADS_LOCATIONS_QUERY,
        headers: bearer(accessToken),
      });
      expect(getAdsLocationsRes.ok, getAdsLocationsRes.error || 'Get ads locations failed').toBe(true);

      const node = getAdsLocationsRes.body?.data?.patient?.adsLocations;
      expect(node, 'Missing data.patient.adsLocations').toBeTruthy();
      expect.soft(Array.isArray(node)).toBe(true);
    }
  );

  test(
    'PHARMA-286 | Should be able to get ads locations with missing auth tokens',
    {
      tag: ['@api', '@patient', '@positive', '@pharma-286'],
    },
    async ({ api, noAuth }) => {
      const getAdsLocationsNoAuthRes = await safeGraphQL(api, {
        query: GET_ADS_LOCATIONS_QUERY,
        headers: noAuth,
      });
      expect(
        getAdsLocationsNoAuthRes.ok,
        getAdsLocationsNoAuthRes.error || 'Get ads locations with no auth failed'
      ).toBe(true);

      const node = getAdsLocationsNoAuthRes.body?.data?.patient?.adsLocations;
      expect(node, 'Missing data.patient.adsLocations').toBeTruthy();
      expect.soft(Array.isArray(node)).toBe(true);
    }
  );

  test(
    'PHARMA-287 | Should NOT be able to get ads locations with invalid auth tokens',
    {
      tag: ['@api', '@patient', '@negative', '@pharma-287'],
    },
    async ({ api, invalidAuth }) => {
      const getAdsLocationsInvalidAuthRes = await safeGraphQL(api, {
        query: GET_ADS_LOCATIONS_QUERY,
        headers: invalidAuth,
      });
      expect(getAdsLocationsInvalidAuthRes.ok).toBe(false);

      if (!getAdsLocationsInvalidAuthRes.httpOk) {
        expect(NOAUTH_HTTP_STATUSES).toContain(getAdsLocationsInvalidAuthRes.httpStatus);
      } else {
        const { message, code, classification } = getGQLError(getAdsLocationsInvalidAuthRes);
        expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
        expect.soft(NOAUTH_CODES).toContain(code);
        expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
      }
    }
  );
});
