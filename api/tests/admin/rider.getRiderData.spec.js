import { randomAlphanumeric, randomNum } from '../../../helpers/globalTestUtils.js';
import { test, expect } from '../../globalConfig.api.js';
import {
  safeGraphQL,
  bearer,
  adminLoginAndGetTokens,
  getGQLError,
  NOAUTH_MESSAGE_PATTERN,
  NOAUTH_CLASSIFICATIONS,
  NOAUTH_CODES,
  NOAUTH_HTTP_STATUSES,
} from '../../helpers/testUtilsAPI.js';

// RiderID to getData
const riderId = '1';
const riderUUID = '5d6d557f-2a22-431e-b0de-4c93211c500c';
const riderFirstName = 'Patrick';

const GET_RIDER_MUTATION = /* GraphQL */ `
  query ($by: IdentifierRequest!) {
    administrator {
      rider {
        detail(by: $by) {
          id
          uuid
          username
          email
          firstName
          lastName
          status
        }
      }
    }
  }
`;

test.describe('GraphQL: Get Rider Detail', () => {
  test(
    'PHARMA-48 | Should be able to get Rider Details [1] with valid Auth',
    {
      tag: ['@api', '@admin', '@positive', '@pharma-48'],
    },
    async ({ api }) => {
      // Login to get tokens
      const { accessToken, raw: loginRes } = await adminLoginAndGetTokens(api, {
        username: process.env.ADMIN_USERNAME,
        password: process.env.ADMIN_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Admin login failed').toBe(true);

      // get rider detail
      const getRiderRes = await safeGraphQL(api, {
        query: GET_RIDER_MUTATION,
        variables: {
          by: { id: riderId },
        },
        headers: bearer(accessToken),
      });

      // Main Assertion
      expect(getRiderRes.ok, getRiderRes.error || 'Get Rider Detail failed').toBe(true);

      // Get rider data and asset
      const node = getRiderRes.body?.data?.administrator?.rider?.detail;
      expect(node, 'Rider detail is null').toBeTruthy();

      expect(node.id).toBe(riderId);
      expect(node.uuid).toBe(riderUUID);
      expect(node.firstName).toBe(riderFirstName);
    }
  );

  test(
    'PHARMA-49 | Should NOT be able to get Rider Details [1] with missing Auth token',
    {
      tag: ['@api', '@admin', '@negative', '@pharma-49'],
    },
    async ({ api, noAuth }) => {
      const getRiderNoAuthRes = await safeGraphQL(api, {
        query: GET_RIDER_MUTATION,
        variables: {
          by: { id: riderId },
        },
        headers: noAuth,
      });

      // Main Assertion
      expect(getRiderNoAuthRes.ok, 'Expected UNAUTHORIZED when missing token').toBe(false);
      const { message, code, classification } = getGQLError(getRiderNoAuthRes);
      expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
      expect.soft(NOAUTH_CODES).toContain(code);
      expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
    }
  );
});

test(
  'PHARMA-50 | Should NOT be able to get Rider Details [1] with invalid Auth token',
  {
    tag: ['@api', '@admin', '@negative', '@pharma-50'],
  },
  async ({ api, invalidAuth }) => {
    const getRiderInvalidAuthRes = await safeGraphQL(api, {
      query: GET_RIDER_MUTATION,
      variables: {
        by: { id: riderId },
      },
      headers: invalidAuth,
    });

    // Main Assertion
    expect(getRiderInvalidAuthRes.ok, 'Expected UNAUTHORIZED with invalid token').toBe(false);

    // Transport-level 401 (no GraphQL errors[])
    expect(getRiderInvalidAuthRes.ok).toBe(false);
    expect(getRiderInvalidAuthRes.httpOk).toBe(false);
    expect(NOAUTH_HTTP_STATUSES).toContain(getRiderInvalidAuthRes.httpStatus);
  }
);
