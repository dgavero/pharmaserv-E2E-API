import { test, expect } from '../../globalConfig.api.js';
import {
  safeGraphQL,
  adminLoginAndGetTokens,
  bearer,
  getGQLError,
  NOAUTH_MESSAGE_PATTERN,
  NOAUTH_CODES,
  NOAUTH_CLASSIFICATIONS,
} from '../../helpers/testUtilsAPI.js';

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

test.describe('GraphQL: Admin Set Rider Status', () => {
  test('Should set rider status to AVAILABLE @api @admin @positive @smoke', async ({ api }) => {
    // 1) Admin login
    const { accessToken, raw: adminLoginRes } = await adminLoginAndGetTokens(api, {
      username: process.env.ADMIN_USERNAME,
      password: process.env.ADMIN_PASSWORD,
    });
    expect(adminLoginRes.ok, adminLoginRes.error || 'Admin login failed').toBe(true);

    // 2) Hardcoded riderId
    const riderId = 9;

    // 3) Call mutation
    const setRiderAvailableRes = await safeGraphQL(api, {
      query: SET_RIDER_AVAILABLE_MUTATION,
      variables: { riderId },
      headers: bearer(accessToken),
    });
    expect(
      setRiderAvailableRes.ok,
      setRiderAvailableRes.error || 'administrator.rider.setAvailable failed'
    ).toBe(true);

    // 4) Assert status
    const statusNode = setRiderAvailableRes.body?.data?.administrator?.rider?.setAvailable;
    expect(statusNode, 'Missing data.administrator.rider.setAvailable').toBeTruthy();
    expect(statusNode.status).toBe('AVAILABLE');
  });

  test('Should NOT set rider status AVAILABLE with missing bearer token (401 Unauthorized) @api @admin @negative @smoke', async ({
    api,
    noAuth,
  }) => {
    const riderId = 9;

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
  });

  test('Should NOT set rider status AVAILABLE with invalid bearer token (401 Unauthorized) @api @admin @negative @smoke', async ({
    api,
    invalidAuth,
  }) => {
    const riderId = 9;

    const setRiderInvalidBearerRes = await safeGraphQL(api, {
      query: SET_RIDER_AVAILABLE_MUTATION,
      variables: { riderId },
      headers: invalidAuth,
    });

    expect(setRiderInvalidBearerRes.ok).toBe(false);
    expect(setRiderInvalidBearerRes.httpOk).toBe(false);
    expect(setRiderInvalidBearerRes.httpStatus).toBe(401);
  });
});

test.describe('GraphQL: Admin Set Rider Unavailable', () => {
  test('Should set rider status to UNAVAILABLE @api @admin @positive @smoke', async ({ api }) => {
    // 1) Admin login
    const { accessToken, raw: adminLoginRes } = await adminLoginAndGetTokens(api, {
      username: process.env.ADMIN_USERNAME,
      password: process.env.ADMIN_PASSWORD,
    });
    expect(adminLoginRes.ok, adminLoginRes.error || 'Admin login failed').toBe(true);

    // 2) Hardcoded riderId per spec
    const riderId = 9;

    // 3) Call mutation
    const setRiderUnavailableRes = await safeGraphQL(api, {
      query: SET_RIDER_UNAVAILABLE_MUTATION,
      variables: { riderId },
      headers: bearer(accessToken),
    });
    expect(
      setRiderUnavailableRes.ok,
      setRiderUnavailableRes.error || 'administrator.rider.setUnavailable failed'
    ).toBe(true);

    // 4) Assert status
    const statusNode = setRiderUnavailableRes.body?.data?.administrator?.rider?.setUnavailable;
    expect(statusNode, 'Missing data.administrator.rider.setUnavailable').toBeTruthy();
    expect(statusNode.status).toBe('UNAVAILABLE');
  });

  test('Should NOT set rider status UNAVAILABLE with missing bearer token (401 Unauthorized) @api @admin @negative @smoke', async ({
    api,
    noAuth,
  }) => {
    const riderId = 9;

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
  });

  test('Should NOT set rider status UNAVAILABLE with invalid bearer token (401 Unauthorized) @api @admin @negative @smoke', async ({
    api,
    invalidAuth,
  }) => {
    const riderId = 9;

    const setRiderUnavailableInvalidBearerRes = await safeGraphQL(api, {
      query: SET_RIDER_UNAVAILABLE_MUTATION,
      variables: { riderId },
      headers: invalidAuth,
    });

    expect(setRiderUnavailableInvalidBearerRes.ok).toBe(false);
    expect(setRiderUnavailableInvalidBearerRes.httpOk).toBe(false);
    expect(setRiderUnavailableInvalidBearerRes.httpStatus).toBe(401);
  });
});
