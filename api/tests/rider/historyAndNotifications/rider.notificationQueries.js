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

export const GET_NOTIFICATIONS_COUNT_QUERY = /* GraphQL */ `
  query {
    rider {
      notificationCount
    }
  }
`;

export const SEEN_NOTIFICATION_QUERY = /* GraphQL */ `
  mutation ($notificationId: ID!) {
    rider {
      notification {
        seen(notificationId: $notificationId)
      }
    }
  }
`;

export const SEEN_ALL_NOTIFICATIONS_QUERY = /* GraphQL */ `
  mutation {
    rider {
      notification {
        seenAll
      }
    }
  }
`;

export const REMOVE_NOTIFICATION_QUERY = /* GraphQL */ `
  mutation ($notificationId: ID!) {
    rider {
      notification {
        remove(notificationId: $notificationId)
      }
    }
  }
`;
