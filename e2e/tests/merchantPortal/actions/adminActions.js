import { markFailed } from '../../../helpers/testFailure.js';
import { extractApiFailureSnippet } from '../../../../api/helpers/apiReporting.js';
import { getAdminCredentials, getRiderAccount } from '../../../../api/helpers/roleCredentials.js';
import {
  loginAdmin,
  confirmPaymentAsAdmin,
  assignRiderToOrderAsAdmin,
} from '../../../../api/tests/e2e/shared/steps/admin.steps.js';

function failAction(actionLabel, error) {
  const rawMessage = String(error?.message || error || 'unknown error');
  const snippet = extractApiFailureSnippet({ error: { message: rawMessage }, errors: [] });
  markFailed(`${actionLabel} failed:\n${snippet || rawMessage}`);
}

const defaultRiderAccount = getRiderAccount('default');

export async function loginAsAdminForHybrid(api, { accountKey = 'default' } = {}) {
  try {
    const { adminAccessToken } = await loginAdmin(api, {
      accountKey,
      credentials: getAdminCredentials(accountKey),
    });
    return { adminAccessToken };
  } catch (error) {
    failAction('loginAsAdminForHybrid', error);
  }
}

export async function confirmPaymentAsAdminForHybrid(api, { adminAccessToken, orderId }) {
  try {
    await confirmPaymentAsAdmin(api, { adminAccessToken, orderId });
  } catch (error) {
    failAction('confirmPaymentAsAdminForHybrid', error);
  }
}

export async function assignRiderToOrderAsAdminForHybrid(
  api,
  { adminAccessToken, orderId, riderId = defaultRiderAccount.riderId }
) {
  try {
    const { assignedRiderId } = await assignRiderToOrderAsAdmin(api, {
      adminAccessToken,
      orderId,
      riderId,
    });
    return { assignedRiderId };
  } catch (error) {
    failAction('assignRiderToOrderAsAdminForHybrid', error);
  }
}
