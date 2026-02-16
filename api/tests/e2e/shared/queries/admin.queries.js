export const ADMIN_CONFIRM_PAYMENT_QUERY = /* GraphQL */ `
  mutation ($orderId: ID!) {
    administrator {
      order {
        confirmPayment(orderId: $orderId) {
          id
          status
        }
      }
    }
  }
`;

export const ADMIN_ASSIGN_RIDER_QUERY = /* GraphQL */ `
  mutation ($orderId: ID!, $assignment: RiderAssignmentRequest!) {
    administrator {
      order {
        assignRider(orderId: $orderId, assignment: $assignment) {
          id
          status
          rider {
            id
            firstName
            lastName
          }
        }
      }
    }
  }
`;
