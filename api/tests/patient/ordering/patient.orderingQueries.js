// Used for ordering in DeliverX
export const SUBMIT_DELIVERX_ORDER_QUERY = /* GraphQL */ `
  mutation ($order: OrderRequest!) {
    patient {
      order {
        book(order: $order) {
          id
          code
          trackingCode
          patient {
            firstName
            lastName
          }
          status
        }
      }
    }
  }
`;
