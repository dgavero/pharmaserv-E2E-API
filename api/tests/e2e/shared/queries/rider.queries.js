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

export const RIDER_GET_PICKUP_PROOF_UPLOAD_URL_QUERY = /* GraphQL */ `
  query ($ext: String!) {
    rider {
      proofOfPickupUploadURL(ext: $ext) {
        blobName
        url
      }
    }
  }
`;

export const RIDER_GET_PAYMENT_QR_CODE_UPLOAD_URL_QUERY = /* GraphQL */ `
  query ($ext: String!) {
    rider {
      paymentQRCodeUploadURL(ext: $ext) {
        blobName
        url
      }
    }
  }
`;

export const RIDER_SAVE_PAYMENT_QR_CODE_QUERY = /* GraphQL */ `
  mutation ($qrCode: RiderPaymentQRCodeRequest!) {
    rider {
      order {
        savePaymentQRCode(qrCode: $qrCode) {
          id
          branchId
          photo
        }
      }
    }
  }
`;

export const RIDER_SEND_PAYMENT_QR_CODE_QUERY = /* GraphQL */ `
  mutation ($orderId: ID!, $branchId: ID!, $paymentQRCodeId: ID) {
    rider {
      order {
        sendPaymentQRCode(orderId: $orderId, branchId: $branchId, paymentQRCodeId: $paymentQRCodeId) {
          id
          paymentQRCodeId
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

export const RIDER_GET_DELIVERY_PROOF_UPLOAD_URL_QUERY = /* GraphQL */ `
  query ($ext: String!) {
    rider {
      proofOfDeliveryUploadURL(ext: $ext) {
        blobName
        url
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

export const RIDER_PICKUP_ORDER_NO_QR_QUERY = /* GraphQL */ `
  mutation ($orderId: ID!, $branchId: ID!) {
    rider {
      order {
        pickup(orderId: $orderId, branchId: $branchId) {
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

export const RIDER_SET_DELIVERY_PROOF_QUERY = /* GraphQL */ `
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
