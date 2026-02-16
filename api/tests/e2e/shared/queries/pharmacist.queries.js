export const PHARMACY_ACCEPT_ORDER_QUERY = /* GraphQL */ `
  mutation ($orderId: ID!) {
    pharmacy {
      order {
        accept(orderId: $orderId) {
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

export const PHARMACY_UPDATE_PRICES_QUERY = /* GraphQL */ `
  mutation ($orderId: ID!, $prices: [MedicinePriceRequest!]) {
    pharmacy {
      order {
        updatePrices(orderId: $orderId, prices: $prices) {
          medicine {
            id
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

export const PHARMACY_ADD_PRESCRIPTION_ITEM_QUERY = /* GraphQL */ `
  mutation ($orderId: ID!, $prescriptionItem: OrderPrescriptionItemRequest!) {
    pharmacy {
      order {
        addPrescriptionItem(orderId: $orderId, prescriptionItem: $prescriptionItem) {
          id
          medicine {
            id
            brand
            genericName
          }
          quantity
          unitPrice
          vatExempt
          discounted
        }
      }
    }
  }
`;

export const PHARMACY_UPDATE_PRESCRIPTION_ITEM_QUERY = /* GraphQL */ `
  mutation ($orderId: ID!, $prescriptionItemId: ID!, $prescriptionItem: OrderPrescriptionItemRequest!) {
    pharmacy {
      order {
        updatePrescriptionItem(
          orderId: $orderId
          prescriptionItemId: $prescriptionItemId
          prescriptionItem: $prescriptionItem
        ) {
          id
          medicine {
            id
            brand
            genericName
          }
          quantity
          unitPrice
          vatExempt
          discounted
          outOfStock
        }
      }
    }
  }
`;

export const PHARMACY_SEND_QUOTE_QUERY = /* GraphQL */ `
  mutation ($orderId: ID!) {
    pharmacy {
      order {
        sendQuote(orderId: $orderId) {
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

export const PHARMACY_PREPARE_ORDER_QUERY = /* GraphQL */ `
  mutation ($orderId: ID!) {
    pharmacy {
      order {
        prepare(orderId: $orderId) {
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

export const PHARMACY_SET_FOR_PICKUP_QUERY = /* GraphQL */ `
  mutation ($orderId: ID!) {
    pharmacy {
      order {
        setForPickup(orderId: $orderId) {
          id
          status
          legs {
            patientQR
            status
          }
        }
      }
    }
  }
`;

export const PHARMACY_CONFIRM_PICKUP_QUERY = /* GraphQL */ `
  mutation ($orderId: ID!, $qrCode: String!) {
    pharmacy {
      order {
        confirmPickup(orderId: $orderId, qrCode: $qrCode) {
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

export const PHARMACY_DECLINE_ORDER_QUERY = /* GraphQL */ `
  mutation ($orderId: ID!, $reason: String) {
    pharmacy {
      order {
        decline(orderId: $orderId, reason: $reason) {
          id
          deliveryType
          legs {
            status
          }
        }
      }
    }
  }
`;
