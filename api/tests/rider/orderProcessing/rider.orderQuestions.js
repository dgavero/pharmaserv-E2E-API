// Used for Get Order
export const GET_ORDER_QUERY = /* GraphQL */ `
  query {
    rider {
      currentOrder {
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
          id
          branch {
            id
          }
          branchQR
          status
        }
        status
      }
    }
  }
`;

// Used for Get Order by ID
export const GET_CURRENT_ORDER_QUERY = /* GraphQL */ `
  query {
    rider {
      currentOrder {
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
          id
          branch {
            id
          }
          branchQR
          status
        }
        status
      }
    }
  }
`;

// Used for Start Pickup Order
export const START_PICKUP_ORDER_QUERY = /* GraphQL */ `
  mutation ($orderId: ID!) {
    rider {
      order {
        start(orderId: $orderId) {
          id
          deliveryType
          patient {
            firstName
            lastName
          }
          legs {
            status
          }
          status
        }
      }
    }
  }
`;

// Used for Arrive at Pharmacy
export const ARRIVE_AT_PHARMACY_QUERY = /* GraphQL */ `
  mutation ($orderId: ID!, $branchId: ID!) {
    rider {
      order {
        arrivedAtPharmacy(orderId: $orderId, branchId: $branchId) {
          id
          deliveryType
          patient {
            firstName
            lastName
          }
          legs {
            status
          }
          status
        }
      }
    }
  }
`;

// Used for Update Prices
export const UPDATE_PRICES_QUERY = /* GraphQL */ `
  mutation ($orderId: ID!, $branchId: ID!, $prices: [MedicinePriceRequest!]) {
    rider {
      order {
        updatePrices(orderId: $orderId, branchId: $branchId, prices: $prices) {
          medicine {
            brand
            genericName
          }
          quantity
          unitPrice
        }
      }
    }
  }
`;

// Used for Set Pickup Proof
export const SET_PICKUP_PROOF_QUERY = /* GraphQL */ `
  mutation ($orderId: ID!, $branchId: ID!, $proof: ProofRequest!) {
    rider {
      order {
        setPickupProof(orderId: $orderId, branchId: $branchId, proof: $proof) {
          photo
        }
      }
    }
  }
`;

// Used for Pickup Order
export const PICKUP_ORDER_QUERY = /* GraphQL */ `
  mutation ($orderId: ID!, $branchId: ID!, $branchQR: String!) {
    rider {
      order {
        pickup(orderId: $orderId, branchId: $branchId, branchQR: $branchQR) {
          id
          deliveryType
          patient {
            firstName
            lastName
          }
          legs {
            status
          }
          status
        }
      }
    }
  }
`;

// Used for Arrive at Drop-off
export const ARRIVE_AT_DROPOFF_QUERY = /* GraphQL */ `
  mutation ($orderId: ID!) {
    rider {
      order {
        arrivedAtDropOff(orderId: $orderId) {
          id
          deliveryType
          status
          patient {
            firstName
            lastName
          }
          legs {
            status
          }
          status
        }
      }
    }
  }
`;

// Used for Set Delivery Proof
export const SET_DELIVERY_PROOF_QUERY = /* GraphQL */ `
  mutation ($orderId: ID!, $proof: ProofRequest!) {
    rider {
      order {
        setDeliveryProof(orderId: $orderId, proof: $proof) {
          photo
        }
      }
    }
  }
`;

// Used for Complete Delivery
export const COMPLETE_ORDER_QUERY = /* GraphQL */ `
  mutation ($orderId: ID!) {
    rider {
      order {
        complete(orderId: $orderId) {
          id
          deliveryType
          patient {
            firstName
            lastName
          }
          legs {
            status
          }
          status
        }
      }
    }
  }
`;
