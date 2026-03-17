import { markFailed } from '../../../helpers/testFailure.js';
import { safeGraphQL, bearer } from '../../../../api/helpers/graphqlUtils.js';
import { extractApiFailureSnippet } from '../../../../api/helpers/apiReporting.js';
import {
  loginAdmin,
  confirmPaymentAsAdmin,
  assignRiderToOrderAsAdmin,
} from '../../../../api/tests/e2e/shared/steps/admin.steps.js';
import { MERCHANT_ME_QUERY, MERCHANT_MY_BRANCH_QUERY } from '../merchantPortal.queries.js';

function failAction(actionLabel, error) {
  const rawMessage = String(error?.message || error || 'unknown error');
  const snippet = extractApiFailureSnippet({ error: { message: rawMessage }, errors: [] });
  markFailed(`${actionLabel} failed:\n${snippet || rawMessage}`);
}

export async function getMerchantIdRegular(api, merchantAccessToken) {
  try {
    const merchantBranchRes = await safeGraphQL(api, {
      query: MERCHANT_MY_BRANCH_QUERY,
      headers: bearer(merchantAccessToken),
    });
    if (!merchantBranchRes.ok) {
      markFailed(`Failed to fetch merchant branch: ${merchantBranchRes.error || 'unknown error'}`);
    }
    const merchantBranchId = Number(merchantBranchRes.body?.data?.pharmacy?.branch?.myBranch?.id);
    if (!merchantBranchId) {
      markFailed('Missing merchant branch id');
    }
    return merchantBranchId;
  } catch (error) {
    failAction('getMerchantIdRegular', error);
  }
}

export async function getMerchantIdPSE(api, merchantAccessToken) {
  try {
    const merchantMeRes = await safeGraphQL(api, {
      query: MERCHANT_ME_QUERY,
      headers: bearer(merchantAccessToken),
    });
    if (!merchantMeRes.ok) {
      markFailed(`Failed to fetch merchant profile: ${merchantMeRes.error || 'unknown error'}`);
    }
    const isPSEMerchant = Boolean(merchantMeRes.body?.data?.pharmacist?.me?.psePharmacist);
    if (!isPSEMerchant) {
      markFailed('Configured PSE merchant account is not marked as psePharmacist');
    }
    const merchantBranchId = Number(process.env.PHARMACIST_BRANCHID_PSE01);
    if (!merchantBranchId) {
      markFailed('Missing PHARMACIST_BRANCHID_PSE01 environment variable');
    }
    return merchantBranchId;
  } catch (error) {
    failAction('getMerchantIdPSE', error);
  }
}

export async function loginAdminForHybrid(api) {
  try {
    const { adminAccessToken } = await loginAdmin(api);
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
