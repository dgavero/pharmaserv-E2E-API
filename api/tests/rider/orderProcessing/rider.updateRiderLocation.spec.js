import {
  loginAsRiderAndGetTokens,
  NOAUTH_MESSAGE_PATTERN,
  NOAUTH_CLASSIFICATIONS,
  NOAUTH_CODES,
  NOAUTH_HTTP_STATUSES,
} from '../../../helpers/auth.js';
import { safeGraphQL, bearer, getGQLError } from '../../../helpers/graphqlUtils.js';
import { test, expect } from '../../../globalConfig.api.js';
import { getRiderCredentials } from '../../../helpers/roleCredentials.js';
import { UPDATE_RIDER_LOCATION_QUERY } from './rider.orderQuestions.js';

function buildPathPoint() {
  return {
    orderId: 1,
    sequence: 1,
    lat: 9.85,
    lng: 123.143,
  };
}

test.describe('GraphQL: Update Rider Location', () => {
  test(
    'PHARMA-425 | Should update rider location with valid auth tokens',
    {
      tag: ['@api', '@rider', '@positive', '@pharma-425'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAsRiderAndGetTokens(api, getRiderCredentials('default'));
      expect(loginRes.ok, loginRes.error || 'Rider login failed').toBe(true);

      const updateRiderLocationRes = await safeGraphQL(api, {
        query: UPDATE_RIDER_LOCATION_QUERY,
        variables: { pathPoint: buildPathPoint() },
        headers: bearer(accessToken),
      });

      expect(
        updateRiderLocationRes.ok,
        updateRiderLocationRes.error || 'Update Rider Location request failed'
      ).toBe(true);
    }
  );

  test(
    'PHARMA-426 | Should NOT update rider location with missing auth tokens',
    {
      tag: ['@api', '@rider', '@negative', '@pharma-426'],
    },
    async ({ api, noAuth }) => {
      const updateRiderLocationNoAuthRes = await safeGraphQL(api, {
        query: UPDATE_RIDER_LOCATION_QUERY,
        variables: { pathPoint: buildPathPoint() },
        headers: noAuth,
      });

      expect(updateRiderLocationNoAuthRes.ok, 'Update Rider Location with missing auth should fail').toBe(false);

      if (!updateRiderLocationNoAuthRes.httpOk) {
        expect(NOAUTH_HTTP_STATUSES).toContain(updateRiderLocationNoAuthRes.httpStatus);
      } else {
        const { message, classification, code } = getGQLError(updateRiderLocationNoAuthRes);
        expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
        expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
        expect.soft(NOAUTH_CODES).toContain(code);
      }
    }
  );

  test(
    'PHARMA-427 | Should NOT update rider location with invalid auth tokens',
    {
      tag: ['@api', '@rider', '@negative', '@pharma-427'],
    },
    async ({ api, invalidAuth }) => {
      const updateRiderLocationInvalidAuthRes = await safeGraphQL(api, {
        query: UPDATE_RIDER_LOCATION_QUERY,
        variables: { pathPoint: buildPathPoint() },
        headers: invalidAuth,
      });

      expect(updateRiderLocationInvalidAuthRes.ok, 'Update Rider Location with invalid auth should fail').toBe(false);

      if (!updateRiderLocationInvalidAuthRes.httpOk) {
        expect(NOAUTH_HTTP_STATUSES).toContain(updateRiderLocationInvalidAuthRes.httpStatus);
      } else {
        const { message, classification, code } = getGQLError(updateRiderLocationInvalidAuthRes);
        expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
        expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
        expect.soft(NOAUTH_CODES).toContain(code);
      }
    }
  );
});
