import { expect } from '../../../globalConfig.ui.js';
import { Timeouts } from '../../../Timeouts.js';
import { markFailed } from '../../../helpers/testUtilsUI.js';
import { safeGraphQL, bearer } from '../../../../api/helpers/testUtilsAPI.js';
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

export const PatientPayModes = Object.freeze({
  DELIVERY: 'DELIVERY',
  PICKUP: 'PICKUP',
  SCHEDULED: 'SCHEDULED',
  DEFAULT: 'DEFAULT',
});

export async function createHybridOrder(api, { order }) {
  const { patientAccessToken } = await loginPatient(api);
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
}

export async function createHybridOrderForBranch(api, { deliveryType, branchId, omitBranchId = false }) {
  const orderInput = buildHybridOrderInput({
    deliveryType,
    branchId,
  });
  // FindMyMeds branch assignment is done in merchant UI after accept.
  if (omitBranchId) {
    delete orderInput.branchId;
  }
  return createHybridOrder(api, { order: orderInput });
}

export async function acceptQuoteAsPatientWhenReady(api, { patientAccessToken, orderId, timeout = Timeouts.long }) {
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
}

export async function ensurePatientPaymentQRCodeAccessible(api, { patientAccessToken, paymentQRCodeId }) {
  const { paymentQRCodePhoto } = await getPaymentQRCodeAsPatient(api, {
    patientAccessToken,
    paymentQRCodeId,
  });
  await getBlobTokenAsPatient(api, {
    patientAccessToken,
    blobName: paymentQRCodePhoto,
  });
  return { paymentQRCodePhoto };
}

export async function payOrderAsPatientWithProof(api, { patientAccessToken, orderId, proofImagePath, mode, quantities }) {
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
}

export async function rateRiderAsPatientAction(api, { patientAccessToken, riderId }) {
  await rateRiderAsPatient(api, {
    patientAccessToken,
    riderId,
  });
}

export async function requestReQuoteAsPatientAction(
  api,
  { patientAccessToken, orderId, timeout = Timeouts.long }
) {
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
        if (errorMessage.includes('set for re-quoting already')) {
          return 'ok';
        }
        if (errorMessage.includes('cannot be re-quoted yet')) {
          return 'retry';
        }
        return `error:${requestReQuoteRes.error || requestReQuoteRes.errorMessage || 'unknown error'}`;
      },
      { timeout }
    )
    .toBe('ok');
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
