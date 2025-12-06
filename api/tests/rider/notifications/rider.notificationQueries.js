// Used for get notifications
export const GET_NOTIFICATIONS_QUERY = /* GraphQL */ `
  query {
    rider {
      notifications {
        id
        type
        title
        body
      }
    }
  }
`;

// Used for Get Order History
export const GET_ORDER_HISTORY_QUERY = /* GraphQL */ `
  query {
    rider {
      orderHistory {
        id
        rider {
          firstName
          lastName
        }
        status
      }
    }
  }
`;
