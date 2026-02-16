export const PATIENT_SUBMIT_ORDER_QUERY = /* GraphQL */ `
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

export const PATIENT_ACCEPT_QUOTE_QUERY = /* GraphQL */ `
  mutation ($orderId: ID!) {
    patient {
      order {
        acceptQuote(orderId: $orderId) {
          id
          status
          legs {
            status
          }
        }
      }
    }
  }
`;

export const PATIENT_PAY_ORDER_QUERY = /* GraphQL */ `
  mutation ($orderId: ID!, $proof: ProofRequest!) {
    patient {
      order {
        pay(orderId: $orderId, proof: $proof) {
          id
          status
          legs {
            status
          }
        }
      }
    }
  }
`;

export const PATIENT_RATE_RIDER_QUERY = /* GraphQL */ `
  mutation ($rating: RiderRatingRequest!) {
    patient {
      order {
        rateRider(rating: $rating) {
          rating
        }
      }
    }
  }
`;
