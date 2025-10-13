/**
 * Duplicate-registration negative test
 * - Uses a fixed (non-random) email/username.
 * - If the API allows a duplicate, this test FAILS.
 * - If the API rejects it, we assert that the GraphQL error mentions the duplicate.
 */

import { test, expect } from '../globalConfig.api.js';
import { safeGraphQL } from '../helpers/testUtilsAPI.js';

const REGISTER_PATIENT_MUTATION = `
  mutation RegisterPatient($patient: Register!) {
    patient { register(patient: $patient) { id uuid firstName lastName username } }
  }
`;

// Fixed patient (no randomness). Re-run friendly.
function buildFixedPatient() {
  return {
    firstName: 'Rainier',
    lastName: 'Amoyo',
    email: 'rainier@gmail.com',       
    username: 'rainier.patient',      
    password: 'Password1',
  };
}

test.describe('GraphQL: Register Patient', () => {
  test('should reject duplicate registration @smoke2', async ({ api }) => {
    const patient = buildFixedPatient();
    const DUPLICATE_HINT = /already\s+registered/i; // fuzzy, case-insensitive

    // First call: create (or it may already exist—both fine)
    await safeGraphQL(api, {
      query: REGISTER_PATIENT_MUTATION,
      operationName: 'RegisterPatient',
      variables: { patient },
    });

    // Second call: must be rejected as duplicate
    const second = await safeGraphQL(api, {
      query: REGISTER_PATIENT_MUTATION,
      operationName: 'RegisterPatient',
      variables: { patient },
    });

    // Core expectation: duplicates are NOT allowed
    expect(second.ok, 'API allowed duplicate registration').toBeFalsy();

    // Message should *hint* at duplicate (fuzzy match)
    const errorText =
      second.error || JSON.stringify(second.body?.errors ?? [], null, 2);

    // Soft so you still see the full failure context if this changes
    expect.soft(errorText).toMatch(DUPLICATE_HINT);
  });
});