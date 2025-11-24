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

const SET_RIDER_DOCUMENT_QUERY = /* GraphQL */ `
  mutation ($riderId: ID!, $document: DocumentRequest!) {
    administrator {
      rider {
        setDocument(riderId: $riderId, document: $document) {
          type
          photo
        }
      }
    }
  }
`;

function buildRiderDocument() {
  const type = `DRIVER_LICENSE`;
  const photo = `dd-123456-8888-5643.png`;
  const riderId = 2;
  return { riderId, type, photo };
}
const riderDocument = buildRiderDocument();

test.describe('GraphQL: Set Rider Document', () => {
  test(
    'PHARMA-55 | Should be able to Set Rider Document with valid Auth tokens',
    {
      tag: ['@api', '@admin', '@positive', '@pharma-55'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await adminLoginAndGetTokens(api, {
        username: process.env.ADMIN_USERNAME,
        password: process.env.ADMIN_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Admin login failed').toBe(true);

      const setRiderDocumentRes = await safeGraphQL(api, {
        query: SET_RIDER_DOCUMENT_QUERY,
        variables: {
          riderId: riderDocument.riderId,
          document: {
            type: riderDocument.type,
            photo: riderDocument.photo,
          },
        },
        headers: bearer(accessToken),
      });

      // Main Assertion
      expect(setRiderDocumentRes.ok, setRiderDocumentRes.error || 'Set Rider Document failed').toBe(
        true
      );

      // Get set rider document data
      const node = setRiderDocumentRes.body.data.administrator.rider.setDocument;
      expect(node, 'Set Rider Document is null').toBeTruthy();
      expect(node.type).toBe(riderDocument.type);
      expect(node.photo).toBe(riderDocument.photo);
    }
  );

  test(
    'PHARMA-56 | Should NOT be able to Set Rider Document with missing Auth tokens',
    {
      tag: ['@api', '@admin', '@negative', '@pharma-56'],
    },
    async ({ api, noAuth }) => {
      const setRiderDocumentRes = await safeGraphQL(api, {
        query: SET_RIDER_DOCUMENT_QUERY,
        variables: {
          riderId: riderDocument.riderId,
          document: {
            type: `DRIVER_LICENSE`,
            photo: `dd-123456-8888-5643.png`,
          },
        },
        headers: noAuth,
      });

      // Main Assertion
      expect(setRiderDocumentRes.ok, 'Set Rider Document with NO Auth did fail as expected').toBe(
        false
      );

      const { message, code, classification } = getGQLError(setRiderDocumentRes);
      expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
      expect(NOAUTH_CODES).toContain(code);
      expect(NOAUTH_CLASSIFICATIONS).toContain(classification);
    }
  );

  test(
    'PHARMA-57 | Should NOT be able to Set Rider Document with invalid Auth tokens',
    {
      tag: ['@api', '@admin', '@negative', '@pharma57'],
    },
    async ({ api, invalidAuth }) => {
      const setRiderDocumentInvalidAuthRes = await safeGraphQL(api, {
        query: SET_RIDER_DOCUMENT_QUERY,
        variables: {
          riderId: riderDocument.riderId,
          document: {
            type: `DRIVER_LICENSE`,
            photo: `dd-123456-8888-5643.png`,
          },
        },
        headers: invalidAuth,
      });

      // Main Assertion
      expect(
        setRiderDocumentInvalidAuthRes.ok,
        'Set Rider Document with INVALID Auth did NOT fail as expected'
      ).toBe(false);

      // Transport-level 401 (no GraphQL errors[])
      expect(setRiderDocumentInvalidAuthRes.ok).toBe(false);
      expect(setRiderDocumentInvalidAuthRes.httpOk).toBe(false);
      expect(NOAUTH_HTTP_STATUSES).toContain(setRiderDocumentInvalidAuthRes.httpStatus);
    }
  );

  test(
    'PHARMA-58 | Should NOT be able to Set Rider Document with missing input data [photo]',
    {
      tag: ['@api', '@admin', '@negative', '@pharma-58'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await adminLoginAndGetTokens(api, {
        username: process.env.ADMIN_USERNAME,
        password: process.env.ADMIN_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Admin login failed').toBe(true);

      const setRiderDocumentMissingPhotoRes = await safeGraphQL(api, {
        query: SET_RIDER_DOCUMENT_QUERY,
        variables: {
          riderId: riderDocument.riderId,
          document: {
            type: riderDocument.type,
            photo: null, // Missing photo
          },
        },
        headers: bearer(accessToken),
      });

      // Main Assertion
      expect(
        setRiderDocumentMissingPhotoRes.ok,
        'Set Rider Document with missing photo did NOT fail as expected'
      ).toBe(false);

      const { message, classification } = getGQLError(setRiderDocumentMissingPhotoRes);
      expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
      expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
    }
  );
});
