import { test, expect } from '../../../globalConfig.api.js';
import {
  RIDER_SET_SHIFT_START_QUERY,
  RIDER_SET_SHIFT_END_QUERY,
} from '../profile/rider.profileQueries.js';
import {
  safeGraphQL,
  bearer,
  riderLoginAndGetTokens,
  getGQLError,
  NOAUTH_MESSAGE_PATTERN,
  NOAUTH_CLASSIFICATIONS,
  NOAUTH_CODES,
  NOAUTH_HTTP_STATUSES,
} from '../../../helpers/testUtilsAPI.js';

function builderName() {
  const firstName = `builderName${randomAlphanumeric(4)}`;
  return firstName;
}

test.describe('GraphQL: Rider able to set shift start/end', () => {
  test(
    'PHARMA-123 | Should be able to set rider shift - start',
    {
      tag: ['@api', '@rider', '@positive', '@pharma-123'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await riderLoginAndGetTokens(api, {
        username: process.env.RIDER_USERNAME,
        password: process.env.RIDER_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Rider login failed').toBe(true);

      const setShiftStartRes = await safeGraphQL(api, {
        query: RIDER_SET_SHIFT_START_QUERY,
        headers: bearer(accessToken),
      });

      // Main Assertion
      expect(
        setShiftStartRes.ok,
        setShiftStartRes.error || 'Set Rider Shift Start request failed'
      ).toBe(true);
    }
  );

  test(
    'PHARMA-124 | Should be able to set rider shift - end',
    {
      tag: ['@api', '@rider', '@positive', '@pharma-124'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await riderLoginAndGetTokens(api, {
        username: process.env.RIDER_USERNAME,
        password: process.env.RIDER_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Rider login failed').toBe(true);

      const setShiftEndRes = await safeGraphQL(api, {
        query: RIDER_SET_SHIFT_END_QUERY,
        headers: bearer(accessToken),
      });

      // Main Assertion
      expect(setShiftEndRes.ok, setShiftEndRes.error || 'Set Rider Shift End request failed').toBe(
        true
      );
    }
  );
});
