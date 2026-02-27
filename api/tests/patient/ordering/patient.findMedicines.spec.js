import { test, expect } from '../../../globalConfig.api.js';
import { FIND_MEDICINES_QUERY } from './patient.orderingQueries.js';
import {
  safeGraphQL,
  bearer,
  getGQLError,
  loginAndGetTokens,
  NOAUTH_CODES,
  NOAUTH_CLASSIFICATIONS,
  NOAUTH_HTTP_STATUSES,
  NOAUTH_MESSAGE_PATTERN,
} from '../../../helpers/testUtilsAPI.js';

const medicineQueryInput = 'PARACETAMOL';

test.describe('GraphQL: Find Medicines', () => {
  test(
    'PHARMA-297 | Should be able to find medicines',
    {
      tag: ['@api', '@patient', '@positive', '@pharma-297'],
    },
    async ({ api }) => {
      const { accessToken, raw: loginRes } = await loginAndGetTokens(api, {
        username: process.env.PATIENT_USER_USERNAME,
        password: process.env.PATIENT_USER_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Patient login failed').toBe(true);

      const findMedicinesRes = await safeGraphQL(api, {
        query: FIND_MEDICINES_QUERY,
        variables: { query: medicineQueryInput },
        headers: bearer(accessToken),
      });
      expect(findMedicinesRes.ok, findMedicinesRes.error || 'Find medicines request failed').toBe(true);

      const medicinesNode = findMedicinesRes.body?.data?.medicines;
      expect(Array.isArray(medicinesNode), 'medicines should be an array').toBe(true);
      expect(medicinesNode.length, 'medicines should contain at least one item').toBeGreaterThan(0);

      const hasParacetamolGenericName = medicinesNode.some((medicineNode) =>
        String(medicineNode?.genericName || '')
          .toLowerCase()
          .includes('paracetamol')
      );
      expect(hasParacetamolGenericName, 'No medicine genericName contains "paracetamol"').toBe(true);
    }
  );

  test(
    'PHARMA-298 | Should BE able to find medicines with missing auth tokens',
    {
      tag: ['@api', '@patient', '@positive', '@pharma-298'],
    },
    async ({ api, noAuth }) => {
      const findMedicinesNoAuthRes = await safeGraphQL(api, {
        query: FIND_MEDICINES_QUERY,
        variables: { query: medicineQueryInput },
        headers: noAuth,
      });
      expect(findMedicinesNoAuthRes.ok).toBe(true);
    }
  );

  test(
    'PHARMA-299 | Should NOT be able to find medicines with invalid auth tokens',
    {
      tag: ['@api', '@patient', '@negative', '@pharma-299'],
    },
    async ({ api, invalidAuth }) => {
      const findMedicinesInvalidAuthRes = await safeGraphQL(api, {
        query: FIND_MEDICINES_QUERY,
        variables: { query: medicineQueryInput },
        headers: invalidAuth,
      });
      expect(findMedicinesInvalidAuthRes.ok).toBe(false);

      if (!findMedicinesInvalidAuthRes.httpOk) {
        expect(NOAUTH_HTTP_STATUSES).toContain(findMedicinesInvalidAuthRes.httpStatus);
      } else {
        const { message, code, classification } = getGQLError(findMedicinesInvalidAuthRes);
        expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
        expect.soft(NOAUTH_CODES).toContain(code);
        expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
      }
    }
  );
});
