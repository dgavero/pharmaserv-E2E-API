/**
 * This test imports the *fixture-enabled* `test`/`expect` from globalConfig.api.js.
 * That is what "turns on" the `api` fixture for this file.
 *
 * Green path in your head:
 *  1) Import from ../globalConfig.api.js  → registers the fixture for this file
 *  2) Receive `{ api }` in the test params → Playwright injects the client
 *  3) Use `api.post(...)` to call your GraphQL endpoint
 */

import { test, expect } from '../globalConfig.api.js';
import { safeGraphQL } from '../helpers/testUtilsAPI.js';

// Named operation helps debugging & tooling.
const REGISTER_PATIENT_MUTATION = `
  mutation RegisterPatient($patient: Register!) {
    patient { register(patient: $patient) { id uuid firstName lastName username } }
  }
`;


// Small helper to generate a unique patient each run (avoid duplicate clashes).
function makeNewPatient() {
  const suffix = Math.random().toString(36).slice(2, 8);
  return {
    firstName: 'Rainier',
    lastName: 'Amoyo',
    email: `rainierrandom_${suffix}@example.com`,
    username: `rainierrandom_${suffix}.patient`,
    password: 'Password11',
  };
}

test.describe('GraphQL: Register Patient', () => {
  test('should register a new patient @api @smoke1', async ({ api }) => {
    const patient = makeNewPatient();

    // One-line transport + GraphQL success check
    const { ok, body, error } = await safeGraphQL(api, {
      query: REGISTER_PATIENT_MUTATION,
      operationName: 'RegisterPatient',
      variables: { patient },
    });
    expect(ok, error || 'GraphQL call failed').toBeTruthy();

    // Payload assertions (soft so you can see multiple mismatches in one run)
    const reg = body?.data?.patient?.register;
    expect(reg).toBeTruthy();
    expect.soft(reg.id).toBeTruthy();
    expect.soft(reg.uuid).toMatch(/^[0-9a-fA-F-]{36}$/);
    expect.soft(reg.firstName).toBe(patient.firstName);
    expect.soft(reg.lastName).toBe(patient.lastName);
    expect.soft(reg.username).toBe(patient.username);
  });
});
