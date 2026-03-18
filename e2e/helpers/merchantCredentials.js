function requireCredentialValue(accountKey, fieldName, rawValue) {
  const value = String(rawValue ?? '').trim();
  if (!value) {
    throw new Error(`Missing ${fieldName} for merchant portal credentials (${accountKey})`);
  }
  return value;
}

export function getMerchantPortalCredentials(accountKey = 'regular') {
  const normalizedKey = String(accountKey || 'regular').trim().toLowerCase();
  const accountMap = {
    regular: {
      usernameKey: 'MERCHANT_USERNAME',
      passwordKey: 'MERCHANT_PASSWORD',
    },
    pse: {
      usernameKey: 'MERCHANT_USERNAME_PSE',
      passwordKey: 'MERCHANT_PASSWORD_PSE',
    },
  };

  const accountConfig = accountMap[normalizedKey];
  if (!accountConfig) {
    throw new Error(`Unknown merchant portal credential key: ${accountKey}`);
  }

  return {
    username: requireCredentialValue(normalizedKey, accountConfig.usernameKey, process.env[accountConfig.usernameKey]),
    password: requireCredentialValue(normalizedKey, accountConfig.passwordKey, process.env[accountConfig.passwordKey]),
  };
}
