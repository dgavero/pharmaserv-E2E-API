export const PHARMACIST_GET_NOTIFICATIONS_COUNT_QUERY = /* GraphQL */ `
  query {
    pharmacy {
      branch {
        notificationCount
      }
    }
  }
`;

export const PHARMACIST_GET_NOTIFICATIONS_QUERY = /* GraphQL */ `
  query {
    pharmacy {
      branch {
        notifications {
          id
          type
          title
          body
          seen
          createdAt
        }
      }
    }
  }
`;

export const PHARMACIST_GET_ORDER_HISTORY_QUERY = /* GraphQL */ `
  query {
    pharmacy {
      branch {
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
  }
`;

export const PHARMACIST_SEEN_ALL_NOTIFICATIONS_QUERY = /* GraphQL */ `
  mutation {
    pharmacy {
      notification {
        seenAll
      }
    }
  }
`;
