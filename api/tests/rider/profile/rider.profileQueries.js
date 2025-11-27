// ME
export const ME_RIDER_QUERY = /* GraphQL */ `
  query {
    rider {
      me {
        id
        uuid
        firstName
        lastName
        username
        loginState
        status
      }
    }
  }
`;
