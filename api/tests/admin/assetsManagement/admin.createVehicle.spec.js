import { loginAsAdminAndGetTokens, NOAUTH_MESSAGE_PATTERN, NOAUTH_CLASSIFICATIONS, NOAUTH_CODES, NOAUTH_HTTP_STATUSES } from '../../../helpers/auth.js';
import { safeGraphQL, bearer, getGQLError } from '../../../helpers/graphqlUtils.js';
import { test, expect } from '../../../globalConfig.api.js';
import { getAdminCredentials } from '../../../helpers/roleCredentials.js';
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
      const { accessToken, raw: loginRes } = await loginAsAdminAndGetTokens(api, getAdminCredentials('default'));
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

  test(
    'PHARMA-432 | Should fail create vehicle when vehicleType enum is invalid',
    {
      tag: ['@api', '@admin', '@negative', '@create', '@pharma-432'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsAdminAndGetTokens(api, getAdminCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Admin login failed').toBe(true);

      const invalidVehicleInput = {
        ...buildVehicleInput(),
        vehicleType: 'INVALID_VEHICLE_TYPE',
      };

      const createVehicleInvalidInputRes = await safeGraphQL(api, {
        query: CREATE_VEHICLE_MUTATION,
        variables: { vehicle: invalidVehicleInput },
        headers: bearer(accessToken),
      });

      expect(createVehicleInvalidInputRes.ok).toBe(false);
      if (createVehicleInvalidInputRes.httpOk) {
        const { message, code, classification } = getGQLError(createVehicleInvalidInputRes);
        expect(message, 'Expected GraphQL validation message for invalid vehicleType').toBeTruthy();
        expect.soft(code || classification, 'Expected GraphQL validation code/classification').toBeTruthy();
      } else {
        expect.soft(createVehicleInvalidInputRes.httpStatus).toBeGreaterThanOrEqual(400);
      }
    }
  );

  test(
    'PHARMA-444 | Should reuse existing vehicle when Idempotency-Key is reused',
    {
      tag: ['@api', '@admin', '@positive', '@create', '@pharma-444'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsAdminAndGetTokens(api, getAdminCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Admin login failed').toBe(true);

      const vehicleInput = buildVehicleInput();
      const firstIdempotencyKey = `vehicle-${randomAlphanumeric(16)}`;

      const firstCreateRes = await safeGraphQL(api, {
        query: CREATE_VEHICLE_MUTATION,
        variables: { vehicle: vehicleInput },
        headers: { ...bearer(accessToken), 'Idempotency-Key': firstIdempotencyKey },
      });
      expect(firstCreateRes.ok, firstCreateRes.error || 'First create vehicle call failed').toBe(true);

      const firstNode = firstCreateRes.body?.data?.administrator?.asset?.createVehicle;
      expect(firstNode, 'Missing first create vehicle node').toBeTruthy();
      expect.soft(typeof firstNode.id).toBe('string');

      const secondCreateSameKeyRes = await safeGraphQL(api, {
        query: CREATE_VEHICLE_MUTATION,
        variables: { vehicle: vehicleInput },
        headers: { ...bearer(accessToken), 'Idempotency-Key': firstIdempotencyKey },
      });
      expect(
        secondCreateSameKeyRes.ok,
        secondCreateSameKeyRes.error || 'Second create vehicle call with same key failed'
      ).toBe(true);

      const secondSameKeyNode = secondCreateSameKeyRes.body?.data?.administrator?.asset?.createVehicle;
      expect(secondSameKeyNode, 'Missing second create vehicle node (same key)').toBeTruthy();
      expect(secondSameKeyNode.id).toBe(firstNode.id);
    }
  );
});
