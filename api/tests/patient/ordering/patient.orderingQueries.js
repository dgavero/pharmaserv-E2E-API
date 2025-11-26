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

// Used for Pabili Orders
export const SUBMIT_PABILI_ORDER_QUERY = /* GraphQL */ `
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

// Used for ordering in FindMyMeds
export const SUBMIT_FINDMYMEDS_ORDER_QUERY = /* GraphQL */ `
  mutation ($order: OrderRequest!) {
    patient {
      order {
        book(order: $order) {
          id
          patient {
            firstName
            lastName
          }
        }
      }
    }
  }
`;

// Used for Finding Pharmacies
export const FIND_PHAMARCIES_QUERY = /* GraphQL */ `
  query ($query: String!) {
    patient {
      pharmacies(query: $query) {
        id
        name
      }
    }
  }
`;
