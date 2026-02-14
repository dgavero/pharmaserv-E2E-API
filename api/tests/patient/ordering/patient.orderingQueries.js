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

// Used for Getting Order Details
export const GET_ORDER_QUERY = /* GraphQL */ `
  query ($orderId: ID!) {
    patient {
      order(orderId: $orderId) {
        patient {
          id
          firstName
          lastName
        }
        legs {
          branchQR
          riderQR
          prescriptionItems {
            medicine {
              id
              brand
              genericName
            }
            unitPrice
            quantity
          }
          status
        }
        paymentProof {
          photo
        }
        dropOffAddress {
          addressName
          address
          lat
          lng
        }
        status
      }
    }
  }
`;

export const SUBMIT_ORDER_QUERY = /* GraphQL */ `
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

export const FIND_NEAREST_BRANCHES_QUERY = /* GraphQL */ `
  query ($finder: FindBranchRequest!) {
    patient {
      nearestBranches(finder: $finder) {
        id
        pharmacyName
        name
        address
        city
        province
        zipCode
        onboarded
        medExCode
        openingTime
        closingTime
        status
        distance
      }
    }
  }
`;

export const FIND_MEDICINES_QUERY = /* GraphQL */ `
  query ($query: String!) {
    medicines(query: $query) {
      id
      brand
      strength
      genericName
      manufacturer
    }
  }
`;
