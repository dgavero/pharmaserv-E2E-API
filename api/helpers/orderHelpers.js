import { safeGraphQL, bearer, pharmacistLoginAndGetTokens } from './testUtilsAPI.js';
import { expect } from '../globalConfig.api.js';
import { DECLINE_ORDER_QUERY } from '../tests/pharmacy/orderManagement/pharmacist.orderManagementQueries.js';

//reusable method for declining orders
const DEFAULT_DECLINE_REASON = 'Order declined via API cleanup';

export async function declineOrderAsPharmacist(api, orderId) {
  console.log('Attempting to delete orderId: ' + orderId);
  // Login as pharmacist
  const { accessToken, raw: loginRes } = await pharmacistLoginAndGetTokens(api, {
    username: process.env.PHARMACIST_USERNAME,
    password: process.env.PHARMACIST_PASSWORD,
  });
  expect(loginRes.ok, loginRes.error || 'Pharmacist login failed').toBe(true);

  // Decline Order
  const declineOrderRes = await safeGraphQL(api, {
    query: DECLINE_ORDER_QUERY,
    variables: {
      orderId: orderId,
      reason: DEFAULT_DECLINE_REASON,
    },
    headers: bearer(accessToken),
  });

  expect(declineOrderRes.ok, declineOrderRes.error || 'Failed to decline order: ' + orderId).toBe(
    true
  );
}
