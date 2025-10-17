// tests/api/register.spec.js

/**
 * GraphQL: Register Patient
 * - Positive: creates a brand-new patient (unique email/username per run).
 * - Negative: rejects duplicate registration (fixed identity).
 *
 * Notes:
 * - Uses safeGraphQL for consistent transport/GraphQL handling.
 * - Keeps assertions minimal and readable; hard gates for success/failure,
 *   soft checks for payload details.
 */

import { test, expect } from '../../globalConfig.api.js';
import { safeGraphQL } from '../../helpers/testUtilsAPI.js';

const REGISTER_PATIENT_MUTATION = `
  mutation ($patient: Register!) {
    patient { register(patient: $patient) { id uuid firstName lastName username } }
  }
`;

// ----- Helpers (unique positive + fixed negative) -----

function uniqueSuffix() {
  // 13-digit ms timestamp + 6 random digits, zero-padded
  return `${Date.now()}${Math.floor(Math.random() * 1e6)
    .toString()
    .padStart(6, '0')}`;
}

// Small helper to generate a unique patient each run (avoid duplicate clashes).
function makeNewPatient() {
  const suffix = uniqueSuffix();
  return {
    firstName: 'RainierQA',
    lastName: 'AmoyoQA',
    email: `rainierrandomqa_${suffix}@example.com`,
    username: `rainierrandomqa_${suffix}.patient`,
    password: 'Password123qa',
  };
}

// Fixed patient (no randomness). Re-run friendly for duplicate negative.
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
  test('Should Register A New Patient @api @patient @positive', async ({ api }) => {
    const patient = makeNewPatient();

    const registerRes = await safeGraphQL(api, {
      query: REGISTER_PATIENT_MUTATION,
      variables: { patient },
    });

    await test.step('GraphQL should succeed', async () => {
      expect(registerRes.ok, registerRes.error || 'GraphQL call failed').toBe(true);
    });

    await test.step('Validate payload', async () => {
      const reg = registerRes.body?.data?.patient?.register;
      expect(reg, 'Missing data.patient.register').toBeTruthy();

      // basic type checks (soft) for clearer failures
      expect.soft(typeof reg.id).toBe('string');
      expect.soft(typeof reg.uuid).toBe('string');

      // UUID helper (named for readability)
      const UUID36 = /^[0-9a-fA-F-]{36}$/;
      expect.soft(reg.uuid).toMatch(UUID36);

      // value checks
      expect.soft(reg.firstName).toBe(patient.firstName);
      expect.soft(reg.lastName).toBe(patient.lastName);
      expect.soft(reg.username).toBe(patient.username);
    });
  });

  test('Should Reject Duplicate Registration @api @patient @negative', async ({ api }) => {
    const patient = buildFixedPatient();
    const DUPLICATE_HINT = /already\s+registered/i; // fallback hint if server lacks structured fields

    // 1) Seed: attempt an initial registration to ensure the user exists.
    //    Best-effort: if it already exists, the call may return a conflict — that's fine.
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

    // 3) Conflict details: prefer structured GraphQL fields; otherwise fall back to message text.
    await test.step('Assert conflict details', async () => {
      const code = String(second.errorCode ?? '').trim(); // e.g., "409"
      const classification = String(second.errorClass ?? '').trim(); // e.g., "CONFLICT"
      const message =
        second.errorMessage ?? second.error ?? JSON.stringify(second.body?.errors ?? [], null, 2);

      if (code || classification) {
        expect.soft(code).toBe('409');
        expect.soft(classification).toBe('CONFLICT');
      } else {
        expect.soft(message).toMatch(DUPLICATE_HINT);
      }
    });
  });
});
