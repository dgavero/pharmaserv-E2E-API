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
