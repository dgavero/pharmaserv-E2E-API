import { test, expect } from '../../../globalConfig.api.js';
import {
  safeGraphQL,
  bearer,
  getGQLError,
  NOAUTH_MESSAGE_PATTERN,
  NOAUTH_CLASSIFICATIONS,
  NOAUTH_CODES,
  pharmacistLoginAndGetTokens,
  NOAUTH_HTTP_STATUSES,
} from '../../../helpers/testUtilsAPI.js';
import { PHARMACIST_GET_MY_BRANCH_QUERY } from './pharmacy.profileQueries.js';

test.describe('GraphQL: Get My Branch', () => {
  test(
    'PHARMA-147 | Should be able to get my branch as Pharmacist',
    {
      tag: ['@api', '@pharmacist', '@positive', '@pharma-147'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await pharmacistLoginAndGetTokens(api, {
        username: process.env.PHARMACIST_USERNAME_REG01,
        password: process.env.PHARMACIST_PASSWORD_REG01,
      });
      expect(loginRes.ok, loginRes.error || 'Pharmacist login failed').toBe(true);

      const myBranchRes = await safeGraphQL(api, {
        query: PHARMACIST_GET_MY_BRANCH_QUERY,
        headers: bearer(accessToken),
      });
      expect(myBranchRes.ok, myBranchRes.error || 'Failed to get pharmacist branch').toBe(true);

      const node = myBranchRes.body.data.pharmacy.branch.myBranch;
      expect(node).toBeTruthy();
      expect(typeof node.id).toBe('string');
    }
  );

  test(
    'PHARMA-148 | Should NOT be able to get my branch as Pharmacist with No Auth',
    {
      tag: ['@api', '@pharmacist', '@negative', '@pharma-148'],
    },
    async ({ api, noAuth }) => {
      const myBranchResNoAuth = await safeGraphQL(api, {
        query: PHARMACIST_GET_MY_BRANCH_QUERY,
        headers: noAuth,
      });

      // Main Assertions
      expect(myBranchResNoAuth.ok, myBranchResNoAuth.error || 'Get Branch No Auth is expected to fail').toBe(false);

      const { message, classification, code } = getGQLError(myBranchResNoAuth);
      expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
      expect(NOAUTH_CLASSIFICATIONS).toContain(classification);
      expect(NOAUTH_CODES).toContain(code);
    }
  );

  test(
    'PHARMA-149 | Should NOT be able to get my branch as Pharmacist with Invalid Auth',
    {
      tag: ['@api', '@pharmacist', '@negative', '@pharma-149'],
    },
    async ({ api, invalidAuth }) => {
      const myBranchResInvalidAuth = await safeGraphQL(api, {
        query: PHARMACIST_GET_MY_BRANCH_QUERY,
        headers: invalidAuth,
      });

      // Main Assertions
      expect(
        myBranchResInvalidAuth.ok,
        myBranchResInvalidAuth.error || 'Get Branch Invalid Auth is expected to fail'
      ).toBe(false);

      // Transport-level 401 (no GraphQL errors[])
      expect(myBranchResInvalidAuth.ok).toBe(false);
      expect(myBranchResInvalidAuth.httpOk).toBe(false);
      expect(NOAUTH_HTTP_STATUSES).toContain(myBranchResInvalidAuth.httpStatus);
    }
  );
});
