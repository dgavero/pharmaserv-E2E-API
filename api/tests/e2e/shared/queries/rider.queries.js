export const RIDER_START_PICKUP_ORDER_QUERY = /* GraphQL */ `
  mutation ($orderId: ID!) {
    rider {
      order {
        start(orderId: $orderId) {
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

export const RIDER_ARRIVED_AT_PHARMACY_QUERY = /* GraphQL */ `
  mutation ($orderId: ID!, $branchId: ID!) {
    rider {
      order {
        arrivedAtPharmacy(orderId: $orderId, branchId: $branchId) {
          id
          status
          legs {
            branchQR
            status
          }
        }
      }
    }
  }
`;

export const RIDER_SET_PICKUP_PROOF_QUERY = /* GraphQL */ `
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

export const RIDER_PICKUP_ORDER_QUERY = /* GraphQL */ `
  mutation ($orderId: ID!, $branchId: ID!, $branchQR: String!) {
    rider {
      order {
        pickup(orderId: $orderId, branchId: $branchId, branchQR: $branchQR) {
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

export const RIDER_ARRIVED_AT_DROPOFF_QUERY = /* GraphQL */ `
  mutation ($orderId: ID!) {
    rider {
      order {
        arrivedAtDropOff(orderId: $orderId) {
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

export const RIDER_COMPLETE_ORDER_QUERY = /* GraphQL */ `
  mutation ($orderId: ID!) {
    rider {
      order {
        complete(orderId: $orderId) {
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
