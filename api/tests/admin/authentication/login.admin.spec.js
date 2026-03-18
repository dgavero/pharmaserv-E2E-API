import { test, expect } from '../../../globalConfig.api.js';
import { loginAsAdminAndGetTokens } from '../../../helpers/auth.js';
import { getAdminCredentials } from '../../../helpers/roleCredentials.js';

// Test-level builder (ok to add fallbacks here if you want local dev defaults)
function buildAdminCreds() {
  return getAdminCredentials('default');
}

test.describe('GraphQL: Admin Login', () => {
  test(
    'PHARMA-30 | Admin Login And Return Tokens',
    {
      tag: ['@api', '@admin', '@positive', '@login', '@pharma-30', '@smoke'],
    },
    async ({ api }) => {
      const creds = buildAdminCreds();
      const { accessToken, refreshToken, raw } = await loginAsAdminAndGetTokens(api, creds);

      expect(raw.ok, raw.error || `Admin login failed (HTTP ${raw.httpStatus})`).toBe(true);
      expect(typeof accessToken).toBe('string');
      expect(accessToken.length).toBeGreaterThan(10);
      expect(typeof refreshToken).toBe('string');
      expect(refreshToken.length).toBeGreaterThan(10);
    }
  );
});
