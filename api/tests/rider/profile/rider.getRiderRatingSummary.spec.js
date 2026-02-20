import { test, expect } from '../../../globalConfig.api.js';
import { RIDER_GET_RATING_SUMMARY_QUERY } from './rider.profileQueries.js';
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

test.describe('GraphQL: Get Rider Rating Summary', () => {
  test(
    'PHARMA-315 | Should be able to get rider rating summary',
    {
      tag: ['@api', '@rider', '@positive', '@pharma-315', '@smoke'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await riderLoginAndGetTokens(api, {
        username: process.env.RIDER_USERNAME,
        password: process.env.RIDER_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Rider login failed').toBe(true);

      const getRiderRatingSummaryRes = await safeGraphQL(api, {
        query: RIDER_GET_RATING_SUMMARY_QUERY,
        headers: bearer(accessToken),
      });
      expect(
        getRiderRatingSummaryRes.ok,
        getRiderRatingSummaryRes.error || 'Get Rider Rating Summary request failed'
      ).toBe(true);

      const ratingSummaryNode = getRiderRatingSummaryRes.body?.data?.rider?.ratingSummary;
      expect(ratingSummaryNode, 'Missing data.rider.ratingSummary').toBeTruthy();
    }
  );

  test(
    'PHARMA-316 | Should NOT be able to get rider rating summary with missing auth tokens',
    {
      tag: ['@api', '@rider', '@negative', '@pharma-316'],
    },
    async ({ api, noAuth }) => {
      const getRiderRatingSummaryNoAuthRes = await safeGraphQL(api, {
        query: RIDER_GET_RATING_SUMMARY_QUERY,
        headers: noAuth,
      });
      expect(getRiderRatingSummaryNoAuthRes.ok).toBe(false);

      if (!getRiderRatingSummaryNoAuthRes.httpOk) {
        expect(NOAUTH_HTTP_STATUSES).toContain(getRiderRatingSummaryNoAuthRes.httpStatus);
      } else {
        const { message, code, classification } = getGQLError(getRiderRatingSummaryNoAuthRes);
        expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
        expect.soft(NOAUTH_CODES).toContain(code);
        expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
      }
    }
  );

  test(
    'PHARMA-317 | Should NOT be able to get rider rating summary with invalid auth tokens',
    {
      tag: ['@api', '@rider', '@negative', '@pharma-317'],
    },
    async ({ api, invalidAuth }) => {
      const getRiderRatingSummaryInvalidAuthRes = await safeGraphQL(api, {
        query: RIDER_GET_RATING_SUMMARY_QUERY,
        headers: invalidAuth,
      });
      expect(getRiderRatingSummaryInvalidAuthRes.ok).toBe(false);

      if (!getRiderRatingSummaryInvalidAuthRes.httpOk) {
        expect(NOAUTH_HTTP_STATUSES).toContain(getRiderRatingSummaryInvalidAuthRes.httpStatus);
      } else {
        const { message, code, classification } = getGQLError(getRiderRatingSummaryInvalidAuthRes);
        expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
        expect.soft(NOAUTH_CODES).toContain(code);
        expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
      }
    }
  );
});
