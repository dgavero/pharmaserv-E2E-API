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

export const PATIENT_GET_PRESCRIPTION_UPLOAD_URL_QUERY = /* GraphQL */ `
  query ($ext: String!) {
    patient {
      prescription {
        prescriptionUploadURL(ext: $ext) {
          blobName
          url
        }
      }
    }
  }
`;

export const PATIENT_GET_DISCOUNT_UPLOAD_URL_QUERY = /* GraphQL */ `
  query ($ext: String!) {
    patient {
      discountCardUploadURL(ext: $ext) {
        blobName
        url
      }
    }
  }
`;

export const PATIENT_SAVE_DISCOUNT_CARD_QUERY = /* GraphQL */ `
  mutation ($discountCard: DiscountCardRequest!) {
    patient {
      discountCard {
        create(discountCard: $discountCard) {
          id
          name
          cardType
          cardNumber
          photo
        }
      }
    }
  }
`;

export const PATIENT_GET_ATTACHMENT_UPLOAD_URL_QUERY = /* GraphQL */ `
  query ($ext: String!) {
    patient {
      attachmentUploadURL(ext: $ext) {
        blobName
        url
      }
    }
  }
`;

export const PATIENT_GET_PROOF_OF_PAYMENT_UPLOAD_URL_QUERY = /* GraphQL */ `
  query ($ext: String!) {
    patient {
      proofOfPaymentUploadURL(ext: $ext) {
        blobName
        url
      }
    }
  }
`;

export const PATIENT_GET_PAYMENT_QR_CODE_QUERY = /* GraphQL */ `
  query ($paymentQRCodeId: ID!) {
    patient {
      paymentQRCode(paymentQRCodeId: $paymentQRCodeId) {
        id
        branchId
        photo
      }
    }
  }
`;

export const PATIENT_GET_BLOB_TOKEN_QUERY = /* GraphQL */ `
  query ($blobName: String!) {
    patient {
      blobToken(blobName: $blobName) {
        blobName
        url
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
          paymentQRCodeId
          status
          legs {
            status
            prescriptionItems {
              id
              quantity
            }
          }
        }
      }
    }
  }
`;

export const PATIENT_REQUEST_REQUOTE_QUERY = /* GraphQL */ `
  mutation ($orderId: ID!) {
    patient {
      order {
        requestReQuote(orderId: $orderId) {
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
