import { test, expect } from '../../../globalConfig.api.js';
import {
  safeGraphQL,
  adminLoginAndGetTokens,
  bearer,
  getGQLError,
  NOAUTH_MESSAGE_PATTERN,
  NOAUTH_CODES,
  NOAUTH_CLASSIFICATIONS,
  NOAUTH_HTTP_STATUSES,
} from '../../../helpers/testUtilsAPI.js';
import { randomAlphanumeric, randomLetters, randomNum } from '../../../../helpers/globalTestUtils.js';
import { CREATE_BOX_MUTATION } from './admin.assetsManagementQueries.js';

function buildBoxInput() {
  const boxNumber = `${randomNum(4)}-${randomNum(4)}-${randomNum(4)}`;
  return {
    status: 'LOST',
    boxNumber,
    dateAcquired: '2026-01-01',
    assignedTo: `QA ${randomLetters(5)} ${randomAlphanumeric(4)}`,
  };
}

test.describe('GraphQL: Admin Create Box', () => {
  test(
    'PHARMA-225 | Should create a box with valid auth tokens',
    {
      tag: ['@api', '@admin', '@positive', '@create', '@pharma-225'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await adminLoginAndGetTokens(api, {
        username: process.env.ADMIN_USERNAME,
        password: process.env.ADMIN_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Admin login failed').toBe(true);

      const boxInput = buildBoxInput();

      const createBoxRes = await safeGraphQL(api, {
        query: CREATE_BOX_MUTATION,
        variables: { box: boxInput },
        headers: bearer(accessToken),
      });

      expect(createBoxRes.ok, createBoxRes.error || 'Create box endpoint failed').toBe(
        true
      );

      const node = createBoxRes.body?.data?.administrator?.asset?.createBox;
      expect(node, 'Create box endpoint returned no data').toBeTruthy();
      expect.soft(node.boxNumber).toBe(boxInput.boxNumber);
    }
  );

  test(
    'PHARMA-226 | Should NOT create a box with missing auth tokens',
    {
      tag: ['@api', '@admin', '@negative', '@create', '@pharma-226'],
    },
    async ({ api, noAuth }) => {
      const boxInput = buildBoxInput();

      const createBoxNoAuthRes = await safeGraphQL(api, {
        query: CREATE_BOX_MUTATION,
        variables: { box: boxInput },
        headers: noAuth,
      });

      expect(
        createBoxNoAuthRes.ok,
        createBoxNoAuthRes.error || 'Expected UNAUTHORIZED when missing token'
      ).toBe(false);

      if (!createBoxNoAuthRes.httpOk) {
        expect(NOAUTH_HTTP_STATUSES).toContain(createBoxNoAuthRes.httpStatus);
      } else {
        const { message, code, classification } = getGQLError(createBoxNoAuthRes);
        expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
        expect.soft(NOAUTH_CODES).toContain(code);
        expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
      }
    }
  );

  test(
    'PHARMA-227 | Should NOT create a box with invalid auth tokens',
    {
      tag: ['@api', '@admin', '@negative', '@create', '@pharma-227'],
    },
    async ({ api, invalidAuth }) => {
      const boxInput = buildBoxInput();

      const createBoxInvalidAuthRes = await safeGraphQL(api, {
        query: CREATE_BOX_MUTATION,
        variables: { box: boxInput },
        headers: invalidAuth,
      });

      expect(createBoxInvalidAuthRes.ok).toBe(false);
      expect(createBoxInvalidAuthRes.httpOk).toBe(false);
      expect(NOAUTH_HTTP_STATUSES).toContain(createBoxInvalidAuthRes.httpStatus);
    }
  );
});
