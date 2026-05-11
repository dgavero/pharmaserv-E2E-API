export const MEDEX_LOGIN_PATH = '/api/users/login';

export function buildMedexOrderStatusPath(trackingCode) {
  return `/api/orders/${encodeURIComponent(String(trackingCode))}`;
}

export const MEDEX_CONFIRM_ORDER_PAYLOAD = Object.freeze({
  CODE: 'CNF',
});

export const MEDEX_SET_FOR_PICKUP_PAYLOAD = Object.freeze({
  CODE: 'OOP',
});

export const MEDEX_CANCEL_ORDER_PAYLOAD = Object.freeze({
  CODE: 'OCN',
  REMARKS: 'This order is cancelled via Automated Testing.',
});

export const GET_MEDEX_ORDER_SUMMARY_QUERY = /* GraphQL */ `
  query ($orderId: ID!) {
    patient {
      order(orderId: $orderId) {
        status
        summary {
          subtotal
          vatableSale
          lessAdditionalDiscount
          vat
          vatExemptSale
          lessPercentVat
          lessPercentSCPWD
          handlingFee
          amountDue
        }
      }
    }
  }
`;

export const CANCEL_MEDEX_ORDER_AS_PATIENT_QUERY = /* GraphQL */ `
  mutation ($orderId: ID!) {
    patient {
      order {
        cancel(orderId: $orderId)
      }
    }
  }
`;
