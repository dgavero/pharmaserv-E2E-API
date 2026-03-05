export const MERCHANT_MY_BRANCH_QUERY = `
  query {
    pharmacy {
      branch {
        myBranch {
          id
        }
      }
    }
  }
`;

export const MERCHANT_ME_QUERY = `
  query {
    pharmacist {
      me {
        id
        psePharmacist
        username
      }
    }
  }
`;
