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
} from '../../../helpers/testUtilsAPI.js';
import { createRiderScheduleAsAdmin } from '../../../helpers/adminHelpers.js';

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

      // Create rider schedule first
      await createRiderScheduleAsAdmin(api, process.env.RIDER_USERID);

      const setShiftStartRes = await safeGraphQL(api, {
        query: RIDER_SET_SHIFT_START_QUERY,
        headers: bearer(accessToken),
      });

      const { message } = getGQLError(setShiftStartRes);
      if (!setShiftStartRes.ok) {
        if (!/shift already started/i.test(message)) {
          expect(
            setShiftStartRes.ok,
            setShiftStartRes.error || 'Set Rider Shift Start request failed'
          ).toBe(true);
        } else {
          console.log('Shift already started — Test Passed.');
        }
      }
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

      const { message } = getGQLError(setShiftEndRes);
      if (!setShiftEndRes.ok) {
        if (!/shift already ended/i.test(message)) {
          expect(
            setShiftEndRes.ok,
            setShiftEndRes.error || 'Set Rider Shift End request failed'
          ).toBe(true);
        } else {
          console.log('Shift already ended — Test Passed.');
        }
      }
    }
  );
});
