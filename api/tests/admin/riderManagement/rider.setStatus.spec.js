import { test, expect } from '../../../globalConfig.api.js';
import {
  safeGraphQL,
  adminLoginAndGetTokens,
  bearer,
  getGQLError,
  NOAUTH_MESSAGE_PATTERN,
  NOAUTH_CODES,
  NOAUTH_CLASSIFICATIONS,
} from '../../../helpers/testUtilsAPI.js';

const SET_RIDER_AVAILABLE_MUTATION = `
  mutation ($riderId: ID!) {
    administrator {
      rider {
        setAvailable(riderId: $riderId) {
          status
        }
      }
    }
  }
`;

const SET_RIDER_UNAVAILABLE_MUTATION = `
  mutation ($riderId: ID!) {
    administrator {
      rider {
        setUnavailable(riderId: $riderId) {
          status
        }
      }
    }
  }
`;

// Hardcoded expected riderId
const riderId = 1;

test.describe('GraphQL: Admin Set Rider Status', () => {
  test(
    'PHARMA-35 | Should be able to set rider status to AVAILABLE with valid Auth',
    {
      tag: ['@api', '@admin', '@positive', '@pharma-35'],
    },
    async ({ api }) => {
      // Admin login
      const { accessToken, raw: adminLoginRes } = await adminLoginAndGetTokens(api, {
        username: process.env.ADMIN_USERNAME,
        password: process.env.ADMIN_PASSWORD,
      });
      expect(adminLoginRes.ok, adminLoginRes.error || 'Admin login failed').toBe(true);

      // Call mutation
      const setRiderAvailableRes = await safeGraphQL(api, {
        query: SET_RIDER_AVAILABLE_MUTATION,
        variables: { riderId },
        headers: bearer(accessToken),
      });

      // Main Assertion
      expect(
        setRiderAvailableRes.ok,
        setRiderAvailableRes.error || 'administrator.rider.setAvailable failed'
      ).toBe(true);

      const statusNode = setRiderAvailableRes.body?.data?.administrator?.rider?.setAvailable;
      expect(statusNode, 'Missing data.administrator.rider.setAvailable').toBeTruthy();
      expect(statusNode.status).toBe('AVAILABLE');
    }
  );

  test(
    'PHARMA-36 | Should NOT be able set rider status AVAILABLE with no Auth',
    {
      tag: ['@api', '@admin', '@negative', '@pharma-36'],
    },
    async ({ api, noAuth }) => {
      const setRiderMissingBearerRes = await safeGraphQL(api, {
        query: SET_RIDER_AVAILABLE_MUTATION,
        variables: { riderId },
        headers: noAuth,
      });

      expect(setRiderMissingBearerRes.ok).toBe(false);

      if (!setRiderMissingBearerRes.httpOk) {
        expect(setRiderMissingBearerRes.httpStatus).toBe(401);
      } else {
        const { message, code, classification } = getGQLError(setRiderMissingBearerRes);
        expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
        expect.soft(NOAUTH_CODES).toContain(code);
        expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
      }
    }
  );

  test(
    'PHARMA-37 | Should NOT be able toset rider status AVAILABLE with invalid Auth',
    {
      tag: ['@api', '@admin', '@negative', '@pharma-37'],
    },
    async ({ api, invalidAuth }) => {
      const setRiderInvalidBearerRes = await safeGraphQL(api, {
        query: SET_RIDER_AVAILABLE_MUTATION,
        variables: { riderId },
        headers: invalidAuth,
      });

      expect(setRiderInvalidBearerRes.ok).toBe(false);
      expect(setRiderInvalidBearerRes.httpOk).toBe(false);
      expect(setRiderInvalidBearerRes.httpStatus).toBe(401);
    }
  );
});

test.describe('GraphQL: Admin Set Rider Unavailable', () => {
  test(
    'PHARMA-38 | Should be able to set rider status to UNAVAILABLE with Valid Auth',
    {
      tag: ['@api', '@admin', '@positive', '@pharma-38'],
    },
    async ({ api }) => {
      // Admin login
      const { accessToken, raw: adminLoginRes } = await adminLoginAndGetTokens(api, {
        username: process.env.ADMIN_USERNAME,
        password: process.env.ADMIN_PASSWORD,
      });
      expect(adminLoginRes.ok, adminLoginRes.error || 'Admin login failed').toBe(true);

      // Call mutation
      const setRiderUnavailableRes = await safeGraphQL(api, {
        query: SET_RIDER_UNAVAILABLE_MUTATION,
        variables: { riderId },
        headers: bearer(accessToken),
      });

      // Main Assertion
      expect(
        setRiderUnavailableRes.ok,
        setRiderUnavailableRes.error || 'administrator.rider.setUnavailable failed'
      ).toBe(true);

      const statusNode = setRiderUnavailableRes.body?.data?.administrator?.rider?.setUnavailable;
      expect(statusNode, 'Missing data.administrator.rider.setUnavailable').toBeTruthy();
      expect(statusNode.status).toBe('UNAVAILABLE');
    }
  );

  test(
    'PHARMA-39 | Should NOT set rider status UNAVAILABLE with no Auth',
    {
      tag: ['@api', '@admin', '@negative', '@pharma-39'],
    },
    async ({ api, noAuth }) => {
      const setRiderUnavailableMissingBearerRes = await safeGraphQL(api, {
        query: SET_RIDER_UNAVAILABLE_MUTATION,
        variables: { riderId },
        headers: noAuth,
      });

      expect(setRiderUnavailableMissingBearerRes.ok).toBe(false);

      if (!setRiderUnavailableMissingBearerRes.httpOk) {
        expect(setRiderUnavailableMissingBearerRes.httpStatus).toBe(401);
      } else {
        const { message, code, classification } = getGQLError(setRiderUnavailableMissingBearerRes);
        expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
        expect.soft(NOAUTH_CODES).toContain(code);
        expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
      }
    }
  );

  test(
    'PHARMA-40 | Should NOT be able to set rider status UNAVAILABLE with invalid Auth',
    {
      tag: ['@api', '@admin', '@negative', '@pharma-40'],
    },
    async ({ api, invalidAuth }) => {
      const setRiderUnavailableInvalidBearerRes = await safeGraphQL(api, {
        query: SET_RIDER_UNAVAILABLE_MUTATION,
        variables: { riderId },
        headers: invalidAuth,
      });

      expect(setRiderUnavailableInvalidBearerRes.ok).toBe(false);
      expect(setRiderUnavailableInvalidBearerRes.httpOk).toBe(false);
      expect(setRiderUnavailableInvalidBearerRes.httpStatus).toBe(401);
    }
  );
});
