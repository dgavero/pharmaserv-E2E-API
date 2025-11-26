// import { test, expect } from '../../../globalConfig.api.js';
// import { REQ_OTP_QUERY } from '../patient.queries.js';
// import {
//   safeGraphQL,
//   getGQLError,
//   NOAUTH_MESSAGE_PATTERN,
//   NOAUTH_CLASSIFICATIONS,
//   NOAUTH_CODES,
// } from '../../../helpers/testUtilsAPI.js';
// import { randomAlphanumeric, randomNum } from '../../../../helpers/globalTestUtils.js';

// const REGISTER_PATIENT_MUTATION = `
// mutation ($patientId: ID!, $patient: Register!) { patient { register(patientId: $patientId, patient: $patient) { id uuid firstName lastName username } } }
// `;

// // helper to generate a unique patient each run (avoid duplicate clashes).
// function makeNewPatient() {
//   const suffix = randomAlphanumeric(10); // e.g., "a9m2x0q1bz"
//   return {
//     firstName: 'RainierQA',
//     lastName: 'AmoyoQA',
//     email: `rainierrandomqa_${suffix}@example.com`,
//     username: `rainierrandomqa_${suffix}.patient`,
//     password: 'Password123qa',
//     phoneNumber: '',
//   };
// }

// // Fixed patient (no randomness). Re-run friendly for duplicate negative.
// function buildFixedPatient() {
//   return {
//     firstName: 'Dave',
//     lastName: 'TheG',
//     email: 'davetheg@gmail.com',
//     username: 'davetheg.patient',
//     password: 'Password123',
//     phoneNumber: '',
//   };
// }

// function buildPhoneNumberInput() {
//   const phoneNumber = `+639${randomNum(9)}`;
//   console.log(`Using phone number: ${phoneNumber}`);
//   return phoneNumber;
// }

// const phoneNumberInput = buildPhoneNumberInput();

// // Request OTP and return the patient ID
// const getPatientId = async ({ api, noAuth }) => {
//   const getPatientIdRes = await safeGraphQL(api, {
//     query: REQ_OTP_QUERY,
//     variables: { phoneNumber: phoneNumberInput },
//     headers: noAuth,
//   });

//   // Main Assertion
//   expect(getPatientIdRes.ok, getPatientIdRes.error || 'Request signup OTP failed').toBe(true);

//   const node = getPatientIdRes.body.data.patient.requestSignupOTP;
//   expect(node && node.id, 'requestSignupOTP.id is null or missing').toBeTruthy();
//   console.log(`The id returned is: ${node.id}`);
//   return node.id; // 🔹 return the id to use on main tests
// };

// test.describe('GraphQL: Register Patient', () => {
//   test(
//     'PHARMA-6 | Able to Register A New Patient Successfully',
//     {
//       tag: ['@api', '@patient', '@positive', '@register', '@pharma-6'],
//     },
//     async ({ api, noAuth }) => {
//       const patientId = await getPatientId({ api, noAuth });
//       const patient = makeNewPatient();
//       patient.phoneNumber = phoneNumberInput;
//       const registerRes = await safeGraphQL(api, {
//         query: REGISTER_PATIENT_MUTATION,
//         variables: { patientId, patient },
//       });

//       await test.step('GraphQL should succeed', async () => {
//         expect(registerRes.ok, registerRes.error || 'GraphQL call failed').toBe(true);
//       });

//       await test.step('Validate payload', async () => {
//         const reg = registerRes.body?.data?.patient?.register;
//         expect(reg, 'Missing data.patient.register').toBeTruthy();

//         // basic type checks (soft) for clearer failures
//         expect.soft(typeof reg.id).toBe('string');
//         expect.soft(typeof reg.uuid).toBe('string');

//         // UUID helper (named for readability)
//         const UUID36 = /^[0-9a-fA-F-]{36}$/;
//         expect.soft(reg.uuid).toMatch(UUID36);

//         // value checks
//         expect.soft(reg.firstName).toBe(patient.firstName);
//         expect.soft(reg.lastName).toBe(patient.lastName);
//         expect.soft(reg.username).toBe(patient.username);
//       });
//     }
//   );

//   test(
//     'PHARMA-7 | Should Reject Duplicate Registration @api @patient @negative @create',
//     {
//       tag: ['@api', '@patient', '@negative', '@register', '@pharma-7'],
//     },
//     async ({ api }) => {
//       const patient = buildFixedPatient();
//       const DUPLICATE_HINT = /already\s+registered/i; // fallback hint if server lacks structured fields

//       // 1) Seed: attempt an initial registration to ensure the user exists.
//       //    Best-effort: if it already exists, the call may return a conflict — that's fine.
//       await test.step('Seed initial registration (best-effort)', async () => {
//         await safeGraphQL(api, {
//           query: REGISTER_PATIENT_MUTATION,
//           variables: { patientId, patient },
//         });
//       });

//       // 2) Second call: must be rejected as duplicate.
//       const second = await safeGraphQL(api, {
//         query: REGISTER_PATIENT_MUTATION,
//         variables: { patientId, patient },
//       });

//       await test.step('Second registration should fail', async () => {
//         expect(second.ok, 'API allowed duplicate registration').toBe(false);
//       });

//       // 3) Conflict details: prefer structured GraphQL fields; otherwise fall back to message text.
//       await test.step('Assert conflict details', async () => {
//         const { message, code, classification } = getGQLError(second);
//         expect.soft(message).toMatch(NOAUTH_MESSAGE_PATTERN);
//         expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
//         expect.soft(NOAUTH_CODES).toContain(code);
//       });
//     }
//   );
// });
