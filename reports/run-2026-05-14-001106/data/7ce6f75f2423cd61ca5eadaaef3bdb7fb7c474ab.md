# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: api/tests/pharmacy/profile/me.spec.js >> GraphQL: Pharmacist Profile >> PHARMA-146 | Should NOT be able to get pharmacist profile with Invalid Auth
- Location: api/tests/pharmacy/profile/me.spec.js:63:7

# Error details

```
Error: expect(received).toContain(expected) // indexOf

Expected value: 503
Received array: [401, 404, 403, 500]
```

# Test source

```ts
  1   | import { loginAsPharmacistAndGetTokens, NOAUTH_MESSAGE_PATTERN, NOAUTH_CLASSIFICATIONS, NOAUTH_CODES, NOAUTH_HTTP_STATUSES } from '../../../helpers/auth.js';
  2   | import { safeGraphQL, bearer, getGQLError } from '../../../helpers/graphqlUtils.js';
  3   | import { test, expect } from '../../../globalConfig.api.js';
  4   | import { getPharmacistCredentials } from '../../../helpers/roleCredentials.js';
  5   | import { PHARMACIST_ME_QUERY } from './pharmacy.profileQueries.js';
  6   | 
  7   | test.describe('GraphQL: Pharmacist Profile', () => {
  8   |   test(
  9   |     'PHARMA-143 | Should be able to get my profile as Regular Pharmacist',
  10  |     {
  11  |       tag: ['@api', '@pharmacist', '@positive', '@pharma-143', '@smoke'],
  12  |     },
  13  |     async ({ api }) => {
  14  |       const { accessToken, raw: loginRes } = await loginAsPharmacistAndGetTokens(api, getPharmacistCredentials('reg01'));
  15  |       expect(loginRes.ok, loginRes.error || 'Pharmacist login failed').toBe(true);
  16  | 
  17  |       const meRes = await safeGraphQL(api, {
  18  |         query: PHARMACIST_ME_QUERY,
  19  |         headers: bearer(accessToken),
  20  |       });
  21  |       expect(meRes.ok, meRes.error || 'Failed to get pharmacist profile').toBe(true);
  22  |     }
  23  |   );
  24  | 
  25  |   test(
  26  |     'PHARMA-144 | Should be able to get my profile as PSE Pharmacist',
  27  |     {
  28  |       tag: ['@api', '@pharmacist', '@positive', '@pharma-144'],
  29  |     },
  30  |     async ({ api }) => {
  31  |       const { accessToken, raw: loginRes } = await loginAsPharmacistAndGetTokens(api, getPharmacistCredentials('reg01'));
  32  |       expect(loginRes.ok, loginRes.error || 'Pharmacist login failed').toBe(true);
  33  | 
  34  |       const meRes = await safeGraphQL(api, {
  35  |         query: PHARMACIST_ME_QUERY,
  36  |         headers: bearer(accessToken),
  37  |       });
  38  |       expect(meRes.ok, meRes.error || 'Failed to get pharmacist profile').toBe(true);
  39  |     }
  40  |   );
  41  | 
  42  |   test(
  43  |     'PHARMA-145 | Should NOT be able to get pharmacist profile with No Auth',
  44  |     {
  45  |       tag: ['@api', '@pharmacist', '@negative', '@pharma-145'],
  46  |     },
  47  |     async ({ api, noAuth }) => {
  48  |       const meResNoAuth = await safeGraphQL(api, {
  49  |         query: PHARMACIST_ME_QUERY,
  50  |         headers: noAuth,
  51  |       });
  52  | 
  53  |       // Main Assertion
  54  |       expect(meResNoAuth.ok, meResNoAuth.error || 'Get Pharmacist Profile request is expected to fail').toBe(false);
  55  | 
  56  |       const { message, classification, code } = getGQLError(meResNoAuth);
  57  |       expect(message).toMatch(NOAUTH_MESSAGE_PATTERN);
  58  |       expect(NOAUTH_CLASSIFICATIONS).toContain(classification);
  59  |       expect(NOAUTH_CODES).toContain(code);
  60  |     }
  61  |   );
  62  | 
  63  |   test(
  64  |     'PHARMA-146 | Should NOT be able to get pharmacist profile with Invalid Auth',
  65  |     {
  66  |       tag: ['@api', '@pharmacist', '@negative', '@pharma-146'],
  67  |     },
  68  |     async ({ api, invalidAuth }) => {
  69  |       const meResInvalidAuth = await safeGraphQL(api, {
  70  |         query: PHARMACIST_ME_QUERY,
  71  |         headers: invalidAuth,
  72  |       });
  73  |       // Main Assertion
  74  |       expect(meResInvalidAuth.ok, meResInvalidAuth.error || 'Get Pharmacist Profile request is expected to fail').toBe(
  75  |         false
  76  |       );
  77  | 
  78  |       // Transport-level 401 (no GraphQL errors[])
  79  |       expect(meResInvalidAuth.ok).toBe(false);
  80  |       expect(meResInvalidAuth.httpOk).toBe(false);
> 81  |       expect(NOAUTH_HTTP_STATUSES).toContain(meResInvalidAuth.httpStatus);
      |                                    ^ Error: expect(received).toContain(expected) // indexOf
  82  |     }
  83  |   );
  84  | 
  85  |   test(
  86  |     'PHARMA-545 | Pharmacist me should satisfy response contract shape',
  87  |     {
  88  |       tag: ['@api', '@pharmacist', '@positive', '@pharma-545'],
  89  |     },
  90  |     async ({ api }) => {
  91  |       const { accessToken, raw: loginRes } = await loginAsPharmacistAndGetTokens(api, getPharmacistCredentials('reg01'));
  92  |       expect(loginRes.ok, loginRes.error || 'Pharmacist login failed').toBe(true);
  93  | 
  94  |       const meRes = await safeGraphQL(api, {
  95  |         query: PHARMACIST_ME_QUERY,
  96  |         headers: bearer(accessToken),
  97  |       });
  98  |       expect(meRes.httpStatus).toBe(200);
  99  |       expect(meRes.httpOk).toBe(true);
  100 |       expect(meRes.ok, meRes.error || 'Failed to get pharmacist profile').toBe(true);
  101 | 
  102 |       const node = meRes.body?.data?.pharmacist?.me;
  103 |       expect(node, 'Missing data.pharmacist.me').toBeTruthy();
  104 |       expect.soft(typeof node?.id).toBe('string');
  105 |       expect.soft(typeof node?.username).toBe('string');
  106 |       expect.soft(typeof node?.admin).toBe('boolean');
  107 |       expect.soft(typeof node?.psePharmacist).toBe('boolean');
  108 |     }
  109 |   );
  110 | });
  111 | 
```