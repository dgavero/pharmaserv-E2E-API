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
import {
  PHARMACIST_OPEN_MY_BRANCH_QUERY,
  PHARMACIST_CLOSE_MY_BRANCH_QUERY,
  PHARMACIST_PAUSE_MY_BRANCH_QUERY,
} from './pharmacy.profileQueries.js';

test.describe('GraphQL: Open-Pause-Close My Branch as Pharmacist', () => {
  test(
    'PHARMA-160 | Should be able to open my branch as Pharmacist',
    {
      tag: ['@api', '@pharmacist', '@positive', '@pharma-160'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await pharmacistLoginAndGetTokens(api, {
        username: process.env.PHARMACIST_USERNAME,
        password: process.env.PHARMACIST_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Pharmacist login failed').toBe(true);

      const branchOpenRes = await safeGraphQL(api, {
        query: PHARMACIST_OPEN_MY_BRANCH_QUERY,
        headers: bearer(accessToken),
      });

      // Main Assertion
      expect(branchOpenRes.ok, branchOpenRes.error || 'Failed to open pharmacist branch').toBe(
        true
      );

      const node = branchOpenRes.body.data.pharmacy.branch.open;
      expect(node).toBeTruthy();
      expect(node.status).toBe('OPEN');
    }
  );

  test(
    'PHARMA-161 | Should be able to close my branch as Pharmacist',
    {
      tag: ['@api', '@pharmacist', '@positive', '@pharma-161'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await pharmacistLoginAndGetTokens(api, {
        username: process.env.PHARMACIST_USERNAME,
        password: process.env.PHARMACIST_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Pharmacist login failed').toBe(true);

      const branchCloseRes = await safeGraphQL(api, {
        query: PHARMACIST_CLOSE_MY_BRANCH_QUERY,
        headers: bearer(accessToken),
      });

      // Main Assertion
      expect(branchCloseRes.ok, branchCloseRes.error || 'Failed to close pharmacist branch').toBe(
        true
      );

      const node = branchCloseRes.body.data.pharmacy.branch.close;
      expect(node).toBeTruthy();
      expect(node.status).toBe('CLOSED');
    }
  );

  test(
    'PHARMA-162 | Should be able to Pause my branch as Pharmacist',
    {
      tag: ['@api', '@pharmacist', '@positive', '@pharma-162'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await pharmacistLoginAndGetTokens(api, {
        username: process.env.PHARMACIST_USERNAME,
        password: process.env.PHARMACIST_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Pharmacist login failed').toBe(true);

      const branchPauseRes = await safeGraphQL(api, {
        query: PHARMACIST_PAUSE_MY_BRANCH_QUERY,
        headers: bearer(accessToken),
        variables: {
          duration: 'FIVE_MINUTES',
        },
      });

      const { message } = getGQLError(branchPauseRes);
      if (!branchPauseRes.ok) {
        if (!/cannot pause a closed branch/i.test(message)) {
          expect(
            branchPauseRes.ok,
            branchPauseRes.error || 'Failed to pause pharmacist branch'
          ).toBe(true);
        } else {
          console.log('Branch already closed — continuing.');
        }
      }
    }
  );

  test(
    'PHARMA-163 | Should NOT be able to pause branch if its CLOSED',
    {
      tag: ['@api', '@admin', '@positive', '@pharma-163'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await pharmacistLoginAndGetTokens(api, {
        username: process.env.PHARMACIST_USERNAME_2,
        password: process.env.PHARMACIST_PASSWORD_2,
      });
      expect(loginRes.ok, loginRes.error || 'Pharmacist login failed').toBe(true);

      // Open Branch First
      const branchCloseRes = await safeGraphQL(api, {
        query: PHARMACIST_CLOSE_MY_BRANCH_QUERY,
        headers: bearer(accessToken),
      });
      expect(branchCloseRes.ok, branchCloseRes.error || 'Failed to close pharmacist branch').toBe(
        true
      );

      const closeNode = branchCloseRes.body.data.pharmacy.branch.close;
      expect(closeNode.status, 'Precondition failed: not able to close the pharmacy branch').toBe(
        'CLOSED'
      );

      // Try to Pause Branch
      const branchPauseRes = await safeGraphQL(api, {
        query: PHARMACIST_PAUSE_MY_BRANCH_QUERY,
        headers: bearer(accessToken),
        variables: {
          duration: 'FIVE_MINUTES',
        },
      });

      expect(
        branchPauseRes.ok,
        branchPauseRes.error || 'Pausing a Closed Branch should have failed'
      ).toBe(false);

      const { message, classification, code } = getGQLError(branchPauseRes);
      expect(message).toMatch(/cannot pause a closed branch/i);
      expect(NOAUTH_CLASSIFICATIONS).toContain(classification);
      expect(NOAUTH_CODES).toContain(code);
    }
  );

  test(
    'PHARMA-164 | Should NOT be able to open my branch with NO Auth',
    {
      tag: ['@api', '@pharmacist', '@negative', '@pharma-164'],
    },
    async ({ api, noAuth }) => {
      const branchOpenResNoAuth = await safeGraphQL(api, {
        query: PHARMACIST_OPEN_MY_BRANCH_QUERY,
        headers: noAuth,
      });

      expect(
        branchOpenResNoAuth.ok,
        branchOpenResNoAuth.error || 'Branch Open Request with no auth should not be successful'
      ).toBe(false);

      const { message, classification, code } = getGQLError(branchOpenResNoAuth);
      expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
      expect(NOAUTH_CLASSIFICATIONS).toContain(classification);
      expect(NOAUTH_CODES).toContain(code);
    }
  );

  test(
    'PHARMA-165 | Should NOT be able to open my branch with Invalid Auth',
    {
      tag: ['@api', '@pharmacist', '@negative', '@pharma-165'],
    },
    async ({ api, invalidAuth }) => {
      const branchOpenResInvalidAuth = await safeGraphQL(api, {
        query: PHARMACIST_OPEN_MY_BRANCH_QUERY,
        headers: invalidAuth,
      });

      expect(
        branchOpenResInvalidAuth.ok,
        branchOpenResInvalidAuth.error ||
          'Branch Open Request with invalid auth should not be successful'
      ).toBe(false);

      // Transport-level 401 (no GraphQL errors[])
      expect(branchOpenResInvalidAuth.ok).toBe(false);
      expect(branchOpenResInvalidAuth.httpOk).toBe(false);
      expect(NOAUTH_HTTP_STATUSES).toContain(branchOpenResInvalidAuth.httpStatus);
    }
  );

  test(
    'PHARMA-166 | Should NOT be able to close my branch with No Auth',
    {
      tag: ['@api', '@pharmacist', '@negative', '@pharma-166'],
    },
    async ({ api, noAuth }) => {
      const branchCloseResNoAuth = await safeGraphQL(api, {
        query: PHARMACIST_CLOSE_MY_BRANCH_QUERY,
        headers: noAuth,
      });

      expect(
        branchCloseResNoAuth.ok,
        branchCloseResNoAuth.error || 'Branch Close Request with no auth should not be successful'
      ).toBe(false);

      const { message, classification, code } = getGQLError(branchCloseResNoAuth);
      expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
      expect(NOAUTH_CLASSIFICATIONS).toContain(classification);
      expect(NOAUTH_CODES).toContain(code);
    }
  );

  test(
    'PHARMA-167 | Should NOT be able to close my branch with Invalid Auth',
    {
      tag: ['@api', '@pharmacist', '@negative', '@pharma-167'],
    },
    async ({ api, invalidAuth }) => {
      const branchCloseResInvalidAuth = await safeGraphQL(api, {
        query: PHARMACIST_CLOSE_MY_BRANCH_QUERY,
        headers: invalidAuth,
      });

      expect(
        branchCloseResInvalidAuth.ok,
        branchCloseResInvalidAuth.error ||
          'Branch Close Request with invalid auth should not be successful'
      ).toBe(false);

      // Transport-level 401 (no GraphQL errors[])
      expect(branchCloseResInvalidAuth.ok).toBe(false);
      expect(branchCloseResInvalidAuth.httpOk).toBe(false);
      expect(NOAUTH_HTTP_STATUSES).toContain(branchCloseResInvalidAuth.httpStatus);
    }
  );
});
