// Used for me
export const PHARMACIST_ME_QUERY = /* GraphQL */ `
  query {
    pharmacist {
      me {
        id
        uuid
        admin
        psePharmacist
        firstName
        lastName
        username
        loginState
      }
    }
  }
`;
