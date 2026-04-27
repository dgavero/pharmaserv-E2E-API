function resolveEnv() {
  return String(process.env.TEST_ENV || 'DEV').toUpperCase();
}

export function getPharmacyManagementTestData() {
  const env = resolveEnv();

  const pharmacyDetailByEnv = {
    DEV: { id: '1', name: 'Mercury Drug' },
    QA: { id: '59', name: 'Pharmacy API-QA' },
    PROD: { id: '3', name: 'Watsons' },
  };

  const createBranchPharmacyIdByEnv = {
    DEV: '4',
    QA: '64',
    PROD: '10',
  };

  const pagedBranchesPharmacyIdByEnv = {
    DEV: 36,
    QA: 59,
    PROD: 70,
  };

  return {
    pharmacyDetail: pharmacyDetailByEnv[env] ?? pharmacyDetailByEnv.DEV,
    createBranchPharmacyId: createBranchPharmacyIdByEnv[env] ?? createBranchPharmacyIdByEnv.DEV,
    pagedBranchesPharmacyId: pagedBranchesPharmacyIdByEnv[env] ?? pagedBranchesPharmacyIdByEnv.DEV,
  };
}
