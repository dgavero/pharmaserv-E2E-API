import {
  loginAsRiderAndGetTokens,
  NOAUTH_MESSAGE_PATTERN,
  NOAUTH_CLASSIFICATIONS,
  NOAUTH_CODES,
  NOAUTH_HTTP_STATUSES,
} from '../../../helpers/auth.js';
import { safeGraphQL, bearer, getGQLError } from '../../../helpers/graphqlUtils.js';
import { test, expect } from '../../../globalConfig.api.js';
import { getRiderAccount, getRiderCredentials } from '../../../helpers/roleCredentials.js';
import { createRiderScheduleAsAdmin } from '../../../helpers/adminHelpers.js';
import { RIDER_GET_SCHEDULE_QUERY } from './rider.profileQueries.js';

const defaultRiderAccount = getRiderAccount('default');

function getScheduleDateForAdminHelper() {
  return new Date().toISOString().split('T')[0];
}

test.describe('GraphQL: Rider Get Schedule', () => {
  test(
    'PHARMA-419 | Should be able to get rider schedule',
    {
      tag: ['@api', '@rider', '@positive', '@pharma-419'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsRiderAndGetTokens(api, getRiderCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Rider login failed').toBe(true);

      await createRiderScheduleAsAdmin(api, defaultRiderAccount.riderId);

      const getRiderScheduleRes = await safeGraphQL(api, {
        query: RIDER_GET_SCHEDULE_QUERY,
        variables: { date: getScheduleDateForAdminHelper() },
        headers: bearer(accessToken),
      });

      expect(getRiderScheduleRes.ok, getRiderScheduleRes.error || 'Get Rider Schedule request failed').toBe(true);

      const scheduleNode = getRiderScheduleRes.body?.data?.rider?.schedule;
      expect(scheduleNode, 'Missing data.rider.schedule').toBeTruthy();
      expect.soft(scheduleNode.startTime).toBeTruthy();
      expect.soft(scheduleNode.endTime).toBeTruthy();
    }
  );

  test(
    'PHARMA-420 | Should NOT be able to get rider schedule with missing auth tokens',
    {
      tag: ['@api', '@rider', '@negative', '@pharma-420'],
    },
    async ({ api, noAuth }) => {
      const getRiderScheduleNoAuthRes = await safeGraphQL(api, {
        query: RIDER_GET_SCHEDULE_QUERY,
        variables: { date: getScheduleDateForAdminHelper() },
        headers: noAuth,
      });

      expect(getRiderScheduleNoAuthRes.ok, 'Get Rider Schedule with missing auth should fail').toBe(false);

      if (!getRiderScheduleNoAuthRes.httpOk) {
        expect(NOAUTH_HTTP_STATUSES).toContain(getRiderScheduleNoAuthRes.httpStatus);
      } else {
        const { message, classification, code } = getGQLError(getRiderScheduleNoAuthRes);
        expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
        expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
        expect.soft(NOAUTH_CODES).toContain(code);
      }
    }
  );

  test(
    'PHARMA-421 | Should NOT be able to get rider schedule with invalid auth tokens',
    {
      tag: ['@api', '@rider', '@negative', '@pharma-421'],
    },
    async ({ api, invalidAuth }) => {
      const getRiderScheduleInvalidAuthRes = await safeGraphQL(api, {
        query: RIDER_GET_SCHEDULE_QUERY,
        variables: { date: getScheduleDateForAdminHelper() },
        headers: invalidAuth,
      });

      expect(getRiderScheduleInvalidAuthRes.ok, 'Get Rider Schedule with invalid auth should fail').toBe(false);

      if (!getRiderScheduleInvalidAuthRes.httpOk) {
        expect(NOAUTH_HTTP_STATUSES).toContain(getRiderScheduleInvalidAuthRes.httpStatus);
      } else {
        const { message, classification, code } = getGQLError(getRiderScheduleInvalidAuthRes);
        expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
        expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
        expect.soft(NOAUTH_CODES).toContain(code);
      }
    }
  );
});
