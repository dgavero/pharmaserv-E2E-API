function requireCredentialValue(roleLabel, accountKey, fieldName, rawValue) {
  const value = String(rawValue ?? '').trim();
  if (!value) {
    throw new Error(`Missing ${fieldName} for ${roleLabel} credentials (${accountKey})`);
  }
  return value;
}

function resolveAccount(roleLabel, accountKey, accountMap) {
  const normalizedKey = String(accountKey || 'default').trim().toLowerCase();
  const accountConfig = accountMap[normalizedKey];
  if (!accountConfig) {
    throw new Error(`Unknown ${roleLabel} credential key: ${accountKey}`);
  }

  const resolvedAccount = {
    username: requireCredentialValue(roleLabel, normalizedKey, accountConfig.usernameKey, process.env[accountConfig.usernameKey]),
    password: requireCredentialValue(roleLabel, normalizedKey, accountConfig.passwordKey, process.env[accountConfig.passwordKey]),
  };

  if (accountConfig.patientIdKey) {
    resolvedAccount.patientId = requireCredentialValue(
      roleLabel,
      normalizedKey,
      accountConfig.patientIdKey,
      process.env[accountConfig.patientIdKey]
    );
  }

  if (accountConfig.riderIdKey) {
    resolvedAccount.riderId = requireCredentialValue(
      roleLabel,
      normalizedKey,
      accountConfig.riderIdKey,
      process.env[accountConfig.riderIdKey]
    );
  }

  if (accountConfig.branchIdKey) {
    resolvedAccount.branchId = requireCredentialValue(
      roleLabel,
      normalizedKey,
      accountConfig.branchIdKey,
      process.env[accountConfig.branchIdKey]
    );
  }

  return resolvedAccount;
}

export function getPatientAccount(accountKey = 'default') {
  return resolveAccount('patient', accountKey, {
    default: {
      usernameKey: 'PATIENT_USER_USERNAME',
      passwordKey: 'PATIENT_USER_PASSWORD',
      patientIdKey: 'PATIENT_USER_USERNAME_ID',
    },
  });
}

export function getAdminAccount(accountKey = 'default') {
  return resolveAccount('admin', accountKey, {
    default: {
      usernameKey: 'ADMIN_USERNAME',
      passwordKey: 'ADMIN_PASSWORD',
    },
  });
}

export function getRiderAccount(accountKey = 'default') {
  return resolveAccount('rider', accountKey, {
    default: {
      usernameKey: 'RIDER_USERNAME',
      passwordKey: 'RIDER_PASSWORD',
      riderIdKey: 'RIDER_USERID',
    },
    e2e: {
      usernameKey: 'RIDER_USERNAME_E2E',
      passwordKey: 'RIDER_PASSWORD_E2E',
    },
  });
}

export function getPharmacistAccount(accountKey = 'reg01') {
  return resolveAccount('pharmacist', accountKey, {
    reg01: {
      usernameKey: 'PHARMACIST_USERNAME_REG01',
      passwordKey: 'PHARMACIST_PASSWORD_REG01',
      branchIdKey: 'PHARMACIST_BRANCHID_REG01',
    },
    reg02: {
      usernameKey: 'PHARMACIST_USERNAME_REG02',
      passwordKey: 'PHARMACIST_PASSWORD_REG02',
      branchIdKey: 'PHARMACIST_BRANCHID_REG02',
    },
    pse01: {
      usernameKey: 'PHARMACIST_USERNAME_PSE01',
      passwordKey: 'PHARMACIST_PASSWORD_PSE01',
      branchIdKey: 'PHARMACIST_BRANCHID_PSE01',
    },
    admin: {
      usernameKey: 'PHARMACIST_USERNAME_ADMIN',
      passwordKey: 'PHARMACIST_PASSWORD_ADMIN',
    },
  });
}

export function getPatientCredentials(accountKey = 'default') {
  return getPatientAccount(accountKey);
}

export function getAdminCredentials(accountKey = 'default') {
  return getAdminAccount(accountKey);
}

export function getRiderCredentials(accountKey = 'default') {
  return getRiderAccount(accountKey);
}

export function getPharmacistCredentials(accountKey = 'reg01') {
  return getPharmacistAccount(accountKey);
}
