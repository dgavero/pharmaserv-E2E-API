import {
  loginAsAdminAndGetTokens,
  NOAUTH_MESSAGE_PATTERN,
  NOAUTH_CLASSIFICATIONS,
  NOAUTH_CODES,
  NOAUTH_HTTP_STATUSES,
} from '../../../helpers/auth.js';
import { safeGraphQL, bearer, getGQLError } from '../../../helpers/graphqlUtils.js';
import { test, expect } from '../../../globalConfig.api.js';
import { getAdminCredentials, getRiderAccount } from '../../../helpers/roleCredentials.js';

const defaultRiderAccount = getRiderAccount('default');

const GET_RIDER_DOCUMENT_QUERY = /* GraphQL */ `
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

const GET_RIDER_DOCUMENTS_QUERY = /* GraphQL */ `
  query ($riderId: ID!) {
    administrator {
      rider {
        documents(riderId: $riderId) {
          type
          photo
        }
      }
    }
  }
`;

const riderId = defaultRiderAccount.riderId;
const riderDocumentType = 'DRIVER_LICENSE';

test.describe('GraphQL: Admin Rider Documents', () => {
  test(
    'PHARMA-377 | Should get rider document with valid auth tokens',
    {
      tag: ['@api', '@admin', '@positive', '@pharma-377'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsAdminAndGetTokens(api, getAdminCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Admin login failed').toBe(true);

      const getRiderDocumentRes = await safeGraphQL(api, {
        query: GET_RIDER_DOCUMENT_QUERY,
        variables: { riderId, type: riderDocumentType },
        headers: bearer(accessToken),
      });

      expect(getRiderDocumentRes.ok, getRiderDocumentRes.error || 'Get rider document endpoint failed').toBe(true);

      const node = getRiderDocumentRes.body?.data?.administrator?.rider?.document;
      expect(node, 'Get rider document endpoint returned no data').toBeTruthy();
      expect(node.type).toBe(riderDocumentType);
      expect.soft(typeof node.photo).toBe('string');
    }
  );

  test(
    'PHARMA-378 | Should NOT get rider document with missing auth tokens',
    {
      tag: ['@api', '@admin', '@negative', '@pharma-378'],
    },
    async ({ api, noAuth }) => {
      const getRiderDocumentNoAuthRes = await safeGraphQL(api, {
        query: GET_RIDER_DOCUMENT_QUERY,
        variables: { riderId, type: riderDocumentType },
        headers: noAuth,
      });

      expect(getRiderDocumentNoAuthRes.ok, getRiderDocumentNoAuthRes.error || 'Expected UNAUTHORIZED when missing token').toBe(
        false
      );

      if (!getRiderDocumentNoAuthRes.httpOk) {
        expect(NOAUTH_HTTP_STATUSES).toContain(getRiderDocumentNoAuthRes.httpStatus);
      } else {
        const { message, code, classification } = getGQLError(getRiderDocumentNoAuthRes);
        expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
        expect.soft(NOAUTH_CODES).toContain(code);
        expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
      }
    }
  );

  test(
    'PHARMA-379 | Should NOT get rider document with invalid auth tokens',
    {
      tag: ['@api', '@admin', '@negative', '@pharma-379'],
    },
    async ({ api, invalidAuth }) => {
      const getRiderDocumentInvalidAuthRes = await safeGraphQL(api, {
        query: GET_RIDER_DOCUMENT_QUERY,
        variables: { riderId, type: riderDocumentType },
        headers: invalidAuth,
      });

      expect(getRiderDocumentInvalidAuthRes.ok).toBe(false);
      expect(getRiderDocumentInvalidAuthRes.httpOk).toBe(false);
      expect(NOAUTH_HTTP_STATUSES).toContain(getRiderDocumentInvalidAuthRes.httpStatus);
    }
  );

  test(
    'PHARMA-380 | Should get rider documents with valid auth tokens',
    {
      tag: ['@api', '@admin', '@positive', '@pharma-380'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsAdminAndGetTokens(api, getAdminCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Admin login failed').toBe(true);

      const getRiderDocumentsRes = await safeGraphQL(api, {
        query: GET_RIDER_DOCUMENTS_QUERY,
        variables: { riderId },
        headers: bearer(accessToken),
      });

      expect(getRiderDocumentsRes.ok, getRiderDocumentsRes.error || 'Get rider documents endpoint failed').toBe(true);

      const node = getRiderDocumentsRes.body?.data?.administrator?.rider?.documents;
      expect(Array.isArray(node), 'Get rider documents should return an array').toBe(true);
      expect(node.length, 'Get rider documents should return at least one document').toBeGreaterThan(0);
      expect(node.some((documentNode) => documentNode?.type === riderDocumentType), 'Expected rider document type was not returned').toBe(
        true
      );
    }
  );

  test(
    'PHARMA-381 | Should NOT get rider documents with missing auth tokens',
    {
      tag: ['@api', '@admin', '@negative', '@pharma-381'],
    },
    async ({ api, noAuth }) => {
      const getRiderDocumentsNoAuthRes = await safeGraphQL(api, {
        query: GET_RIDER_DOCUMENTS_QUERY,
        variables: { riderId },
        headers: noAuth,
      });

      expect(getRiderDocumentsNoAuthRes.ok, getRiderDocumentsNoAuthRes.error || 'Expected UNAUTHORIZED when missing token').toBe(
        false
      );

      if (!getRiderDocumentsNoAuthRes.httpOk) {
        expect(NOAUTH_HTTP_STATUSES).toContain(getRiderDocumentsNoAuthRes.httpStatus);
      } else {
        const { message, code, classification } = getGQLError(getRiderDocumentsNoAuthRes);
        expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
        expect.soft(NOAUTH_CODES).toContain(code);
        expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
      }
    }
  );

  test(
    'PHARMA-382 | Should NOT get rider documents with invalid auth tokens',
    {
      tag: ['@api', '@admin', '@negative', '@pharma-382'],
    },
    async ({ api, invalidAuth }) => {
      const getRiderDocumentsInvalidAuthRes = await safeGraphQL(api, {
        query: GET_RIDER_DOCUMENTS_QUERY,
        variables: { riderId },
        headers: invalidAuth,
      });

      expect(getRiderDocumentsInvalidAuthRes.ok).toBe(false);
      expect(getRiderDocumentsInvalidAuthRes.httpOk).toBe(false);
      expect(NOAUTH_HTTP_STATUSES).toContain(getRiderDocumentsInvalidAuthRes.httpStatus);
    }
  );
});
