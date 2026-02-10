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
import { randomAlphanumeric, randomLetters } from '../../../../helpers/globalTestUtils.js';
import { CREATE_VEHICLE_MUTATION } from './admin.assetsManagementQueries.js';

const VEHICLE_TYPES = ['MOTORCYCLE', 'CAR', 'BICYCLE'];

function buildVehicleInput() {
  const vehicleType = VEHICLE_TYPES[Math.floor(Math.random() * VEHICLE_TYPES.length)];
  const plateNumber = `${randomAlphanumeric(3).toUpperCase()}-${randomAlphanumeric(4).toUpperCase()}`;
  const model = `QA-${randomLetters(6).toUpperCase()}`;
  const officialReceiptNumber = `${randomAlphanumeric(8).toUpperCase()}`;
  return {
    status: 'LOST',
    vehicleType,
    model,
    plateNumber,
    officialReceiptNumber,
    dateAcquired: '2026-01-01',
  };
}

test.describe('GraphQL: Admin Create Vehicle', () => {
  test(
    'PHARMA-243 | Should create a vehicle with valid auth tokens',
    {
      tag: ['@api', '@admin', '@positive', '@create', '@pharma-243'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await adminLoginAndGetTokens(api, {
        username: process.env.ADMIN_USERNAME,
        password: process.env.ADMIN_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Admin login failed').toBe(true);

      const vehicleInput = buildVehicleInput();

      const createVehicleRes = await safeGraphQL(api, {
        query: CREATE_VEHICLE_MUTATION,
        variables: { vehicle: vehicleInput },
        headers: bearer(accessToken),
      });

      expect(createVehicleRes.ok, createVehicleRes.error || 'Create vehicle endpoint failed').toBe(
        true
      );

      const node = createVehicleRes.body?.data?.administrator?.asset?.createVehicle;
      expect(node, 'Create vehicle endpoint returned no data').toBeTruthy();
      expect.soft(node.vehicleType).toBe(vehicleInput.vehicleType);
      expect.soft(node.model).toBe(vehicleInput.model);
      expect.soft(node.plateNumber).toBe(vehicleInput.plateNumber);
    }
  );

  test(
    'PHARMA-244 | Should NOT create a vehicle with missing auth tokens',
    {
      tag: ['@api', '@admin', '@negative', '@create', '@pharma-244'],
    },
    async ({ api, noAuth }) => {
      const vehicleInput = buildVehicleInput();

      const createVehicleNoAuthRes = await safeGraphQL(api, {
        query: CREATE_VEHICLE_MUTATION,
        variables: { vehicle: vehicleInput },
        headers: noAuth,
      });

      expect(
        createVehicleNoAuthRes.ok,
        createVehicleNoAuthRes.error || 'Expected UNAUTHORIZED when missing token'
      ).toBe(false);

      if (!createVehicleNoAuthRes.httpOk) {
        expect(NOAUTH_HTTP_STATUSES).toContain(createVehicleNoAuthRes.httpStatus);
      } else {
        const { message, code, classification } = getGQLError(createVehicleNoAuthRes);
        expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
        expect.soft(NOAUTH_CODES).toContain(code);
        expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
      }
    }
  );

  test(
    'PHARMA-245 | Should NOT create a vehicle with invalid auth tokens',
    {
      tag: ['@api', '@admin', '@negative', '@create', '@pharma-245'],
    },
    async ({ api, invalidAuth }) => {
      const vehicleInput = buildVehicleInput();

      const createVehicleInvalidAuthRes = await safeGraphQL(api, {
        query: CREATE_VEHICLE_MUTATION,
        variables: { vehicle: vehicleInput },
        headers: invalidAuth,
      });

      expect(createVehicleInvalidAuthRes.ok).toBe(false);
      expect(createVehicleInvalidAuthRes.httpOk).toBe(false);
      expect(NOAUTH_HTTP_STATUSES).toContain(createVehicleInvalidAuthRes.httpStatus);
    }
  );
});
