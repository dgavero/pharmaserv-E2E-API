import { loginAsPatientAndGetTokens, NOAUTH_MESSAGE_PATTERN, NOAUTH_CLASSIFICATIONS, NOAUTH_CODES, NOAUTH_HTTP_STATUSES } from '../../../helpers/auth.js';
import { safeGraphQL, bearer, getGQLError } from '../../../helpers/graphqlUtils.js';
import { test, expect } from '../../../globalConfig.api.js';
import { getPatientCredentials } from '../../../helpers/roleCredentials.js';
import { GET_ADS_LOCATIONS_QUERY } from './patient.onboardingQueries.js';

test.describe('GraphQL: Patient Get Ads Locations', () => {
  test(
    'PHARMA-285 | Should be able to get ads locations',
    {
      tag: ['@api', '@patient', '@positive', '@pharma-285'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsPatientAndGetTokens(api, getPatientCredentials('default'));
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

  test(
    'PHARMA-498 | Ads locations should satisfy list-item response contract shape',
    {
      tag: ['@api', '@patient', '@positive', '@pharma-498'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsPatientAndGetTokens(api, getPatientCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Patient login failed').toBe(true);

      const getAdsLocationsRes = await safeGraphQL(api, {
        query: GET_ADS_LOCATIONS_QUERY,
        headers: bearer(accessToken),
      });
      expect(getAdsLocationsRes.httpStatus).toBe(200);
      expect(getAdsLocationsRes.httpOk).toBe(true);
      expect(getAdsLocationsRes.ok, getAdsLocationsRes.error || 'Get ads locations failed').toBe(true);

      const node = getAdsLocationsRes.body?.data?.patient?.adsLocations;
      expect(Array.isArray(node), 'Missing or invalid data.patient.adsLocations').toBe(true);
      if (node.length > 0) {
        expect.soft(typeof node[0]?.id).toBe('string');
        expect.soft(typeof node[0]?.locationCode).toBe('string');
        expect.soft(typeof node[0]?.location).toBe('string');
        expect.soft(typeof node[0]?.address).toBe('string');
        expect.soft(Array.isArray(node[0]?.codes)).toBe(true);
      }
    }
  );
});
