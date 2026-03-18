import { expect } from '../../../../globalConfig.api.js';
import { safeGraphQL, bearer } from '../../../../helpers/graphqlUtils.js';
import { loginAsAdminAndGetTokens } from '../../../../helpers/auth.js';
import { getAdminCredentials } from '../../../../helpers/roleCredentials.js';
import { ADMIN_CONFIRM_PAYMENT_QUERY, ADMIN_ASSIGN_RIDER_QUERY } from '../queries/admin.queries.js';

export async function loginAdmin(api, { accountKey = 'default', credentials } = {}) {
  const resolvedCredentials = credentials || getAdminCredentials(accountKey);
  const { accessToken: adminAccessToken, raw: adminLoginRes } = await loginAsAdminAndGetTokens(
    api,
    resolvedCredentials
  );
  expect(adminLoginRes.ok, adminLoginRes.error || 'Admin login failed').toBe(true);
  return { adminAccessToken };
}

export async function confirmPaymentAsAdmin(api, { adminAccessToken, orderId }) {
  const confirmPaymentRes = await safeGraphQL(api, {
    query: ADMIN_CONFIRM_PAYMENT_QUERY,
    variables: { orderId },
    headers: bearer(adminAccessToken),
  });
  expect(confirmPaymentRes.ok, confirmPaymentRes.error || 'Admin confirm payment failed').toBe(true);
  expect(confirmPaymentRes.body?.data?.administrator?.order?.confirmPayment?.id).toBe(orderId);
}

export async function assignRiderToOrderAsAdmin(api, { adminAccessToken, orderId, riderId }) {
  const assignRiderRes = await safeGraphQL(api, {
    query: ADMIN_ASSIGN_RIDER_QUERY,
    variables: {
      orderId,
      assignment: { riderId: Number(riderId) },
    },
    headers: bearer(adminAccessToken),
  });
  expect(assignRiderRes.ok, assignRiderRes.error || 'Admin assign rider failed').toBe(true);
  expect(assignRiderRes.body?.data?.administrator?.order?.assignRider?.id).toBe(orderId);
  return { assignedRiderId: assignRiderRes.body?.data?.administrator?.order?.assignRider?.rider?.id };
}
