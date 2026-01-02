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

const GET_DOCUMENT_TOKEN_QUERY = /* GraphQL */ `
  query ($riderId: ID!, $type: DocumentType!) {
    administrator {
      rider {
        document(riderId: $riderId, type: $type) {
          type
          photo
        }
      }
    }
  }
`;

test.describe('GraphQL: Get Document Token', () => {
  test(
    'PHARMA-51 | Should be able to get document token with valid auth tokens',
    {
      tag: ['@api', '@admin', '@positive', '@pharma-51'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await adminLoginAndGetTokens(api, {
        username: process.env.ADMIN_USERNAME,
        password: process.env.ADMIN_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Admin login failed').toBe(true);

      const getDocumentTokenRes = await safeGraphQL(api, {
        query: GET_DOCUMENT_TOKEN_QUERY,
        variables: { riderId: process.env.RIDER_USERID, type: `DRIVER_LICENSE` },
        headers: bearer(accessToken),
      });

      // Main Assertion
      expect(getDocumentTokenRes.ok, getDocumentTokenRes.error || 'Get Document Token failed').toBe(
        true
      );

      // Get document token data
      const node = getDocumentTokenRes.body.data.administrator.rider.document;
      expect(node, 'Document Token is null').toBeTruthy();
    }
  );

  test(
    'PHARMA-52 | Should NOT be able to get document token with missing auth tokens',
    {
      tag: ['@api', '@admin', '@negative', '@pharma-52'],
    },
    async ({ api, noAuth }) => {
      const getDocumentTokenNoAuthRes = await safeGraphQL(api, {
        query: GET_DOCUMENT_TOKEN_QUERY,
        variables: { riderId: process.env.RIDER_USERID, type: `DRIVER_LICENSE` },
        headers: noAuth,
      });

      // Main Assertion
      expect(
        getDocumentTokenNoAuthRes.ok,
        getDocumentTokenNoAuthRes.error ||
          'Get Document Token With No Auth did NOT fail as expected'
      ).toBe(false);

      const { message, code, classification } = getGQLError(getDocumentTokenNoAuthRes);
      expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
      expect(NOAUTH_CODES).toContain(code);
      expect(NOAUTH_CLASSIFICATIONS).toContain(classification);
    }
  );

  test(
    'PHARMA-53 | Should NOT be able get document token with invalid Auth tokens',
    {
      tag: ['@api', '@admin', '@negative', '@pharma-53'],
    },
    async ({ api, invalidAuth }) => {
      const getDocumentTokenInvalidAuthRes = await safeGraphQL(api, {
        query: GET_DOCUMENT_TOKEN_QUERY,
        variables: { riderId: process.env.RIDER_USERID, type: `DRIVER_LICENSE` },
        headers: invalidAuth,
      });

      // Main Assertion
      expect(
        getDocumentTokenInvalidAuthRes.ok,
        getDocumentTokenInvalidAuthRes.error ||
          'Get Document Token With Invalid Auth did NOT fail as expected'
      ).toBe(false);

      // Transport-level 401 (no GraphQL errors[])
      expect(getDocumentTokenInvalidAuthRes.ok).toBe(false);
      expect(getDocumentTokenInvalidAuthRes.httpOk).toBe(false);
      expect(NOAUTH_HTTP_STATUSES).toContain(getDocumentTokenInvalidAuthRes.httpStatus);
    }
  );

  test(
    'PHARMA-54 | Should NOT be able to get document token with missing Blob Name',
    {
      tag: ['@api', '@admin', '@negative', '@pharma-54'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await adminLoginAndGetTokens(api, {
        username: process.env.ADMIN_USERNAME,
        password: process.env.ADMIN_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Admin login failed').toBe(true);

      const getDocumentTokenNoBlobNameRes = await safeGraphQL(api, {
        query: GET_DOCUMENT_TOKEN_QUERY,
        variables: { blobName: null },
        headers: bearer(accessToken),
      });

      // Main Assertion
      expect(
        getDocumentTokenNoBlobNameRes.ok,
        getDocumentTokenNoBlobNameRes.error ||
          'Get Document Token With No Blob Name did NOT fail as expected'
      ).toBe(false);

      const { message, classification } = getGQLError(getDocumentTokenNoBlobNameRes);
      expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
      expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
    }
  );
});
