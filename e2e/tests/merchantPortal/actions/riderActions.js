import { safeGraphQL, bearer } from '../../../../api/helpers/graphqlUtils.js';
import { extractApiFailureSnippet } from '../../../../api/helpers/apiReporting.js';
import { RIDER_START_PICKUP_ORDER_QUERY } from '../../../../api/tests/e2e/shared/queries/rider.queries.js';
import {
  loginRider,
  startPickupOrderAsRider,
  arrivedAtPharmacyAsRider,
  getPickupProofUploadUrlAsRider,
  setPickupProofAsRider,
  pickupOrderAsRider,
  arrivedAtDropOffAsRider,
  getDeliveryProofUploadUrlAsRider,
  setDeliveryProofAsRider,
  completeOrderAsRider,
  updatePricesAsRider,
  getPaymentQRCodeUploadUrlAsRider,
  savePaymentQRCodeAsRider,
  sendQuoteAsRider,
} from '../../../../api/tests/e2e/shared/steps/rider.steps.js';
import { uploadImageToSignedUrl } from '../../../../api/tests/e2e/shared/steps/patient.steps.js';
import { markFailed } from '../../../helpers/testFailure.js';

function failAction(actionLabel, error) {
  const rawMessage = String(error?.message || error || 'unknown error');
  const snippet = extractApiFailureSnippet({ error: { message: rawMessage }, errors: [] });
  markFailed(`${actionLabel} failed:\n${snippet || rawMessage}`);
}

export async function loginRiderForHybrid(api) {
  try {
    const { riderAccessToken } = await loginRider(api);
    return { riderAccessToken };
  } catch (error) {
    failAction('loginRiderForHybrid', error);
  }
}

export async function getDeliverXStartPickupStatus(api, { riderAccessToken, orderId }) {
  try {
    const startPickupOrderRes = await safeGraphQL(api, {
      query: RIDER_START_PICKUP_ORDER_QUERY,
      variables: { orderId },
      headers: bearer(riderAccessToken),
    });

    const manilaHour = Number(
      new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Manila',
        hour: '2-digit',
        hour12: false,
      }).format(new Date())
    );
    const isBlockedWindow = manilaHour >= 0 && manilaHour < 6;
    const outOfScheduleMsg = 'Order cannot be started since time is outside the schedule for delivery';
    const isOutOfScheduleBlocked =
      isBlockedWindow && !startPickupOrderRes.ok && String(startPickupOrderRes.error || '').includes(outOfScheduleMsg);

    return {
      startPickupOrderRes,
      isBlockedWindow,
      outOfScheduleMsg,
      isOutOfScheduleBlocked,
    };
  } catch (error) {
    failAction('getDeliverXStartPickupStatus', error);
  }
}

export async function riderStartPickupAndArriveAtPharmacy(api, {
  riderAccessToken,
  orderId,
  branchId,
  requireBranchQR = true,
}) {
  try {
    const resolvedRiderAccessToken = riderAccessToken || (await loginRider(api)).riderAccessToken;
    await startPickupOrderAsRider(api, { riderAccessToken: resolvedRiderAccessToken, orderId });
    const { branchQR } = await arrivedAtPharmacyAsRider(api, {
      riderAccessToken: resolvedRiderAccessToken,
      orderId,
      branchId,
      requireBranchQR,
    });

    return {
      riderAccessToken: resolvedRiderAccessToken,
      branchQR,
    };
  } catch (error) {
    failAction('riderStartPickupAndArriveAtPharmacy', error);
  }
}

export async function riderSendQuoteFlow(api, {
  riderAccessToken,
  orderId,
  branchId,
  prices,
  qrImagePath,
}) {
  try {
    await updatePricesAsRider(api, {
      riderAccessToken,
      orderId,
      branchId,
      prices,
    });
    const { riderPaymentQRCodeUploadUrl, riderPaymentQRCodeBlobName } = await getPaymentQRCodeUploadUrlAsRider(api, {
      riderAccessToken,
    });
    await uploadImageToSignedUrl(api, {
      uploadUrl: riderPaymentQRCodeUploadUrl,
      imagePath: qrImagePath,
    });
    const { riderPaymentQRCodeId, riderPaymentQRCodeBranchId } = await savePaymentQRCodeAsRider(api, {
      riderAccessToken,
      photo: riderPaymentQRCodeBlobName,
    });
    await sendQuoteAsRider(api, {
      riderAccessToken,
      orderId,
      branchId,
      paymentQRCodeId: riderPaymentQRCodeId,
    });

    return {
      riderPaymentQRCodeId,
      riderPaymentQRCodeBranchId,
    };
  } catch (error) {
    failAction('riderSendQuoteFlow', error);
  }
}

export async function riderCompleteDeliveryFlow(api, {
  riderAccessToken,
  orderId,
  branchId,
  branchQR,
  pickupProofImagePath,
  deliveryProofImagePath,
  requireBranchQR = true,
  skipStartPickup = false,
}) {
  try {
    let resolvedRiderAccessToken = riderAccessToken;
    let resolvedBranchQR = branchQR;

    if (!resolvedRiderAccessToken) {
      resolvedRiderAccessToken = (await loginRider(api)).riderAccessToken;
    }

    if (!resolvedBranchQR) {
      if (skipStartPickup) {
        const arrivedRes = await arrivedAtPharmacyAsRider(api, {
          riderAccessToken: resolvedRiderAccessToken,
          orderId,
          branchId,
          requireBranchQR,
        });
        resolvedBranchQR = arrivedRes.branchQR;
      } else {
        const startRes = await riderStartPickupAndArriveAtPharmacy(api, {
          riderAccessToken: resolvedRiderAccessToken,
          orderId,
          branchId,
          requireBranchQR,
        });
        resolvedRiderAccessToken = startRes.riderAccessToken;
        resolvedBranchQR = startRes.branchQR;
      }
    } else if (!skipStartPickup) {
      const startRes = await riderStartPickupAndArriveAtPharmacy(api, {
        riderAccessToken: resolvedRiderAccessToken,
        orderId,
        branchId,
        requireBranchQR,
      });
      resolvedRiderAccessToken = startRes.riderAccessToken;
    }

    const { pickupProofUploadUrl, pickupProofBlobName } = await getPickupProofUploadUrlAsRider(api, {
      riderAccessToken: resolvedRiderAccessToken,
    });
    await uploadImageToSignedUrl(api, {
      uploadUrl: pickupProofUploadUrl,
      imagePath: pickupProofImagePath,
    });
    await setPickupProofAsRider(api, {
      riderAccessToken: resolvedRiderAccessToken,
      orderId,
      branchId,
      proof: { photo: pickupProofBlobName },
    });
    await pickupOrderAsRider(api, {
      riderAccessToken: resolvedRiderAccessToken,
      orderId,
      branchId,
      branchQR: resolvedBranchQR,
      requireBranchQR,
    });
    await arrivedAtDropOffAsRider(api, {
      riderAccessToken: resolvedRiderAccessToken,
      orderId,
    });

    const { deliveryProofUploadUrl, deliveryProofBlobName } = await getDeliveryProofUploadUrlAsRider(api, {
      riderAccessToken: resolvedRiderAccessToken,
    });
    await uploadImageToSignedUrl(api, {
      uploadUrl: deliveryProofUploadUrl,
      imagePath: deliveryProofImagePath,
    });
    await setDeliveryProofAsRider(api, {
      riderAccessToken: resolvedRiderAccessToken,
      orderId,
      proof: { photo: deliveryProofBlobName },
    });
    await completeOrderAsRider(api, {
      riderAccessToken: resolvedRiderAccessToken,
      orderId,
    });

    return {
      riderAccessToken: resolvedRiderAccessToken,
      branchQR: resolvedBranchQR,
    };
  } catch (error) {
    failAction('riderCompleteDeliveryFlow', error);
  }
}
