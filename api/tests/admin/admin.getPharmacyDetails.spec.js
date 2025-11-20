import { test, expect } from '../../globalConfig.api.js';
import {
  safeGraphQL,
  adminLoginAndGetTokens,
  bearer,
  getGQLError,
  NOAUTH_CLASSIFICATIONS,
  NOAUTH_CODES,
  NOAUTH_MESSAGE_PATTERN,
} from '../../helpers/testUtilsAPI.js';

const GET_PAGED_PHARMACIES_QUERY = `
  query ($filter: FilterRequest!) {
    administrator {
      pharmacy {
        pagedPharmacies(filter: $filter) {
          page { totalSize }
          items { id name }
        }
      }
    }
  }
`;

const GET_PHARMACY_QUERY = `
  query ($pharmacyId: ID!) {
    administrator {
      pharmacy {
        detail(pharmacyId: $pharmacyId) {
          id
          name
        }
      }
    }
  }
`;

test.describe('GraphQL: Admin Get Paged Pharmacies', () => {
  test(
    'PHARMA-13 | Should return paged pharmacies with pageSize=5 (page=1)',
    {
      tag: ['@api', '@admin', '@positive', '@pharma-13'],
    },
    async ({ api }) => {
      // 1) Admin login
      const { accessToken, raw: loginRes } = await adminLoginAndGetTokens(api, {
        username: process.env.ADMIN_USERNAME,
        password: process.env.ADMIN_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Admin login failed').toBe(true);

      // 2) Query paged pharmacies (hardcoded filter)
      const pagedPharmaciesRes = await safeGraphQL(api, {
        query: GET_PAGED_PHARMACIES_QUERY,
        variables: { filter: { pageSize: 5, page: 1, sortField: 'name', ascending: true } },
        headers: bearer(accessToken),
      });
      expect(
        pagedPharmaciesRes.ok,
        pagedPharmaciesRes.error || 'pagedPharmacies query failed'
      ).toBe(true);

      // 3) Node existence
      const block = pagedPharmaciesRes.body?.data?.administrator?.pharmacy?.pagedPharmacies;
      expect(block, 'Missing data.administrator.pharmacy.pagedPharmacies').toBeTruthy();

      const pageNode = block?.page;
      const items = block?.items ?? [];
      expect(pageNode, 'Missing data.administrator.pharmacy.pagedPharmacies.page').toBeTruthy();
      expect(Array.isArray(items), 'items should be an array').toBe(true);

      // 4) Count contract: exactly 5 items
      expect(items.length).toBe(5);

      // 5) Per-item shape (soft)
      for (const it of items) {
        expect.soft(typeof it.id).toBe('string');
        expect.soft(typeof it.name).toBe('string');
      }
    }
  );

  test(
    'PHARMA-14 | Should NOT return paged pharmacies without Authorization token',
    {
      tag: ['@api', '@admin', '@negative', '@pharma-14'],
    },
    async ({ api, noAuth }) => {
      const pagedPharmaciesNoAuth = await safeGraphQL(api, {
        query: GET_PAGED_PHARMACIES_QUERY,
        variables: { filter: { pageSize: 5, page: 1, sortField: 'name', ascending: true } },
        headers: noAuth, // fixture: empty headers (no bearer)
      });

      expect(pagedPharmaciesNoAuth.ok, 'Expected UNAUTHORIZED when missing token').toBe(false);

      // Transport 401 or GraphQL 200 + errors[]
      if (!pagedPharmaciesNoAuth.httpOk) {
        expect(pagedPharmaciesNoAuth.httpStatus).toBe(401);
        return;
      }

      const { message, code, classification } = getGQLError(pagedPharmaciesNoAuth);
      expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
      expect.soft(NOAUTH_CODES).toContain(code);
      expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
    }
  );

  test(
    'PHARMA-15 | Should return pharmacy detail for specified id',
    {
      tag: ['@api', '@admin', '@positive', '@pharma-15'],
    },
    async ({ api }) => {
      // 1) Admin login
      const { accessToken, raw: loginRes } = await adminLoginAndGetTokens(api, {
        username: process.env.ADMIN_USERNAME,
        password: process.env.ADMIN_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Admin login failed').toBe(true);

      // 2) Query pharmacy detail (hard-coded id)
      const EXPECTED_PHARMACY = { id: '1', name: 'Mercury Drug' };

      const pharmacyRes = await safeGraphQL(api, {
        query: GET_PHARMACY_QUERY,
        variables: { pharmacyId: 1 }, // ID! accepts number or string
        headers: bearer(accessToken),
      });

      expect(
        pharmacyRes.ok,
        pharmacyRes.error || 'administrator.pharmacy.detail query failed'
      ).toBe(true);

      // 3) Validate payload (hard assertions on identity fields)
      const pharmacyNode = pharmacyRes.body?.data?.administrator?.pharmacy?.detail;
      expect(pharmacyNode, 'Missing data.administrator.pharmacy.detail').toBeTruthy();

      expect(pharmacyNode.id).toBe(EXPECTED_PHARMACY.id);
      expect(pharmacyNode.name).toBe(EXPECTED_PHARMACY.name);

      // (Optional soft types)
      expect.soft(typeof pharmacyNode.id).toBe('string');
      expect.soft(typeof pharmacyNode.name).toBe('string');
    }
  );

  test(
    'PHARMA-16 | Should NOT return pharmacy detail for id=9999999',
    {
      tag: ['@api', '@admin', '@negative', '@pharma-16'],
    },
    async ({ api }) => {
      // Admin login
      const { accessToken, raw: loginRes } = await adminLoginAndGetTokens(api, {
        username: process.env.ADMIN_USERNAME,
        password: process.env.ADMIN_PASSWORD,
      });
      expect(loginRes.ok, loginRes.error || 'Admin login failed').toBe(true);

      const MISSING_ID = 9_999_999;
      const missingPharmacyRes = await safeGraphQL(api, {
        query: GET_PHARMACY_QUERY,
        variables: { pharmacyId: MISSING_ID },
        headers: bearer(accessToken),
      });

      expect(missingPharmacyRes.ok).toBe(false);

      // Typically resolver error (HTTP 200 + errors[])
      if (!missingPharmacyRes.httpOk) {
        expect(missingPharmacyRes.httpStatus).toBe(404);
        return;
      }

      const { message, code, classification } = getGQLError(missingPharmacyRes);
      expect(message.toLowerCase()).toMatch(/not\s*found/);
      expect.soft(code).toBe('404');
      expect.soft(classification).toBe('NOT_FOUND');
    }
  );

  test(
    'PHARMA-17 | Should NOT return pharmacy detail without Authorization token',
    {
      tag: ['@api', '@admin', '@negative', '@pharma-17'],
    },
    async ({ api, noAuth }) => {
      const noBearerRes = await safeGraphQL(api, {
        query: GET_PHARMACY_QUERY,
        variables: { pharmacyId: 9 },
        headers: noAuth,
      });

      expect(noBearerRes.ok).toBe(false);

      // Transport 401 or GraphQL 200 + UNAUTHORIZED
      if (!noBearerRes.httpOk) {
        expect(noBearerRes.httpStatus).toBe(401);
        return;
      }

      const { message, code, classification } = getGQLError(noBearerRes);
      expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
      expect.soft(NOAUTH_CODES).toContain(code);
      expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
    }
  );

  test(
    'PHARMA-18 | Should NOT return pharmacy detail with invalid token',
    {
      tag: ['@api', '@admin', '@negative', '@pharma-18'],
    },
    async ({ api, invalidAuth }) => {
      const invalidAuthRes = await safeGraphQL(api, {
        query: GET_PHARMACY_QUERY,
        variables: { pharmacyId: 9 },
        headers: invalidAuth,
      });

      expect(invalidAuthRes.ok).toBe(false);
      expect(invalidAuthRes.httpOk).toBe(false);
      expect(invalidAuthRes.httpStatus).toBe(401);
    }
  );
});
