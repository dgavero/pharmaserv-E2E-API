import { loginAsAdminAndGetTokens, NOAUTH_MESSAGE_PATTERN, NOAUTH_CLASSIFICATIONS, NOAUTH_CODES, NOAUTH_HTTP_STATUSES } from '../../../helpers/auth.js';
import { safeGraphQL, bearer, getGQLError } from '../../../helpers/graphqlUtils.js';
import { test, expect } from '../../../globalConfig.api.js';
import { getAdminCredentials, getRiderAccount } from '../../../helpers/roleCredentials.js';
import { randomAlphanumeric, randomNum } from '../../../../helpers/globalTestUtils.js';
import { REGISTER_RIDER_MUTATION, UPDATE_RIDER_MUTATION } from './rider.riderManagementQueries.js';

const defaultRiderAccount = getRiderAccount('default');

function buildRiderUpdateInput() {
  const firstName = `UpdatedFirstName${randomAlphanumeric(4)}`;
  const lastName = `UpdatedLastName${randomAlphanumeric(4)}`;
  const email = `updatedrider+${randomAlphanumeric(8)}@example.com`;
  const username = `updatedrider_${randomAlphanumeric(8)}`;
  const phoneNumber = `+639${String(randomNum(9)).padStart(9, '0')}`;
  const houseNumber = `${randomNum(3)}`;
  const street = `${randomNum(3)} Main St`;
  const barangay = `Barangay ${randomAlphanumeric(4)}`;
  const city = `Manila`;
  const zipCode = `${randomNum(4)}`;
  return {
    firstName,
    lastName,
    email,
    username,
    phoneNumber,
    houseNumber,
    street,
    barangay,
    city,
    zipCode,
  };
}

async function registerRiderForUpdate(api, accessToken) {
  const riderInput = buildRiderUpdateInput();
  const registerRiderRes = await safeGraphQL(api, {
    query: REGISTER_RIDER_MUTATION,
    variables: { rider: { ...riderInput, password: 'Password123' } },
    headers: bearer(accessToken),
  });
  expect(registerRiderRes.ok, registerRiderRes.error || 'Register rider setup failed').toBe(true);

  const riderId = registerRiderRes.body?.data?.administrator?.rider?.register?.id;
  expect(riderId, 'Missing rider id from register rider setup').toBeTruthy();
  return riderId;
}

test.describe('GraphQL: Update Rider', () => {
  test(
    'PHARMA-44 | Should be able to Update Rider Details [4] with valid Auth',
    {
      tag: ['@api', '@admin', '@positive', '@pharma-44'],
    },
    async ({ api }) => {
      // Login to get tokens
      const { accessToken, raw: loginRes } = await loginAsAdminAndGetTokens(api, getAdminCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Admin login failed').toBe(true);

      // Build update input
      const riderUpdateInput = buildRiderUpdateInput();
      const riderId = await registerRiderForUpdate(api, accessToken);

      const updateRiderRes = await safeGraphQL(api, {
        query: UPDATE_RIDER_MUTATION,
        variables: {
          riderId,
          rider: riderUpdateInput,
        },
        headers: bearer(accessToken),
      });

      // Main Assertion
      expect(updateRiderRes.ok, updateRiderRes.error || 'Update rider detail failed').toBe(true);

      const node = updateRiderRes.body?.data?.administrator?.rider?.update;
      expect(node, 'Missing data.administrator.rider.update').toBeTruthy();

      // Soft checks
      expect.soft(node.firstName).toBe(riderUpdateInput.firstName);
      expect.soft(node.lastName).toBe(riderUpdateInput.lastName);
      expect.soft(node.username).toBe(riderUpdateInput.username);
      expect.soft(typeof node.uuid).toBe('string');
    }
  );

  test(
    'PHARMA-45 | Should NOT be able to Update Rider Details [4] with missing required data',
    {
      tag: ['@api', '@admin', '@negative', '@pharma-45'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsAdminAndGetTokens(api, getAdminCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Admin login failed').toBe(true);

      // Build update input with missing firstName
      const riderUpdateInput = buildRiderUpdateInput();
      const riderId = await registerRiderForUpdate(api, accessToken);
      delete riderUpdateInput.firstName;

      const updateRiderRes = await safeGraphQL(api, {
        query: UPDATE_RIDER_MUTATION,
        variables: {
          riderId,
          rider: riderUpdateInput,
        },
        headers: bearer(accessToken),
      });

      // Main Assertion
      expect(updateRiderRes.ok, 'Expected GraphQL error response').toBe(false);

      const { message, classification } = getGQLError(updateRiderRes);
      expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
      expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
    }
  );

  test(
    'PHARMA-46 | Should NOT be able to Update Rider Details [4] without Auth tokens',
    { tag: ['@api', '@admin', '@negative', '@pharma-46'] },
    async ({ api, noAuth }) => {
      const riderUpdateInput = buildRiderUpdateInput();
      const riderId = defaultRiderAccount.riderId;

      const updateRiderNoAuth = await safeGraphQL(api, {
        query: UPDATE_RIDER_MUTATION,
        variables: {
          riderId,
          rider: riderUpdateInput,
        },
        headers: noAuth,
      });

      // Main Assertion
      expect(updateRiderNoAuth.ok, 'Expected UNAUTHORIZED when missing token').toBe(false);

      const { message, code, classification } = getGQLError(updateRiderNoAuth);
      expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
      expect.soft(NOAUTH_CODES).toContain(code);
      expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
    }
  );

  test(
    'PHARMA-47 | Should NOT be able to Update Rider Details [4] with invalid Auth tokens',
    {
      tag: ['@api', '@admin', '@negative', '@pharma-47'],
    },
    async ({ api, invalidAuth }) => {
      const riderUpdateInput = buildRiderUpdateInput();
      const riderId = defaultRiderAccount.riderId;

      const updateRiderInvalidAuth = await safeGraphQL(api, {
        query: UPDATE_RIDER_MUTATION,
        variables: {
          riderId,
          rider: riderUpdateInput,
        },
        headers: invalidAuth,
      });

      // Main Assertion
      expect(updateRiderInvalidAuth.ok, 'Expected UNAUTHORIZED with invalid token').toBe(false);

      // Transport-level 401 (no GraphQL errors[])
      expect(updateRiderInvalidAuth.ok).toBe(false);
      expect(updateRiderInvalidAuth.httpOk).toBe(false);
      expect(NOAUTH_HTTP_STATUSES).toContain(updateRiderInvalidAuth.httpStatus);
    }
  );

  test(
    'PHARMA-480 | Update rider should satisfy response contract shape',
    {
      tag: ['@api', '@admin', '@positive', '@pharma-480'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsAdminAndGetTokens(api, getAdminCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Admin login failed').toBe(true);

      const riderUpdateInput = buildRiderUpdateInput();
      const riderId = await registerRiderForUpdate(api, accessToken);

      const updateRiderRes = await safeGraphQL(api, {
        query: UPDATE_RIDER_MUTATION,
        variables: {
          riderId,
          rider: riderUpdateInput,
        },
        headers: bearer(accessToken),
      });

      expect(updateRiderRes.httpStatus).toBe(200);
      expect(updateRiderRes.httpOk).toBe(true);
      expect(updateRiderRes.ok, updateRiderRes.error || 'Update rider detail failed').toBe(true);

      const node = updateRiderRes.body?.data?.administrator?.rider?.update;
      expect(node, 'Missing data.administrator.rider.update').toBeTruthy();
      expect.soft(typeof node?.id).toBe('string');
      expect.soft(typeof node?.uuid).toBe('string');
      expect.soft(typeof node?.firstName).toBe('string');
      expect.soft(typeof node?.lastName).toBe('string');
      expect.soft(typeof node?.username).toBe('string');
      expect.soft(node.id).toBe(String(riderId));
      expect.soft(node.firstName).toBe(riderUpdateInput.firstName);
      expect.soft(node.lastName).toBe(riderUpdateInput.lastName);
      expect.soft(node.username).toBe(riderUpdateInput.username);
    }
  );
});
