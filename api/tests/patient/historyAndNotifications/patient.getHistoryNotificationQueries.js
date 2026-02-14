// Used for ordering in DeliverX
export const GET_ACTIVE_ORDER_QUERY = /* GraphQL */ `
  query {
    patient {
      activeOrders {
        id
        deliveryType
        fulfillmentMode
        active
        schedule
        rider {
          firstName
          lastName
        }
        prescriptionIds
        discountCardIds
        legs {
          branch {
            name
          }
          status
        }
        status
        createdAt
      }
    }
  }
`;

export const GET_ORDER_HISTORY_QUERY = /* GraphQL */ `
  query {
    patient {
      orderHistory {
        id
        rider {
          firstName
          lastName
        }
        status
        reasonForDeclining
      }
    }
  }
`;

export const GET_NOTIFICATIONS_QUERY = /* GraphQL */ `
  query {
    patient {
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
`;

export const GET_NOTIFICATIONS_COUNT_QUERY = /* GraphQL */ `
  query {
    patient {
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
`;

export const SEEN_ALL_NOTIF_QUERY = /* GraphQL */ `
  mutation {
    patient {
      notification {
        seenAll
      }
    }
  }
`;

export const SEEN_NOTIFICATION_QUERY = /* GraphQL */ `
  mutation ($notificationId: ID!) {
    patient {
      notification {
        seen(notificationId: $notificationId)
      }
    }
  }
`;

export const REMOVE_NOTIFICATION_QUERY = /* GraphQL */ `
  mutation ($notificationId: ID!) {
    patient {
      notification {
        remove(notificationId: $notificationId)
      }
    }
  }
`;
