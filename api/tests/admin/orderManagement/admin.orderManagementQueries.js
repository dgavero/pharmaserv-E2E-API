export const GET_ORDER_QUERY = /* GraphQL */ `
  query ($orderId: ID!) {
    administrator {
      order {
        detail(orderId: $orderId) {
          id
          code
          deliveryType
          fulfillmentMode
          active
          schedule
          patient {
            id
            firstName
            lastName
          }
          legs {
            prescriptionItems {
              medicine {
                brand
                genericName
              }
              specialInstructions
            }
            status
          }
          dropOffAddress {
            deliveryInstructions
          }
          status
        }
      }
    }
  }
`;

export const GET_PAGED_ORDERS_QUERY = /* GraphQL */ `
  query ($filter: OrderFilterRequest!) {
    administrator {
      order {
        pagedOrders(filter: $filter) {
          page {
            totalSize
          }
          items {
            id
            status
            patient {
              firstName
              lastName
            }
            status
          }
        }
      }
    }
  }
`;
