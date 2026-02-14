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

export const GET_PHARMACY_ORDERS_QUERY = /* GraphQL */ `
  query ($type: DeliveryType!) {
    pharmacy {
      branch {
        orders(type: $type) {
          id
          deliveryType
          patient {
            firstName
            lastName
          }
          discountCardIds
          prescriptionIds
          rider {
            firstName
            lastName
          }
          legs {
            branch {
              id
              code
              pharmacyName
              name
            }
            prescriptionItems {
              medicine {
                id
                brand
                genericName
              }
            }
            status
          }
          status
        }
      }
    }
  }
`;

export const GET_ORDER_BY_ID_QUERY = /* GraphQL */ `
  query ($orderId: ID!) {
    pharmacy {
      branch {
        order(orderId: $orderId) {
          patient {
            id
            firstName
            lastName
          }
          legs {
            branch {
              id
              name
            }
            prescriptionItems {
              medicine {
                id
                brand
              }
            }
            status
          }
          status
        }
      }
    }
  }
`;

export const GET_PRESCRIPTION_BY_ID_QUERY = /* GraphQL */ `
  query ($prescriptionId: ID!) {
    pharmacy {
      prescription {
        detail(prescriptionId: $prescriptionId) {
          id
          photo
          prescriptionItems {
            medicine {
              brand
              genericName
            }
          }
        }
      }
    }
  }
`;

export const ACCEPT_ORDER_QUERY = /* GraphQL */ `
  mutation ($orderId: ID!) {
    pharmacy {
      order {
        accept(orderId: $orderId) {
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

export const FIND_MEDICINES_QUERY = /* GraphQL */ `
  query ($query: String!) {
    pharmacy {
      medicines(query: $query) {
        id
        brand
        strength
        genericName
        manufacturer
      }
    }
  }
`;

export const GET_DISCOUNT_CARD_BY_ID_QUERY = /* GraphQL */ `
  query ($discountCardId: ID!) {
    pharmacy {
      discountCard(discountCardId: $discountCardId) {
        id
        cardType
        name
        cardNumber
      }
    }
  }
`;

export const FIND_NEAREST_BRANCHES_QUERY = /* GraphQL */ `
  query ($finder: FindBranchRequest!) {
    pharmacy {
      branch {
        nearestBranches(finder: $finder) {
          id
          pharmacyName
          name
          address
          city
          province
          zipCode
          onboarded
          openingTime
          closingTime
          status
          distance
        }
      }
    }
  }
`;
