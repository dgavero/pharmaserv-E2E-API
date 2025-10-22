/**
 * GraphQL: Admin → Patient Detail (by email)
 * - Positive: admin login → patient.detail(email: "rainier.patient@gmail.com")
 * - Hard assert: username, email, firstName, lastName
 * - Note: uuid intentionally ignored
 */

import { test, expect } from '../../globalConfig.api.js';
import {
  safeGraphQL,
  adminLoginAndGetTokens,
  bearer,
  getGQLError,
} from '../../helpers/testUtilsAPI.js';

const GET_PATIENT_QUERY = `
  query ($by: IdentifierRequest!) {
    administrator {
      patient {
        detail(by: $by) {
          uuid
          username
          email
          firstName
          lastName
        }
      }
    }
  }
`;

const GET_PAGED_PATIENTS_QUERY = `
  query ($filter: FilterRequest!) {
    administrator {
      patient {
        pagedPatients(filter: $filter) {
          page { totalSize }
          items { id username firstName lastName }
        }
      }
    }
  }
`;

// Expected identity for the fixed email
const EXPECTED_PATIENT = {
  email: 'rainier@gmail.com',
  username: 'rainier.patient',
  firstName: 'Rainier',
  lastName: 'Amoyo',
};

test.describe('GraphQL: Admin Get Patient Detail', () => {
  test('Should return patient detail for email=rainier@gmail.com @api @admin @positive', async ({
    api,
  }) => {
    // 1) Admin login
    const { accessToken, raw: loginRes } = await adminLoginAndGetTokens(api, {
      username: process.env.ADMIN_USERNAME,
      password: process.env.ADMIN_PASSWORD,
    });
    expect(loginRes.ok, loginRes.error || 'Admin login failed').toBe(true);

    // 2) Query patient detail by fixed email
    const patientRes = await safeGraphQL(api, {
      query: GET_PATIENT_QUERY,
      variables: { by: { email: EXPECTED_PATIENT.email } },
      headers: bearer(accessToken),
    });
    expect(patientRes.ok, patientRes.error || 'administrator.patient.detail query failed').toBe(
      true
    );

    // 3) Explicit data access (uuid intentionally ignored)
    const patientNode = patientRes.body?.data?.administrator?.patient?.detail;
    expect(patientNode, 'Missing data.administrator.patient.detail').toBeTruthy();

    // 4) Hard assertions on identity fields
    expect(patientNode.username).toBe(EXPECTED_PATIENT.username);
    expect(patientNode.email).toBe(EXPECTED_PATIENT.email);
    expect(patientNode.firstName).toBe(EXPECTED_PATIENT.firstName);
    expect(patientNode.lastName).toBe(EXPECTED_PATIENT.lastName);
  });

  test('Should not return patient detail for unknown email @api @admin @negative', async ({
    api,
  }) => {
    const UNKNOWN_EMAIL = 'rainier99999@gmail.com';

    // Admin login
    const { accessToken, raw: loginRes } = await adminLoginAndGetTokens(api, {
      username: process.env.ADMIN_USERNAME,
      password: process.env.ADMIN_PASSWORD,
    });
    expect(loginRes.ok, loginRes.error || 'Admin login failed').toBe(true);

    // Attempt detail with a non-existent email
    const patientDetailNotFound = await safeGraphQL(api, {
      query: GET_PATIENT_QUERY,
      variables: { by: { email: UNKNOWN_EMAIL } },
      headers: bearer(accessToken),
    });

    // Expect resolver error (GraphQL 200 + errors[])
    expect(patientDetailNotFound.ok, 'Expected NOT_FOUND for unknown patient email').toBe(false);

    // Verify message, code, classification (ignore the rest)
    const { message, code, classification } = getGQLError(patientDetailNotFound);
    expect(message.toLowerCase()).toContain('not found');
    expect.soft(code).toBe('404');
    expect.soft(classification).toBe('NOT_FOUND');
  });

  test('Should not return patient detail without Authorization @api @admin @negative', async ({
    api,
    noAuth,
  }) => {
    const PATIENT_EMAIL = 'rainier@gmail.com'; // correct email, but NO bearer

    const patientDetailNoAuth = await safeGraphQL(api, {
      query: GET_PATIENT_QUERY,
      variables: { by: { email: PATIENT_EMAIL } },
      headers: noAuth,
    });

    expect(patientDetailNoAuth.ok, 'Expected UNAUTHORIZED when missing token').toBe(false);

    const { message, code, classification } = getGQLError(patientDetailNoAuth);
    expect(message.toLowerCase()).toContain('unauthorized access');
    expect.soft(code).toBe('401');
    expect.soft(classification).toBe('UNAUTHORIZED');
  });

  test('Should return paged patients with pageSize=5 (page=1) @api @admin @positive', async ({
    api,
  }) => {
    // 1) Admin login
    const { accessToken, raw: loginRes } = await adminLoginAndGetTokens(api, {
      username: process.env.ADMIN_USERNAME,
      password: process.env.ADMIN_PASSWORD,
    });
    expect(loginRes.ok, loginRes.error || 'Admin login failed').toBe(true);

    // 2) Query paged patients with hardcoded page/pageSize
    const pagedPatientsRes = await safeGraphQL(api, {
      query: GET_PAGED_PATIENTS_QUERY,
      variables: { filter: { pageSize: 5, page: 1, ascending: true } },
      headers: bearer(accessToken),
    });
    expect(pagedPatientsRes.ok, pagedPatientsRes.error || 'pagedPatients query failed').toBe(true);

    // 3) Node existence checks (explicit path)
    const pagedBlock = pagedPatientsRes.body?.data?.administrator?.patient?.pagedPatients;
    expect(pagedBlock, 'Missing data.administrator.patient.pagedPatients').toBeTruthy();

    const pageNode = pagedBlock?.page;
    const items = pagedBlock?.items ?? [];
    expect(pageNode, 'Missing data.administrator.patient.pagedPatients.page').toBeTruthy();
    expect(Array.isArray(items), 'items should be an array').toBe(true);

    // 4) Count contract: exactly 5 items returned
    expect(items.length).toBe(5);

    // 5) Per-item shape (soft checks)
    for (const it of items) {
      expect.soft(typeof it.id).toBe('string'); // ids are strings per sample
      expect.soft(typeof it.username).toBe('string');
      expect.soft(typeof it.firstName).toBe('string');
      expect.soft(typeof it.lastName).toBe('string');
    }
  });

  test('Should not return paged patients without Authorization @api @admin @negative', async ({
    api,
    noAuth,
  }) => {
    const pagedPatientsNoAuth = await safeGraphQL(api, {
      query: GET_PAGED_PATIENTS_QUERY,
      variables: { filter: { pageSize: 5, page: 1, ascending: true } },
      headers: noAuth,
    });

    expect(pagedPatientsNoAuth.ok, 'Expected UNAUTHORIZED when missing token').toBe(false);

    const { message, code, classification } = getGQLError(pagedPatientsNoAuth);
    expect(message.toLowerCase()).toContain('unauthorized access');
    expect.soft(code).toBe('401');
    expect.soft(classification).toBe('UNAUTHORIZED');
  });
});
