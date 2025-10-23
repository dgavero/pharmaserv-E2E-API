import { test, expect } from '../../globalConfig.api.js';
import { adminLoginAndGetTokens } from '../../helpers/testUtilsAPI.js';

// Test-level builder (ok to add fallbacks here if you want local dev defaults)
function buildAdminCreds() {
  return {
    username: process.env.ADMIN_USERNAME,
    password: process.env.ADMIN_PASSWORD,
  };
}

test.describe('GraphQL: Admin Login', () => {
  test('Should Login And Return Tokens @api @admin @positive @login', async ({ api }) => {
    const creds = buildAdminCreds();
    const { accessToken, refreshToken, raw } = await adminLoginAndGetTokens(api, creds);

    expect(raw.ok, raw.error || `Admin login failed (HTTP ${raw.httpStatus})`).toBe(true);
    expect(typeof accessToken).toBe('string');
    expect(accessToken.length).toBeGreaterThan(10);
    expect(typeof refreshToken).toBe('string');
    expect(refreshToken.length).toBeGreaterThan(10);
  });
});
