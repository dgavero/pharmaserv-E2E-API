import { test, expect } from '../../../globalConfig.api.js';
import {
  safeGraphQL,
  adminLoginAndGetTokens,
  bearer,
  getGQLError,
  NOAUTH_MESSAGE_PATTERN,
  NOAUTH_CODES,
  NOAUTH_CLASSIFICATIONS,
  NOAUTH_HTTP_STATUSES,
} from '../../../helpers/testUtilsAPI.js';
import { randomAlphanumeric, randomNum } from '../../../../helpers/globalTestUtils.js';
import { CREATE_ADS_LOCATION_MUTATION } from './admin.adsLocationQueries.js';

function buildAdsLocationInput() {
  const tag = randomAlphanumeric(6).toUpperCase();
  const locationCode = `${randomNum(4)}`;
  return {
    locationCode,
    location: `QA Ads Location ${tag}`,
    address: `QA Address ${randomAlphanumeric(10)}`,
  };
}

test.describe('GraphQL: Admin Create Ads Location', () => {
  test(
    'PHARMA-219 | Should create ads location with valid auth tokens',
    {
      tag: ['@api', '@admin', '@positive', '@create', '@pharma-219'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await adminLoginAndGetTokens(api, {
        username: process.env.ADMIN_USERNAME,
        password: process.env.ADMIN_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Admin login failed').toBe(true);

      const locationInput = buildAdsLocationInput();

      const createAdsLocationRes = await safeGraphQL(api, {
        query: CREATE_ADS_LOCATION_MUTATION,
        variables: { location: locationInput },
        headers: bearer(accessToken),
      });

      expect(
        createAdsLocationRes.ok,
        createAdsLocationRes.error || 'administrator.adsLocation.create failed'
      ).toBe(true);

      const node = createAdsLocationRes.body?.data?.administrator?.adsLocation?.create;
      expect(node, 'Missing data.administrator.adsLocation.create').toBeTruthy();

      expect.soft(node.locationCode).toBe(locationInput.locationCode);
      expect.soft(node.location).toBe(locationInput.location);
      expect.soft(node.address).toBe(locationInput.address);
    }
  );

  test(
    'PHARMA-220 | Should NOT create ads location with missing auth tokens',
    {
      tag: ['@api', '@admin', '@negative', '@create', '@pharma-220'],
    },
    async ({ api, noAuth }) => {
      const locationInput = buildAdsLocationInput();

      const createAdsLocationNoAuthRes = await safeGraphQL(api, {
        query: CREATE_ADS_LOCATION_MUTATION,
        variables: { location: locationInput },
        headers: noAuth,
      });

      expect(
        createAdsLocationNoAuthRes.ok,
        createAdsLocationNoAuthRes.error || 'Expected UNAUTHORIZED when missing token'
      ).toBe(false);

      if (!createAdsLocationNoAuthRes.httpOk) {
        expect(NOAUTH_HTTP_STATUSES).toContain(createAdsLocationNoAuthRes.httpStatus);
      } else {
        const { message, code, classification } = getGQLError(createAdsLocationNoAuthRes);
        expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
        expect.soft(NOAUTH_CODES).toContain(code);
        expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
      }
    }
  );

  test(
    'PHARMA-221 | Should NOT create ads location with invalid auth tokens',
    {
      tag: ['@api', '@admin', '@negative', '@create', '@pharma-221'],
    },
    async ({ api, invalidAuth }) => {
      const locationInput = buildAdsLocationInput();

      const createAdsLocationInvalidAuthRes = await safeGraphQL(api, {
        query: CREATE_ADS_LOCATION_MUTATION,
        variables: { location: locationInput },
        headers: invalidAuth,
      });

      expect(createAdsLocationInvalidAuthRes.ok).toBe(false);
      expect(createAdsLocationInvalidAuthRes.httpOk).toBe(false);
      expect(NOAUTH_HTTP_STATUSES).toContain(createAdsLocationInvalidAuthRes.httpStatus);
    }
  );
});
