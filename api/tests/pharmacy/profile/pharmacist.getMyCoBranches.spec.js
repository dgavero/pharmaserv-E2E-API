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
import { PHARMACIST_GET_MY_CO_BRANCHES_QUERY } from './pharmacy.profileQueries.js';

test.describe('GraphQL: Get My Co-Branches as Pharmacist', () => {
  test(
    'PHARMA-153 | Should be able to get my co-branches as Pharmacist',
    {
      tag: ['@api', '@pharmacist', '@positive', '@pharma-153'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await pharmacistLoginAndGetTokens(api, {
        username: process.env.PHARMACIST_USERNAME,
        password: process.env.PHARMACIST_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Pharmacist login failed').toBe(true);

      const myCoBranchesRes = await safeGraphQL(api, {
        query: PHARMACIST_GET_MY_CO_BRANCHES_QUERY,
        headers: bearer(accessToken),
      });
      expect(
        myCoBranchesRes.ok,
        myCoBranchesRes.error || 'Failed to get pharmacist co-branches'
      ).toBe(true);

      const nodes = myCoBranchesRes.body.data.pharmacy.branches;
      expect(nodes).toBeTruthy();
      expect(Array.isArray(nodes)).toBe(true);
      nodes.forEach((node) => {
        expect(typeof node.id).toBe('string');
        expect(typeof node.pharmacyName).toBe('string');
        expect(typeof node.name).toBe('string');
      });
    }
  );

  test(
    'PHARMA-154 | Should NOT be able to get my co-branches with No Auth',
    {
      tag: ['@api', '@pharmacist', '@negative', '@pharma-154'],
    },
    async ({ api, noAuth }) => {
      const myCoBranchesResNoAuth = await safeGraphQL(api, {
        query: PHARMACIST_GET_MY_CO_BRANCHES_QUERY,
        headers: noAuth,
      });
      expect(
        myCoBranchesResNoAuth.ok,
        myCoBranchesResNoAuth.error || 'Request with no auth should not be successful'
      ).toBe(false);

      const { message, classification, code } = getGQLError(myCoBranchesResNoAuth);
      expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
      expect(NOAUTH_CLASSIFICATIONS).toContain(classification);
      expect(NOAUTH_CODES).toContain(code);
    }
  );

  test(
    'PHARMA-155 | Should NOT be able to get my co-branches with Invalid Auth',
    {
      tag: ['@api', '@pharmacist', '@negative', '@pharma-155'],
    },
    async ({ api, invalidAuth }) => {
      const myCoBranchesResInvalidAuth = await safeGraphQL(api, {
        query: PHARMACIST_GET_MY_CO_BRANCHES_QUERY,
        headers: invalidAuth,
      });
      expect(
        myCoBranchesResInvalidAuth.ok,
        myCoBranchesResInvalidAuth.error || 'Request with invalid auth should not be successful'
      ).toBe(false);

      // Transport-level 401 (no GraphQL errors[])
      expect(myCoBranchesResInvalidAuth.ok).toBe(false);
      expect(myCoBranchesResInvalidAuth.httpOk).toBe(false);
      expect(NOAUTH_HTTP_STATUSES).toContain(myCoBranchesResInvalidAuth.httpStatus);
    }
  );
});
