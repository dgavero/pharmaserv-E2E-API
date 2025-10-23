import { heading } from 'discord.js';
import { randomAlphanumeric } from '../../../helpers/globalTestUtils.js';
import { test, expect } from '../../globalConfig.api.js';
import {
  safeGraphQL,
  bearer,
  adminLoginAndGetTokens,
  getGQLError,
  noAuth,
  INVALID_JWT,
} from '../../helpers/testUtilsAPI.js';

// GQL: Register Rider
const REGISTER_RIDER_MUTATION = `
  mutation ($rider: Register!) {
    administrator {
      rider {
        register(rider: $rider) {
          id
          uuid
          firstName
          lastName
          username
        }
      }
    }
  }
`;

test.describe('GraphQL: Rider Register', () => {
  test('Should Login As Admin And Register A New Rider @api @admin @positive @create', async ({
    api,
  }) => {
    const adminUser = process.env.ADMIN_USERNAME;
    const adminPass = process.env.ADMIN_PASSWORD;
    expect(adminUser, 'Missing ADMIN_USERNAME in env').toBeTruthy();
    expect(adminPass, 'Missing ADMIN_PASSWORD in env').toBeTruthy();

    const { accessToken } = await adminLoginAndGetTokens(api, {
      username: adminUser,
      password: adminPass,
    });

    // 2) Prepare unique rider input to avoid duplicates
    const suffix = randomAlphanumeric(8);
    const riderInput = {
      firstName: 'Dave',
      lastName: 'Rider',
      email: `daverider+${suffix}@example.com`,
      username: `daverider_${suffix}`,
      password: 'Password123',
    };

    // 3) Call register
    const reg = await test.step('Register rider', async () =>
      safeGraphQL(api, {
        query: REGISTER_RIDER_MUTATION,
        variables: { rider: riderInput },
        headers: bearer(accessToken),
      }));

    // 4) Assert success + payload contract
    expect(reg.ok, reg.error || `Register failed (HTTP ${reg.httpStatus})`).toBe(true);

    const node = reg.body?.data?.administrator?.rider?.register;
    expect(node, 'Missing data.administrator.rider.register').toBeTruthy();
    expect.soft(typeof node.id).toBe('string');
    expect.soft(typeof node.uuid).toBe('string');
    expect.soft(typeof node.firstName).toBe('string');
    expect.soft(typeof node.lastName).toBe('string');
    expect.soft(typeof node.username).toBe('string');

    expect.soft(node.firstName).toBe(riderInput.firstName);
    expect.soft(node.lastName).toBe(riderInput.lastName);
    expect.soft(node.username).toBe(riderInput.username);

    // loose UUIDv4 check
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect.soft(node.uuid).toMatch(uuidRe);
  });

  test('Should Reject Duplicate Rider Registration @api @admin @negative @create', async ({
    api,
  }) => {
    // 1) Admin login
    const { accessToken } = await adminLoginAndGetTokens(api, {
      username: process.env.ADMIN_USERNAME,
      password: process.env.ADMIN_PASSWORD,
    });

    // 2) Known-duplicate payload
    const existingRider = {
      firstName: 'Dave',
      lastName: 'Rider',
      email: 'daverider1@yahoo.com',
      username: 'daverider1.rider',
      password: 'Password123',
    };

    // 3) Attempt duplicate register
    const regDupeRider = await test.step('Register duplicate rider @create', async () =>
      safeGraphQL(api, {
        query: REGISTER_RIDER_MUTATION,
        variables: { rider: existingRider },
        headers: bearer(accessToken),
      }));

    // 4) Assert failure (either transport 409 or resolver error)
    expect(regDupeRider.ok).toBe(false);

    if (!regDupeRider.httpOk) {
      // Transport layer blocked it (e.g., HTTP 409)
      expect(regDupeRider.httpStatus).toBe(409);
      return;
    }

    // Resolver error path (HTTP 200 + errors[])
    const { message, code, classification } = getGQLError(regDupeRider);

    // Fuzzy message: just check the key phrase (case-insensitive)
    expect(message.toLowerCase()).toContain('already registered');

    // Soft checks
    expect.soft(code).toBe('409');
    expect.soft(classification).toBe('CONFLICT');
  });

  // Unauthorized (no bearer) → expect 401 transport or UNAUTHORIZED
  test('Should Reject Register Without Token @api @admin @negative @create', async ({ api }) => {
    const suffix = `${Date.now()}`;
    const riderInput = {
      firstName: 'NoAuth',
      lastName: 'Rider',
      email: `noauth+${suffix}@example.com`,
      username: `noauth_${suffix}`,
      password: 'Password123',
    };

    const regRiderNoToken = await test.step('Register rider without token @create', async () =>
      safeGraphQL(api, {
        query: REGISTER_RIDER_MUTATION, // test-level mutation
        variables: { rider: riderInput },
      }));

    // Expect failure
    expect(regRiderNoToken.ok).toBe(false);

    // Resolver error contract (HTTP 200 + errors[])
    const { message, code, classification } = getGQLError(regRiderNoToken);

    // Hard check: message contains “Unauthorized access”
    expect(message.toLowerCase()).toContain('unauthorized access');

    // Soft checks: code & classification
    expect.soft(code).toBe('401');
    expect.soft(classification).toBe('UNAUTHORIZED');
  });

  // Missing required field (password = empty) → INTERNAL_SERVER_ERROR (500)
  test('Should Reject Missing Password @api @admin @negative @create', async ({ api }) => {
    // Admin login
    const { accessToken } = await adminLoginAndGetTokens(api, {
      username: process.env.ADMIN_USERNAME,
      password: process.env.ADMIN_PASSWORD,
    });

    const suffix = `${Date.now()}`;
    const riderInput = {
      firstName: 'NoPass',
      lastName: 'Rider',
      email: `nopass+${suffix}@example.com`,
      username: `nopass_${suffix}`,
      password: '', // ← intentionally empty
    };

    const regRiderNoPass = await test.step('Register rider with empty password', async () =>
      safeGraphQL(api, {
        query: REGISTER_RIDER_MUTATION, // ← reuse test-level mutation
        variables: { rider: riderInput },
        headers: bearer(accessToken),
      }));

    // Expect failure
    expect(regRiderNoPass.ok).toBe(false);

    // Resolver error path: fuzzy message + soft code/classification
    const { message, code, classification } = getGQLError(regRiderNoPass);
    expect(message.toUpperCase()).toContain('INTERNAL_SERVER_ERROR');

    expect.soft(code).toBe('500');
    expect.soft(classification).toBe('INTERNAL_ERROR');
  });
});
