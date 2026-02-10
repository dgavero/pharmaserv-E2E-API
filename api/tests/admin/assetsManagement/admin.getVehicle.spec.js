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
import { GET_VEHICLE_QUERY } from './admin.assetsManagementQueries.js';

test.describe('GraphQL: Admin Get Vehicle', () => {
  test(
    'PHARMA-246 | Should get vehicle with valid auth tokens',
    {
      tag: ['@api', '@admin', '@positive', '@pharma-246'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await adminLoginAndGetTokens(api, {
        username: process.env.ADMIN_USERNAME,
        password: process.env.ADMIN_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Admin login failed').toBe(true);

      const getVehicleRes = await safeGraphQL(api, {
        query: GET_VEHICLE_QUERY,
        variables: { assetReferenceId: 1 },
        headers: bearer(accessToken),
      });

      expect(getVehicleRes.ok, getVehicleRes.error || 'Get vehicle endpoint failed').toBe(true);
    }
  );

  test(
    'PHARMA-247 | Should NOT get vehicle with missing auth tokens',
    {
      tag: ['@api', '@admin', '@negative', '@pharma-247'],
    },
    async ({ api, noAuth }) => {
      const getVehicleNoAuthRes = await safeGraphQL(api, {
        query: GET_VEHICLE_QUERY,
        variables: { assetReferenceId: 1 },
        headers: noAuth,
      });

      expect(
        getVehicleNoAuthRes.ok,
        getVehicleNoAuthRes.error || 'Expected UNAUTHORIZED when missing token'
      ).toBe(false);

      if (!getVehicleNoAuthRes.httpOk) {
        expect(NOAUTH_HTTP_STATUSES).toContain(getVehicleNoAuthRes.httpStatus);
      } else {
        const { message, code, classification } = getGQLError(getVehicleNoAuthRes);
        expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
        expect.soft(NOAUTH_CODES).toContain(code);
        expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
      }
    }
  );

  test(
    'PHARMA-248 | Should NOT get vehicle with invalid auth tokens',
    {
      tag: ['@api', '@admin', '@negative', '@pharma-248'],
    },
    async ({ api, invalidAuth }) => {
      const getVehicleInvalidAuthRes = await safeGraphQL(api, {
        query: GET_VEHICLE_QUERY,
        variables: { assetReferenceId: 1 },
        headers: invalidAuth,
      });

      expect(getVehicleInvalidAuthRes.ok).toBe(false);
      expect(getVehicleInvalidAuthRes.httpOk).toBe(false);
      expect(NOAUTH_HTTP_STATUSES).toContain(getVehicleInvalidAuthRes.httpStatus);
    }
  );
});
