import { randomAlphanumeric, randomNum } from '../../../../helpers/globalTestUtils.js';
import { test, expect } from '../../../globalConfig.api.js';
import {
  safeGraphQL,
  bearer,
  adminLoginAndGetTokens,
  getGQLError,
  NOAUTH_MESSAGE_PATTERN,
  NOAUTH_CLASSIFICATIONS,
  NOAUTH_CODES,
  NOAUTH_HTTP_STATUSES,
} from '../../../helpers/testUtilsAPI.js';

// RiderID to update
const riderId = 4;

// GQL: Update Rider
const UPDATE_RIDER_MUTATION = /* GraphQL */ `
  mutation ($riderId: ID!, $rider: RiderRequest!) {
    administrator {
      rider {
        update(riderId: $riderId, rider: $rider) {
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

function buildRiderUpdateInput() {
  const firstName = `UpdatedFirstName${randomAlphanumeric(4)}`;
  const lastName = `UpdatedLastName${randomAlphanumeric(4)}`;
  const email = `updatedrider+${randomAlphanumeric(8)}@example.com`;
  const username = `updatedrider_${randomAlphanumeric(8)}`;
  const phoneNumber = `+63${randomNum(10)}`;
  return { firstName, lastName, email, username, phoneNumber };
}

test.describe('GraphQL: Update Rider', () => {
  test(
    'PHARMA-44 | Should be able to Update Rider Details [4] with valid Auth',
    {
      tag: ['@api', '@admin', '@positive', '@pharma-44'],
    },
    async ({ api }) => {
      // Login to get tokens
      const { accessToken, raw: loginRes } = await adminLoginAndGetTokens(api, {
        username: process.env.ADMIN_USERNAME,
        password: process.env.ADMIN_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Admin login failed').toBe(true);

      // Build update input
      const riderUpdateInput = buildRiderUpdateInput();

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
      const { accessToken, raw: loginRes } = await adminLoginAndGetTokens(api, {
        username: process.env.ADMIN_USERNAME,
        password: process.env.ADMIN_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Admin login failed').toBe(true);

      // Build update input with missing firstName
      const riderUpdateInput = buildRiderUpdateInput();
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
});
