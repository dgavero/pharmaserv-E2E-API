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
