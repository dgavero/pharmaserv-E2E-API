// //TODO
// // Should be able to Set Rider Document with valid Auth tokens
// // Should NOT be able to Set Rider Document with missing Auth tokens
// // Should NOT be able to Set Rider Document with invalid Auth tokens
// // Should NOT be able to Set Rider Document with missing input data [photo]

// import { randomAlphanumeric, randomNum } from '../../../helpers/globalTestUtils.js';
// import { test, expect } from '../../globalConfig.api.js';
// import {
//   safeGraphQL,
//   bearer,
//   adminLoginAndGetTokens,
//   getGQLError,
//   NOAUTH_MESSAGE_PATTERN,
//   NOAUTH_CLASSIFICATIONS,
//   NOAUTH_CODES,
//   NOAUTH_HTTP_STATUSES,
// } from '../../helpers/testUtilsAPI.js';

// const MUTATION_NAME = /* GraphQL */ `
//   mutation (riderId: ID!, rider: RiderRequest!) {
//     administrator {
//       rider {
//         update(riderId: riderId, rider: rider) {
//           id
//           uuid
//           firstName
//           lastName
//           username
//         }
//       }
//     }
//   }
// `;

// function builderName() {
//   const firstName = `builderName${randomAlphanumeric(4)}`;
//   return firstName;
// }

// test.describe('GraphQL: Set Rider Document', () => {
//   test(
//     'PHARMA-55 | Should be able to Set Rider Document with valid Auth tokens',
//     {
//       tag: ['@api', '@admin', '@positive', '@pharma-55'],
//     },
//     async ({ api }) => {
//       const { accessToken, raw: loginRes } = await adminLoginAndGetTokens(api, {
//         username: process.env.ADMIN_USERNAME,
//         password: process.env.ADMIN_PASSWORD,
//       });
//       expect(loginRes.ok, loginRes.error || 'Admin login failed').toBe(true);
//     }
//   );
// });
