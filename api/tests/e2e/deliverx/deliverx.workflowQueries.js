export const SUBMIT_DELIVERX_ORDER_QUERY = /* GraphQL */ `
  mutation ($order: OrderRequest!) {
    patient {
      order {
        book(order: $order) {
          id
          code
          trackingCode
          status
        }
      }
    }
  }
`;

export const DECLINE_ORDER_QUERY = /* GraphQL */ `
  mutation ($orderId: ID!, $reason: String) {
    pharmacy {
      order {
        decline(orderId: $orderId, reason: $reason) {
          id
          deliveryType
          legs {
            status
          }
        }
      }
    }
  }
`;
