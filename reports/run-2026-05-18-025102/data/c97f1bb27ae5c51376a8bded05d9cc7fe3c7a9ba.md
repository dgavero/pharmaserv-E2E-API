# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: api/tests/patient/onboarding/patient.getAdsLocations.spec.js >> GraphQL: Patient Get Ads Locations >> PHARMA-286 | Should be able to get ads locations with missing auth tokens
- Location: api/tests/patient/onboarding/patient.getAdsLocations.spec.js:29:7

# Error details

```
Error: HTTP 503 {"timestamp":"2026-05-18T02:47:04.098+00:00","path":"/api/v1/pharmaserv/graphql","status":503,"error":"Service Unavailable","requestId":"94070b0d-154668"}

expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Test source

```ts
  1   | import { loginAsPatientAndGetTokens, NOAUTH_MESSAGE_PATTERN, NOAUTH_CLASSIFICATIONS, NOAUTH_CODES, NOAUTH_HTTP_STATUSES } from '../../../helpers/auth.js';
  2   | import { safeGraphQL, bearer, getGQLError } from '../../../helpers/graphqlUtils.js';
  3   | import { test, expect } from '../../../globalConfig.api.js';
  4   | import { getPatientCredentials } from '../../../helpers/roleCredentials.js';
  5   | import { GET_ADS_LOCATIONS_QUERY } from './patient.onboardingQueries.js';
  6   | 
  7   | test.describe('GraphQL: Patient Get Ads Locations', () => {
  8   |   test(
  9   |     'PHARMA-285 | Should be able to get ads locations',
  10  |     {
  11  |       tag: ['@api', '@patient', '@positive', '@pharma-285'],
  12  |     },
  13  |     async ({ api }) => {
  14  |       const { accessToken, raw: loginRes } = await loginAsPatientAndGetTokens(api, getPatientCredentials('default'));
  15  |       expect(loginRes.ok, loginRes.error || 'Patient login failed').toBe(true);
  16  | 
  17  |       const getAdsLocationsRes = await safeGraphQL(api, {
  18  |         query: GET_ADS_LOCATIONS_QUERY,
  19  |         headers: bearer(accessToken),
  20  |       });
  21  |       expect(getAdsLocationsRes.ok, getAdsLocationsRes.error || 'Get ads locations failed').toBe(true);
  22  | 
  23  |       const node = getAdsLocationsRes.body?.data?.patient?.adsLocations;
  24  |       expect(node, 'Missing data.patient.adsLocations').toBeTruthy();
  25  |       expect.soft(Array.isArray(node)).toBe(true);
  26  |     }
  27  |   );
  28  | 
  29  |   test(
  30  |     'PHARMA-286 | Should be able to get ads locations with missing auth tokens',
  31  |     {
  32  |       tag: ['@api', '@patient', '@positive', '@pharma-286'],
  33  |     },
  34  |     async ({ api, noAuth }) => {
  35  |       const getAdsLocationsNoAuthRes = await safeGraphQL(api, {
  36  |         query: GET_ADS_LOCATIONS_QUERY,
  37  |         headers: noAuth,
  38  |       });
  39  |       expect(
  40  |         getAdsLocationsNoAuthRes.ok,
  41  |         getAdsLocationsNoAuthRes.error || 'Get ads locations with no auth failed'
> 42  |       ).toBe(true);
      |         ^ Error: HTTP 503 {"timestamp":"2026-05-18T02:47:04.098+00:00","path":"/api/v1/pharmaserv/graphql","status":503,"error":"Service Unavailable","requestId":"94070b0d-154668"}
  43  | 
  44  |       const node = getAdsLocationsNoAuthRes.body?.data?.patient?.adsLocations;
  45  |       expect(node, 'Missing data.patient.adsLocations').toBeTruthy();
  46  |       expect.soft(Array.isArray(node)).toBe(true);
  47  |     }
  48  |   );
  49  | 
  50  |   test(
  51  |     'PHARMA-287 | Should NOT be able to get ads locations with invalid auth tokens',
  52  |     {
  53  |       tag: ['@api', '@patient', '@negative', '@pharma-287'],
  54  |     },
  55  |     async ({ api, invalidAuth }) => {
  56  |       const getAdsLocationsInvalidAuthRes = await safeGraphQL(api, {
  57  |         query: GET_ADS_LOCATIONS_QUERY,
  58  |         headers: invalidAuth,
  59  |       });
  60  |       expect(getAdsLocationsInvalidAuthRes.ok).toBe(false);
  61  | 
  62  |       if (!getAdsLocationsInvalidAuthRes.httpOk) {
  63  |         expect(NOAUTH_HTTP_STATUSES).toContain(getAdsLocationsInvalidAuthRes.httpStatus);
  64  |       } else {
  65  |         const { message, code, classification } = getGQLError(getAdsLocationsInvalidAuthRes);
  66  |         expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
  67  |         expect.soft(NOAUTH_CODES).toContain(code);
  68  |         expect.soft(NOAUTH_CLASSIFICATIONS).toContain(classification);
  69  |       }
  70  |     }
  71  |   );
  72  | 
  73  |   test(
  74  |     'PHARMA-498 | Ads locations should satisfy list-item response contract shape',
  75  |     {
  76  |       tag: ['@api', '@patient', '@positive', '@pharma-498'],
  77  |     },
  78  |     async ({ api }) => {
  79  |       const { accessToken, raw: loginRes } = await loginAsPatientAndGetTokens(api, getPatientCredentials('default'));
  80  |       expect(loginRes.ok, loginRes.error || 'Patient login failed').toBe(true);
  81  | 
  82  |       const getAdsLocationsRes = await safeGraphQL(api, {
  83  |         query: GET_ADS_LOCATIONS_QUERY,
  84  |         headers: bearer(accessToken),
  85  |       });
  86  |       expect(getAdsLocationsRes.httpStatus).toBe(200);
  87  |       expect(getAdsLocationsRes.httpOk).toBe(true);
  88  |       expect(getAdsLocationsRes.ok, getAdsLocationsRes.error || 'Get ads locations failed').toBe(true);
  89  | 
  90  |       const node = getAdsLocationsRes.body?.data?.patient?.adsLocations;
  91  |       expect(Array.isArray(node), 'Missing or invalid data.patient.adsLocations').toBe(true);
  92  |       if (node.length > 0) {
  93  |         expect.soft(typeof node[0]?.id).toBe('string');
  94  |         expect.soft(typeof node[0]?.locationCode).toBe('string');
  95  |         expect.soft(typeof node[0]?.location).toBe('string');
  96  |         expect.soft(typeof node[0]?.address).toBe('string');
  97  |         expect.soft(Array.isArray(node[0]?.codes)).toBe(true);
  98  |       }
  99  |     }
  100 |   );
  101 | });
  102 | 
```