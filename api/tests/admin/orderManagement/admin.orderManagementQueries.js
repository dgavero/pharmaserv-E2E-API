export const GET_ORDER_QUERY = /* GraphQL */ `
  query ($orderId: ID!) {
    administrator {
      order {
        detail(orderId: $orderId) {
          id
          code
          trackingCode
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

export const SET_BRANCH_STATUS_MUTATION = /* GraphQL */ `
  mutation ($orderId: ID!, $branchId: ID!, $status: LegStatus!) {
    administrator {
      order {
        setBranchStatus(orderId: $orderId, branchId: $branchId, status: $status) {
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
            branch {
              name
            }
            status
          }
          status
        }
      }
    }
  }
`;

export const SEARCHED_RIDERS_QUERY = /* GraphQL */ `
  query ($query: String!) {
    administrator {
      rider {
        searchedRiders(query: $query) {
          id
          uuid
          username
          email
          firstName
          lastName
          status
        }
      }
    }
  }
`;

export const FIND_RIDERS_QUERY = /* GraphQL */ `
  query ($query: String!) {
    administrator {
      rider {
        searchedRiders(query: $query) {
          id
          firstName
          lastName
          status
        }
      }
    }
  }
`;

export const FIND_ORDERS_QUERY = /* GraphQL */ `
  query ($query: String!) {
    administrator {
      order {
        searchedOrders(query: $query) {
          id
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

export const GET_ORDER_STATUS_HISTORY_QUERY = /* GraphQL */ `
  query ($orderId: ID!) {
    administrator {
      order {
        statusHistory(orderId: $orderId) {
          status
          userType
          name
          updatedAt
        }
      }
    }
  }
`;

export const GET_RIDER_DETAIL_FOR_SEARCH_QUERY = /* GraphQL */ `
  query ($by: IdentifierRequest!) {
    administrator {
      rider {
        detail(by: $by) {
          id
          username
          firstName
          lastName
          status
        }
      }
    }
  }
`;
