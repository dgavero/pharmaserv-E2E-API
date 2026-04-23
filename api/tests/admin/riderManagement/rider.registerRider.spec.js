import {
  loginAsAdminAndGetTokens,
  loginAsPatientAndGetTokens,
  loginAsRiderAndGetTokens,
  loginAsPharmacistAndGetTokens,
  NOAUTH_MESSAGE_PATTERN,
  NOAUTH_CLASSIFICATIONS,
  NOAUTH_CODES,
  NOAUTH_HTTP_STATUSES,
} from '../../../helpers/auth.js';
import { safeGraphQL, bearer, getGQLError } from '../../../helpers/graphqlUtils.js';
import { test, expect } from '../../../globalConfig.api.js';
import { getAdminCredentials, getPatientAccount, getRiderAccount, getPharmacistAccount } from '../../../helpers/roleCredentials.js';
import { randomAlphanumeric, randomNum } from '../../../../helpers/globalTestUtils.js';
import { REGISTER_RIDER_MUTATION } from './rider.riderManagementQueries.js';

// Build Correct Rider Input Payload
function buildRiderInput() {
  const firstName = `Auto`;
  const lastName = `Rider`;
  const email = `autoRider+${randomAlphanumeric(6)}@example.com`;
  const username = `autoRider_${randomAlphanumeric(6)}`;
  const phoneNumber = `+639${randomNum(9)}`;
  const houseNumber = `${randomNum(3)}`;
  const street = `${randomNum(3)} Main St`;
  const barangay = `Barangay ${randomAlphanumeric(4)}`;
  const city = `Manila`;
  const zipCode = `${randomNum(4)}`;
  const password = `Password123`;
  return {
    firstName,
    lastName,
    email,
    username,
    phoneNumber,
    houseNumber,
    street,
    barangay,
    city,
    zipCode,
    password,
  };
}

test.describe('GraphQL: Rider Register', () => {
  test(
    'PHARMA-31 | Should Login As Admin And Register A New Rider',
    {
      tag: ['@api', '@admin', '@positive', '@pharma-31'],
    },
    async ({ api }) => {
      const { accessToken } = await loginAsAdminAndGetTokens(api, getAdminCredentials('default'));

      // 2) Prepare unique rider input to avoid duplicates
      const riderInput = buildRiderInput();

      // 3) Call register
      const reg = await test.step('Register rider', async () =>
        safeGraphQL(api, {
          query: REGISTER_RIDER_MUTATION,
          variables: { rider: riderInput },
          headers: bearer(accessToken),
        }));

      // 4) Main Assertion
      expect(reg.ok, reg.error || `Register new rider failed (HTTP ${reg.httpStatus})`).toBe(true);

      const node = reg.body?.data?.administrator?.rider?.register;
      expect(node, 'Missing data.administrator.rider.register').toBeTruthy();
      expect.soft(typeof node.id).toBe('string');
      expect.soft(typeof node.uuid).toBe('string');
      expect.soft(typeof node.firstName).toBe('string');
      expect.soft(typeof node.lastName).toBe('string');
      expect.soft(typeof node.username).toBe('string');

      // 5) Assert returned data matches input
      expect.soft(node.firstName).toBe(riderInput.firstName);
      expect.soft(node.lastName).toBe(riderInput.lastName);
      expect.soft(node.username).toBe(riderInput.username);

      // loose UUIDv4 check
      const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect.soft(node.uuid).toMatch(uuidRe);
    }
  );

  test(
    'PHARMA-32 | Should Reject Duplicate Rider Registration',
    {
      tag: ['@api', '@admin', '@negative', '@pharma-32'],
    },
    async ({ api }) => {
      // 1) Admin login
      const { accessToken } = await loginAsAdminAndGetTokens(api, getAdminCredentials('default'));

      // 2) Known-duplicate payload
      const existingRider = {
        firstName: 'Dave',
        lastName: 'Rider',
        email: 'daverider1@yahoo.com',
        username: 'daverider1.rider',
        houseNumber: '123',
        street: '123 Main St',
        barangay: 'Barangay 1234',
        city: 'Manila',
        zipCode: '1000',
        phoneNumber: `+639123456789`,
        password: 'Password123',
      };

      // 3) Attempt duplicate register
      const regDupeRider = await test.step('Register duplicate rider @create', async () =>
        safeGraphQL(api, {
          query: REGISTER_RIDER_MUTATION,
          variables: { rider: existingRider },
          headers: bearer(accessToken),
        }));

      // 4) Assert failure (either transport 409 or resolver error)
      expect(regDupeRider.ok).toBe(false);

      if (!regDupeRider.httpOk) {
        // Transport layer blocked it (e.g., HTTP 409)
        expect(regDupeRider.httpStatus).toBe(409);
        return;
      }

      // Resolver error path (HTTP 200 + errors[])
      const { message, code, classification } = getGQLError(regDupeRider);

      // Fuzzy message: just check the key phrase (case-insensitive)
      expect(message.toLowerCase()).toContain('already registered');

      // Soft checks
      expect.soft(code).toBe('409');
      expect.soft(classification).toBe('CONFLICT');
    }
  );

  // Unauthorized (no bearer) → expect 401 transport or UNAUTHORIZED
  test(
    'PHARMA-33 | Should Reject Rider Registration Without Token @api @admin @negative @create',
    {
      tag: ['@api', '@admin', '@negative', '@pharma-33'],
    },
    async ({ api }) => {
      const riderInput = buildRiderInput();

      const regRiderNoToken = await test.step('Register rider without token @create', async () =>
        safeGraphQL(api, {
          query: REGISTER_RIDER_MUTATION, // test-level mutation
          variables: { rider: riderInput },
        }));

      // Expect failure
      expect(regRiderNoToken.ok).toBe(false);

      // Resolver error contract (HTTP 200 + errors[])
      const { message, code, classification } = getGQLError(regRiderNoToken);

      // Hard check: message contains any of the expected no-auth messages
      expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);

      // Soft checks: code & classification
      expect.soft(NOAUTH_CODES).toContain(code);
      expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
    }
  );

  // Missing required field (password = empty) → INTERNAL_SERVER_ERROR (500)
  test(
    'PHARMA-34 | Should Accept Rider Registration without Password',
    {
      tag: ['@api', '@admin', '@positive', '@pharma-34'],
    },
    async ({ api }) => {
      // Admin login
      const { accessToken } = await loginAsAdminAndGetTokens(api, getAdminCredentials('default'));

      const riderInput = buildRiderInput();
      // Delete password variable to simulate missing required field
      delete riderInput.password;

      const regRiderNoPass = await test.step('Register rider with empty password', async () =>
        safeGraphQL(api, {
          query: REGISTER_RIDER_MUTATION,
          variables: { rider: riderInput },
          headers: bearer(accessToken),
        }));

      // Expect success (temp password will be sent to email)
      expect(regRiderNoPass.ok).toBe(true);
    }
  );

  test(
    'PHARMA-476 | Should reject rider registration for non-admin roles',
    {
      tag: ['@api', '@admin', '@negative', '@create', '@pharma-476'],
    },
    async ({ api }) => {
      const roleCases = [
        {
          role: 'patient',
          login: () => loginAsPatientAndGetTokens(api, getPatientAccount('default')),
        },
        {
          role: 'rider',
          login: () => loginAsRiderAndGetTokens(api, getRiderAccount('default')),
        },
        {
          role: 'pharmacist',
          login: () => loginAsPharmacistAndGetTokens(api, getPharmacistAccount('reg01')),
        },
      ];

      for (const roleCase of roleCases) {
        const { accessToken, raw: loginRes } = await roleCase.login();
        expect(loginRes.ok, `${roleCase.role} login failed`).toBe(true);

        const regRes = await safeGraphQL(api, {
          query: REGISTER_RIDER_MUTATION,
          variables: { rider: buildRiderInput() },
          headers: bearer(accessToken),
        });

        expect(regRes.ok, `${roleCase.role} should not be authorized to register rider`).toBe(false);
        if (!regRes.httpOk) {
          expect(NOAUTH_HTTP_STATUSES, `${roleCase.role} expected unauthorized transport status`).toContain(
            regRes.httpStatus
          );
        } else {
          const { message, code, classification } = getGQLError(regRes);
          expect(message, `${roleCase.role} expected GraphQL auth/permission message`).toMatch(
            NOAUTH_MESSAGE_PATTERN
          );
          expect.soft(NOAUTH_CODES, `${roleCase.role} expected auth/permission code`).toContain(code);
          expect.soft(NOAUTH_CLASSIFICATIONS, `${roleCase.role} expected auth classification`).toContain(
            classification
          );
        }
      }
    }
  );
});
