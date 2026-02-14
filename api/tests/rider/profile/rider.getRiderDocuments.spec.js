import { test, expect } from '../../../globalConfig.api.js';
import { RIDER_GET_DOCUMENTS_QUERY } from './rider.profileQueries.js';
import {
  safeGraphQL,
  bearer,
  getGQLError,
  riderLoginAndGetTokens,
  NOAUTH_CODES,
  NOAUTH_CLASSIFICATIONS,
  NOAUTH_HTTP_STATUSES,
  NOAUTH_MESSAGE_PATTERN,
} from '../../../helpers/testUtilsAPI.js';

test.describe('GraphQL: Get Rider Documents', () => {
  test(
    'PHARMA-318 | Should be able to get rider documents',
    {
      tag: ['@api', '@rider', '@positive', '@pharma-318'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await riderLoginAndGetTokens(api, {
        username: process.env.RIDER_USERNAME,
        password: process.env.RIDER_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Rider login failed').toBe(true);

      const getRiderDocumentsRes = await safeGraphQL(api, {
        query: RIDER_GET_DOCUMENTS_QUERY,
        headers: bearer(accessToken),
      });
      expect(getRiderDocumentsRes.ok, getRiderDocumentsRes.error || 'Get Rider Documents request failed').toBe(
        true
      );

      const documentsNode = getRiderDocumentsRes.body?.data?.rider?.documents;
      expect(Array.isArray(documentsNode), 'rider.documents should be an array').toBe(true);
    }
  );

  test(
    'PHARMA-319 | Should NOT be able to get rider documents with missing auth tokens',
    {
      tag: ['@api', '@rider', '@negative', '@pharma-319'],
    },
    async ({ api, noAuth }) => {
      const getRiderDocumentsNoAuthRes = await safeGraphQL(api, {
        query: RIDER_GET_DOCUMENTS_QUERY,
        headers: noAuth,
      });
      expect(getRiderDocumentsNoAuthRes.ok).toBe(false);

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
    'PHARMA-320 | Should NOT be able to get rider documents with invalid auth tokens',
    {
      tag: ['@api', '@rider', '@negative', '@pharma-320'],
    },
    async ({ api, invalidAuth }) => {
      const getRiderDocumentsInvalidAuthRes = await safeGraphQL(api, {
        query: RIDER_GET_DOCUMENTS_QUERY,
        headers: invalidAuth,
      });
      expect(getRiderDocumentsInvalidAuthRes.ok).toBe(false);

      if (!getRiderDocumentsInvalidAuthRes.httpOk) {
        expect(NOAUTH_HTTP_STATUSES).toContain(getRiderDocumentsInvalidAuthRes.httpStatus);
      } else {
        const { message, code, classification } = getGQLError(getRiderDocumentsInvalidAuthRes);
        expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
        expect.soft(NOAUTH_CODES).toContain(code);
        expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
      }
    }
  );
});
