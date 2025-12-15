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

// Used for Get My Co-Branches
export const PHARMACIST_GET_MY_CO_BRANCHES_QUERY = /* GraphQL */ `
  query {
    pharmacy {
      branches {
        id
        pharmacyName
        name
        status
        lat
        lng
      }
    }
  }
`;

// Used for Update My Branch
export const PHARMACIST_UPDATE_MY_BRANCH_QUERY = /* GraphQL */ `
  mutation ($branch: BranchRequest!) {
    pharmacy {
      branch {
        update(branch: $branch) {
          id
          code
          pharmacyName
          name
          openingTime
          closingTime
          lat
          lng
        }
      }
    }
  }
`;

// Used for Open My Branch
export const PHARMACIST_OPEN_MY_BRANCH_QUERY = /* GraphQL */ `
  mutation {
    pharmacy {
      branch {
        open {
          id
          pharmacyName
          name
          status
          lat
          lng
        }
      }
    }
  }
`;

// Used for Close My Branch
export const PHARMACIST_CLOSE_MY_BRANCH_QUERY = /* GraphQL */ `
  mutation {
    pharmacy {
      branch {
        close {
          id
          pharmacyName
          name
          status
          lat
          lng
        }
      }
    }
  }
`;

// Used for Pause My Branch
export const PHARMACIST_PAUSE_MY_BRANCH_QUERY = /* GraphQL */ `
  mutation ($duration: PauseDuration!) {
    pharmacy {
      branch {
        pause(duration: $duration) {
          id
          pharmacyName
          name
          status
        }
      }
    }
  }
`;
