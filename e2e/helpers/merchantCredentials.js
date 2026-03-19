function requireAccountValue(accountKey, fieldName, rawValue) {
  const value = String(rawValue ?? '').trim();
  if (!value) {
    throw new Error(`Missing ${fieldName} for merchant portal account (${accountKey})`);
  }
  return value;
}

function requireAccountNumber(accountKey, fieldName, rawValue) {
  const value = Number(rawValue);
  if (!value) {
    throw new Error(`Missing ${fieldName} for merchant portal account (${accountKey})`);
  }
  return value;
}

export function getMerchantPortalAccount(accountKey = 'e2e-reg01') {
  const normalizedKey = String(accountKey || 'e2e-reg01')
    .trim()
    .toLowerCase();
  const accountMap = {
    'e2e-reg01': {
      usernameKey: 'MERCHANT_USERNAME',
      passwordKey: 'MERCHANT_PASSWORD',
      assignedBranchIdKey: 'MERCHANT_BRANCHID',
    },
    'e2e-pse01': {
      usernameKey: 'MERCHANT_USERNAME_PSE',
      passwordKey: 'MERCHANT_PASSWORD_PSE',
      assignedBranchIdKey: 'PHARMACIST_BRANCHID_PSE01',
    },
  };

  const accountConfig = accountMap[normalizedKey];
  if (!accountConfig) {
    throw new Error(`Unknown merchant portal account key: ${accountKey}`);
  }

  return {
    accountKey: normalizedKey,
    username: requireAccountValue(normalizedKey, accountConfig.usernameKey, process.env[accountConfig.usernameKey]),
    password: requireAccountValue(normalizedKey, accountConfig.passwordKey, process.env[accountConfig.passwordKey]),
    assignedBranchId: requireAccountNumber(
      normalizedKey,
      accountConfig.assignedBranchIdKey,
      process.env[accountConfig.assignedBranchIdKey]
    ),
  };
}
