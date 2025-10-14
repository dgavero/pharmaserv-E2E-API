/**
 * Duplicate-registration negative test
 * - Uses a fixed (non-random) email/username.
 * - If the API allows a duplicate, this test FAILS.
 * - If the API rejects it, we assert that the GraphQL error mentions the duplicate.
 */

import { test, expect } from '../../globalConfig.api.js';
import { safeGraphQL } from '../../helpers/testUtilsAPI.js';

const REGISTER_PATIENT_MUTATION = `
  mutation ($patient: Register!) {
    patient { register(patient: $patient) { id uuid firstName lastName username } }
  }
`;

// Fixed patient (no randomness). Re-run friendly.
function buildFixedPatient() {
  return {
    firstName: 'Dave',
    lastName: 'TheG',
    email: 'davetheg@gmail.com',
    username: 'davetheg.patient',
    password: 'Password123',
  };
}

test.describe('GraphQL: Register Patient', () => {
  test('Should reject duplicate registration @api @smoke', async ({ api }) => {
    const patient = buildFixedPatient();
    const DUPLICATE_HINT = /already\s+registered/i; // fuzzy, case-insensitive

    // 1) Seed: attempt an initial registration to ensure the user exists.
    //  This is best-effort: if it already exists, the call may return a conflict — that's fine.
    await test.step('Seed initial registration (best-effort)', async () => {
      await safeGraphQL(api, {
        query: REGISTER_PATIENT_MUTATION,
        variables: { patient },
      });
    });

    // 2) Second call: must be rejected as duplicate.
    const second = await safeGraphQL(api, {
      query: REGISTER_PATIENT_MUTATION,
      variables: { patient },
    });

    await test.step('Second registration should fail', async () => {
      expect(second.ok, 'API allowed duplicate registration').toBe(false);
    });

    // 3) Conflict details: prefer structured GraphQL fields when present; otherwise fall back to message text.
    await test.step('Assert conflict details', async () => {
      const code = String(second.errorCode ?? '').trim(); // e.g., "409"
      const classification = String(second.errorClass ?? '').trim(); // e.g., "CONFLICT"
      const message =
        second.errorMessage ?? second.error ?? JSON.stringify(second.body?.errors ?? [], null, 2);

      if (code || classification) {
        expect.soft(code).toBe('409');
        expect.soft(classification).toBe('CONFLICT');
      } else {
        // No structured fields available: fallback to fuzzy duplicate hint.
        expect.soft(message).toMatch(DUPLICATE_HINT);
      }
    });
  });
});
