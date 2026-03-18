function requireCredentialValue(roleLabel, accountKey, fieldName, rawValue) {
  const value = String(rawValue ?? '').trim();
  if (!value) {
    throw new Error(`Missing ${fieldName} for ${roleLabel} credentials (${accountKey})`);
  }
  return value;
}

function resolveCredentials(roleLabel, accountKey, accountMap) {
  const normalizedKey = String(accountKey || 'default').trim().toLowerCase();
  const accountConfig = accountMap[normalizedKey];
  if (!accountConfig) {
    throw new Error(`Unknown ${roleLabel} credential key: ${accountKey}`);
  }

  return {
    username: requireCredentialValue(roleLabel, normalizedKey, accountConfig.usernameKey, process.env[accountConfig.usernameKey]),
    password: requireCredentialValue(roleLabel, normalizedKey, accountConfig.passwordKey, process.env[accountConfig.passwordKey]),
  };
}

export function getPatientCredentials(accountKey = 'default') {
  return resolveCredentials('patient', accountKey, {
    default: {
      usernameKey: 'PATIENT_USER_USERNAME',
      passwordKey: 'PATIENT_USER_PASSWORD',
    },
  });
}

export function getAdminCredentials(accountKey = 'default') {
  return resolveCredentials('admin', accountKey, {
    default: {
      usernameKey: 'ADMIN_USERNAME',
      passwordKey: 'ADMIN_PASSWORD',
    },
  });
}

export function getRiderCredentials(accountKey = 'default') {
  return resolveCredentials('rider', accountKey, {
    default: {
      usernameKey: 'RIDER_USERNAME',
      passwordKey: 'RIDER_PASSWORD',
    },
    e2e: {
      usernameKey: 'RIDER_USERNAME_E2E',
      passwordKey: 'RIDER_PASSWORD_E2E',
    },
  });
}

export function getPharmacistCredentials(accountKey = 'reg01') {
  return resolveCredentials('pharmacist', accountKey, {
    reg01: {
      usernameKey: 'PHARMACIST_USERNAME_REG01',
      passwordKey: 'PHARMACIST_PASSWORD_REG01',
    },
    reg02: {
      usernameKey: 'PHARMACIST_USERNAME_REG02',
      passwordKey: 'PHARMACIST_PASSWORD_REG02',
    },
    pse01: {
      usernameKey: 'PHARMACIST_USERNAME_PSE01',
      passwordKey: 'PHARMACIST_PASSWORD_PSE01',
    },
    admin: {
      usernameKey: 'PHARMACIST_USERNAME_ADMIN',
      passwordKey: 'PHARMACIST_PASSWORD_ADMIN',
    },
  });
}
