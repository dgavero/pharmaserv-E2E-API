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
import { PHARMACIST_UPDATE_MY_BRANCH_QUERY } from './pharmacy.profileQueries.js';

//** This should be returned as is - only simulates update but nott actually updating data in DB */
function buildBranchUpdate() {
  const name = `PKC Branch 01`;
  const address = `Pedro Gil St. Sta Ana`;
  const city = `Manila`;
  const province = `Metro Manila`;
  const zipCode = `1009`;
  const email = `staana@mercury.com`;
  const phoneNumber = `09171234567`;
  const contactName = `John Starks`;
  const openingTime = `08:00:00.000+08:00`;
  const closingTime = `17:00:00.000+08:00`;
  const weekEndOpeningTime = `07:00:00.000+08:00`;
  const weekEndClosingTime = `20:00:00.000+08:00`;
  const lat = 14.582019317323562;
  const lng = 121.01251092551259;

  return {
    name,
    address,
    city,
    province,
    zipCode,
    email,
    phoneNumber,
    contactName,
    openingTime,
    closingTime,
    weekEndOpeningTime,
    weekEndClosingTime,
    lat,
    lng,
  };
}

test.describe('GraphQL: Update My Branch as Pharmacist', () => {
  test(
    'PHARMA-156 | Should be able to update my branch as Pharmacist',
    {
      tag: ['@api', '@pharmacist', '@positive', '@pharma-156'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await pharmacistLoginAndGetTokens(api, {
        username: process.env.PHARMACIST_USERNAME,
        password: process.env.PHARMACIST_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Pharmacist login failed').toBe(true);

      const branchUpdateRes = await safeGraphQL(api, {
        query: PHARMACIST_UPDATE_MY_BRANCH_QUERY,
        variables: {
          branch: buildBranchUpdate(),
        },
        headers: bearer(accessToken),
      });
      expect(
        branchUpdateRes.ok,
        branchUpdateRes.error || 'Failed to update pharmacist branch'
      ).toBe(true);

      const updatedBranch = branchUpdateRes.body.data.pharmacy.branch.update;
      expect(updatedBranch).toBeTruthy();
      expect(typeof updatedBranch.id).toBe('string');
      expect(updatedBranch.name).toBe('PKC Branch 01');
    }
  );

  test(
    'PHARMA-157 | Should NOT be able to update my branch with No Auth',
    {
      tag: ['@api', '@pharmacist', '@negative', '@pharma-157'],
    },
    async ({ api, noAuth }) => {
      const branchUpdateResNoAuth = await safeGraphQL(api, {
        query: PHARMACIST_UPDATE_MY_BRANCH_QUERY,
        variables: {
          branch: buildBranchUpdate(),
        },
        headers: noAuth,
      });
      expect(
        branchUpdateResNoAuth.ok,
        branchUpdateResNoAuth.error || 'Branch Update Request with no auth should not be successful'
      ).toBe(false);

      const { message, classification, code } = getGQLError(branchUpdateResNoAuth);
      expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
      expect(NOAUTH_CLASSIFICATIONS).toContain(classification);
      expect(NOAUTH_CODES).toContain(code);
    }
  );

  test(
    'PHARMA-158 |  Should NOT be able to update my branch with Invalid Auth',
    {
      tag: ['@api', '@pharmacist', '@negative', '@pharma-158'],
    },
    async ({ api, invalidAuth }) => {
      const branchUpdateResInvalidAuth = await safeGraphQL(api, {
        query: PHARMACIST_UPDATE_MY_BRANCH_QUERY,
        variables: {
          branch: buildBranchUpdate(),
        },
        headers: invalidAuth,
      });
      expect(
        branchUpdateResInvalidAuth.ok,
        branchUpdateResInvalidAuth.error ||
          'Branch Update Request with invalid auth should not be successful'
      ).toBe(false);

      // Transport-level 401 (no GraphQL errors[])
      expect(branchUpdateResInvalidAuth.ok).toBe(false);
      expect(branchUpdateResInvalidAuth.httpOk).toBe(false);
      expect(NOAUTH_HTTP_STATUSES).toContain(branchUpdateResInvalidAuth.httpStatus);
    }
  );

  test(
    'PHARMA-159 | Should NOT be able to update branch with Missing Name',
    {
      tag: ['@api', '@pharmacist', '@negative', '@pharma-159'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await pharmacistLoginAndGetTokens(api, {
        username: process.env.PHARMACIST_USERNAME,
        password: process.env.PHARMACIST_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Pharmacist login failed').toBe(true);

      const branchData = buildBranchUpdate();
      delete branchData.name; // Remove name to simulate missing required field

      const branchUpdateResMissingNameRes = await safeGraphQL(api, {
        query: PHARMACIST_UPDATE_MY_BRANCH_QUERY,
        variables: {
          branch: branchData,
        },
        headers: bearer(accessToken),
      });
      expect(
        branchUpdateResMissingNameRes.ok,
        branchUpdateResMissingNameRes.error || 'Expected branch update to fail due to missing name'
      ).toBe(false);

      const { message, classification, code } = getGQLError(branchUpdateResMissingNameRes);
      expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
      expect(NOAUTH_CLASSIFICATIONS).toContain(classification);
    }
  );
});
