// Used for decline orders
export const DECLINE_ORDER_QUERY = /* GraphQL */ `
  mutation ($orderId: ID!, $reason: String) {
    pharmacy {
      order {
        decline(orderId: $orderId, reason: $reason) {
          id
          deliveryType
          patient {
            firstName
            lastName
          }
          rider {
            firstName
            lastName
          }
          legs {
            prescriptionItems {
              medicine {
                brand
                genericName
              }
            }
            status
          }
        }
      }
    }
  }
`;
