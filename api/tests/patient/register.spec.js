/**
 * This test imports the *fixture-enabled* `test`/`expect` from globalConfig.api.js.
 * That is what "turns on" the `api` fixture for this file.
 *
 * Green path in your head:
 *  1) Import from ../globalConfig.api.js  → registers the fixture for this file
 *  2) Receive `{ api }` in the test params → Playwright injects the client
 *  3) Use `api.post(...)` to call your GraphQL endpoint
 */

import { test, expect } from '../../globalConfig.api.js';
import { safeGraphQL } from '../../helpers/testUtilsAPI.js';

// Named operation helps debugging & tooling.
const REGISTER_PATIENT_MUTATION = `
  mutation ($patient: Register!) {
    patient { register(patient: $patient) { id uuid firstName lastName username } }
  }
`;

function uniqueSuffix() {
  // 13-digit ms timestamp + 6 random digits, zero-padded (can be refactored as global helper if needed)
  return `${Date.now()}${Math.floor(Math.random() * 1e6)
    .toString()
    .padStart(6, '0')}`;
}

// Small helper to generate a unique patient each run (avoid duplicate clashes).
function makeNewPatient() {
  const suffix = uniqueSuffix();

  return {
    firstName: 'Rainier',
    lastName: 'Amoyo',
    email: `rainierrandom_${suffix}@example.com`,
    username: `rainierrandom_${suffix}.patient`,
    password: 'Password11',
  };
}

test.describe('GraphQL: Register Patient', () => {
  test('Should register a new patient @api @smoke', async ({ api }) => {
    const patient = makeNewPatient();

    // One-line transport + GraphQL success check
    const registerRes = await safeGraphQL(api, {
      query: REGISTER_PATIENT_MUTATION,
      variables: { patient },
    });

    await test.step('GraphQL should succeed', async () => {
      expect(registerRes.ok, registerRes.error || 'GraphQL call failed').toBe(true);
    });

    // Payload assertions (soft so you can see multiple mismatches in one run)
    await test.step('Validate payload', async () => {
      const reg = registerRes.body?.data?.patient?.register;
      expect(reg, 'Missing data.patient.register').toBeTruthy();

      // basic type checks (soft) for clearer failures
      expect.soft(typeof reg.id).toBe('string');
      expect.soft(typeof reg.uuid).toBe('string');

      // UUID helper (named for readability)
      const UUID36 = /^[0-9a-fA-F-]{36}$/;

      expect.soft(reg.uuid).toMatch(UUID36);
      expect.soft(reg.firstName).toBe(patient.firstName);
      expect.soft(reg.lastName).toBe(patient.lastName);
      expect.soft(reg.username).toBe(patient.username);
    });
  });
});
