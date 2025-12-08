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

// Used for Get My Branch
export const PHARMACIST_GET_MY_BRANCH_QUERY = /* GraphQL */ `
  query {
    pharmacy {
      branch {
        myBranch {
          id
          code
          regionCode
          pharmacyName
          name
          status
          contactName
          openingTime
          closingTime
          weekEndOpeningTime
          weekEndClosingTime
          lat
          lng
        }
      }
    }
  }
`;

// Used for Get My Pharmacy
export const PHARMACIST_GET_MY_PHARMACY_QUERY = /* GraphQL */ `
  query {
    pharmacy {
      myPharmacy {
        id
        name
      }
    }
  }
`;
