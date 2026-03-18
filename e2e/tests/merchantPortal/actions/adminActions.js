import { markFailed } from '../../../helpers/testFailure.js';
import { extractApiFailureSnippet } from '../../../../api/helpers/apiReporting.js';
import { getAdminCredentials } from '../../../../api/helpers/roleCredentials.js';
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

export async function loginAdminForHybrid(api, { accountKey = 'default' } = {}) {
  try {
    const { adminAccessToken } = await loginAdmin(api, {
      accountKey,
      credentials: getAdminCredentials(accountKey),
    });
    return { adminAccessToken };
  } catch (error) {
    failAction('loginAdminForHybrid', error);
  }
}

export async function confirmPaymentAsAdminAction(api, { adminAccessToken, orderId }) {
  try {
    await confirmPaymentAsAdmin(api, { adminAccessToken, orderId });
  } catch (error) {
    failAction('confirmPaymentAsAdminAction', error);
  }
}

export async function assignRiderToOrderAsAdminAction(api, { adminAccessToken, orderId, riderId = process.env.RIDER_USERID }) {
  try {
    const { assignedRiderId } = await assignRiderToOrderAsAdmin(api, {
      adminAccessToken,
      orderId,
      riderId,
    });
    return { assignedRiderId };
  } catch (error) {
    failAction('assignRiderToOrderAsAdminAction', error);
  }
}
