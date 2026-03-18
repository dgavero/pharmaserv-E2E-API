import { expect } from '../../../globalConfig.ui.js';
import { Timeouts } from '../../../Timeouts.js';
import { markFailed } from '../../../helpers/testFailure.js';
import { safeGraphQL, bearer } from '../../../../api/helpers/graphqlUtils.js';
import { extractApiFailureSnippet } from '../../../../api/helpers/apiReporting.js';
import { getPatientCredentials } from '../../../../api/helpers/roleCredentials.js';
import {
  PATIENT_ACCEPT_QUOTE_QUERY,
  PATIENT_REQUEST_REQUOTE_QUERY,
} from '../../../../api/tests/e2e/shared/queries/patient.queries.js';
import {
  loginPatient,
  submitOrderAsPatient,
  getPaymentQRCodeAsPatient,
  getBlobTokenAsPatient,
  getProofOfPaymentUploadUrlAsPatient,
  payOrderAsPatient,
  payOrderAsPatientForPickupOrder,
  payOrderAsPatientForScheduledDelivery,
  rateRiderAsPatient,
  uploadImageToSignedUrl,
} from '../../../../api/tests/e2e/shared/steps/patient.steps.js';
import { buildHybridOrderInput } from '../generic.orderData.js';

function failAction(actionLabel, error) {
  const rawMessage = String(error?.message || error || 'unknown error');
  const snippet = extractApiFailureSnippet({ error: { message: rawMessage }, errors: [] });
  markFailed(`${actionLabel} failed:\n${snippet || rawMessage}`);
}

export const PatientPayModes = Object.freeze({
  DELIVERY: 'DELIVERY',
  PICKUP: 'PICKUP',
  SCHEDULED: 'SCHEDULED',
  DEFAULT: 'DEFAULT',
});

export async function createHybridOrder(
  api,
  { order, maxAttempts = 3, retryDelayMs = Timeouts.short, patientAccountKey = 'default' } = {}
) {
  let lastError = null;
  const totalAttempts = Number.isFinite(Number(maxAttempts)) ? Math.max(1, Number(maxAttempts)) : 1;
  const retryDelay = Number.isFinite(Number(retryDelayMs)) ? Math.max(0, Number(retryDelayMs)) : 0;

  for (let attempt = 1; attempt <= totalAttempts; attempt += 1) {
    try {
      const { patientAccessToken } = await loginPatient(api, {
        accountKey: patientAccountKey,
        credentials: getPatientCredentials(patientAccountKey),
      });
      const { orderId, submitOrderNode } = await submitOrderAsPatient(api, {
        patientAccessToken,
        order,
      });

      const bookingRef = submitOrderNode?.trackingCode;
      if (!bookingRef) {
        markFailed('Missing trackingCode from submit order response');
      }

      return {
        patientAccessToken,
        orderId,
        bookingRef,
      };
    } catch (error) {
      lastError = error;
      if (attempt >= totalAttempts) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }

  failAction('createHybridOrder', lastError);
}

export async function createHybridOrderForBranch(api, { deliveryType, branchId, omitBranchId = false }) {
  try {
    if (!omitBranchId && !Number(branchId)) {
      markFailed(`Missing branchId for hybrid ${deliveryType} order creation`);
    }
    const orderInput = buildHybridOrderInput({
      deliveryType,
      branchId: Number(branchId),
      allowMissingBranchId: omitBranchId,
    });
    return createHybridOrder(api, { order: orderInput });
  } catch (error) {
    failAction('createHybridOrderForBranch', error);
  }
}

export async function acceptQuoteAsPatientWhenReady(api, { patientAccessToken, orderId, timeout = Timeouts.long }) {
  try {
    let acceptQuoteNode = null;
    await expect
      .poll(
        async () => {
          const acceptQuoteRes = await safeGraphQL(api, {
            query: PATIENT_ACCEPT_QUOTE_QUERY,
            variables: { orderId },
            headers: bearer(patientAccessToken),
          });
          if (!acceptQuoteRes.ok) {
            return 'not-ready';
          }
          acceptQuoteNode = acceptQuoteRes.body?.data?.patient?.order?.acceptQuote || null;
          return acceptQuoteNode?.id === orderId ? 'ok' : 'not-ready';
        },
        { timeout }
      )
      .toBe('ok');

    return { acceptQuoteNode };
  } catch (error) {
    failAction('acceptQuoteAsPatientWhenReady', error);
  }
  console.log('Finished waiting for acceptQuoteAsPatientWhenReady');
}

export async function ensurePatientPaymentQRCodeAccessible(api, { patientAccessToken, paymentQRCodeId }) {
  try {
    const { paymentQRCodeNode, paymentQRCodePhoto } = await getPaymentQRCodeAsPatient(api, {
      patientAccessToken,
      paymentQRCodeId,
    });
    await getBlobTokenAsPatient(api, {
      patientAccessToken,
      blobName: paymentQRCodePhoto,
    });
    return {
      paymentQRCodePhoto,
      paymentQRCodeBranchId: Number(paymentQRCodeNode?.branchId),
    };
  } catch (error) {
    failAction('ensurePatientPaymentQRCodeAccessible', error);
  }
}

export async function payOrderAsPatientWithProof(
  api,
  { patientAccessToken, orderId, proofImagePath, mode, quantities }
) {
  try {
    const normalizedMode = String(mode || PatientPayModes.DEFAULT).toUpperCase();
    const hasQuantities = Array.isArray(quantities) && quantities.length > 0;
    const { proofOfPaymentUploadUrl, proofOfPaymentBlobName } = await getProofOfPaymentUploadUrlAsPatient(api, {
      patientAccessToken,
    });
    await uploadImageToSignedUrl(api, {
      uploadUrl: proofOfPaymentUploadUrl,
      imagePath: proofImagePath,
    });

    if (normalizedMode === PatientPayModes.PICKUP) {
      if (hasQuantities) {
        await payOrderAsPatient(api, {
          patientAccessToken,
          orderId,
          proof: {
            fulfillmentMode: 'PICKUP',
            photo: proofOfPaymentBlobName,
            quantities,
          },
        });
        return;
      }
      await payOrderAsPatientForPickupOrder(api, {
        patientAccessToken,
        orderId,
        proofPhoto: proofOfPaymentBlobName,
      });
      return;
    }

    if (normalizedMode === PatientPayModes.SCHEDULED) {
      if (hasQuantities) {
        await payOrderAsPatient(api, {
          patientAccessToken,
          orderId,
          proof: {
            fulfillmentMode: 'SCHEDULED',
            photo: proofOfPaymentBlobName,
            quantities,
          },
        });
        return;
      }
      await payOrderAsPatientForScheduledDelivery(api, {
        patientAccessToken,
        orderId,
        proofPhoto: proofOfPaymentBlobName,
      });
      return;
    }

    if (normalizedMode === PatientPayModes.DELIVERY) {
      await payOrderAsPatient(api, {
        patientAccessToken,
        orderId,
        proof: {
          fulfillmentMode: 'DELIVERY',
          photo: proofOfPaymentBlobName,
          ...(hasQuantities ? { quantities } : {}),
        },
      });
      return;
    }

    if (normalizedMode === PatientPayModes.DEFAULT) {
      await payOrderAsPatient(api, {
        patientAccessToken,
        orderId,
        proof: {
          photo: proofOfPaymentBlobName,
          ...(hasQuantities ? { quantities } : {}),
        },
      });
      return;
    }

    markFailed(`Unsupported patient pay mode: ${mode}`);
  } catch (error) {
    failAction('payOrderAsPatientWithProof', error);
  }
  console.log('Finished payOrderAsPatientWithProof');
}

export async function rateRiderAsPatientForHybrid(api, { patientAccessToken, riderId }) {
  try {
    await rateRiderAsPatient(api, {
      patientAccessToken,
      riderId,
    });
  } catch (error) {
    failAction('rateRiderAsPatientForHybrid', error);
  }
}

export async function requestReQuoteAsPatientForHybrid(
  api,
  { patientAccessToken, orderId, timeout = Timeouts.extraLong }
) {
  try {
    await expect
      .poll(
        async () => {
          const requestReQuoteRes = await safeGraphQL(api, {
            query: PATIENT_REQUEST_REQUOTE_QUERY,
            variables: { orderId },
            headers: bearer(patientAccessToken),
          });
          if (requestReQuoteRes.ok) {
            const requestReQuoteNode = requestReQuoteRes.body?.data?.patient?.order?.requestReQuote;
            if (requestReQuoteNode?.id === orderId) {
              return 'ok';
            }
          }

          const errorMessage = String(
            requestReQuoteRes.errorMessage ||
              requestReQuoteRes.error ||
              requestReQuoteRes.body?.errors?.[0]?.message ||
              ''
          ).toLowerCase();
          if (
            errorMessage.includes('set for re-quoting already') ||
            errorMessage.includes('already set for re-quoting') ||
            errorMessage.includes('already requested for re-quote')
          ) {
            return 'ok';
          }
          if (
            errorMessage.includes('cannot be re-quoted yet') ||
            errorMessage.includes('cannot be re quoted yet') ||
            errorMessage.includes('order cannot be re-quoted yet') ||
            errorMessage.includes('please wait')
          ) {
            return 'retry';
          }
          return `error:${requestReQuoteRes.error || requestReQuoteRes.errorMessage || 'unknown error'}`;
        },
        { timeout }
      )
      .toBe('ok');
  } catch (error) {
    failAction('requestReQuoteAsPatientForHybrid', error);
  }
}

export function buildReducedQuantitiesFromAcceptQuote(acceptQuoteNode, reducedQuantity = 1) {
  const prescriptionItems = acceptQuoteNode?.legs?.[0]?.prescriptionItems || [];
  if (!Array.isArray(prescriptionItems) || prescriptionItems.length === 0) {
    markFailed('Missing prescription items from patient accept quote for quantity reduction');
  }

  return prescriptionItems.map((item) => ({
    prescriptionItemId: Number(item?.id),
    quantity: Number(reducedQuantity),
  }));
}
