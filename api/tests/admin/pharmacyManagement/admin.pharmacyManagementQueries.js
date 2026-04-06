export const GET_PAGED_BRANCHES_QUERY = /* GraphQL */ `
  query ($pharmacyId: ID!, $filter: FilterRequest!) {
    administrator {
      branch {
        pagedBranches(pharmacyId: $pharmacyId, filter: $filter) {
          page {
            totalSize
          }
          items {
            id
            name
          }
        }
      }
    }
  }
`;

export const GET_PAGED_ALL_BRANCHES_QUERY = /* GraphQL */ `
  query ($pharmacyId: ID, $filter: FilterRequest!) {
    administrator {
      branch {
        pagedBranches(pharmacyId: $pharmacyId, filter: $filter) {
          page {
            totalSize
          }
          items {
            id
            code
            pharmacyName
            name
            onboarded
            openingTime
            closingTime
            status
          }
        }
      }
    }
  }
`;

export const GET_PAGED_PHARMACIES_QUERY = /* GraphQL */ `
  query ($filter: FilterRequest!) {
    administrator {
      pharmacy {
        pagedPharmacies(filter: $filter) {
          page {
            totalSize
          }
          items {
            id
            name
          }
        }
      }
    }
  }
`;

export const GET_PHARMACY_QUERY = /* GraphQL */ `
  query ($pharmacyId: ID!) {
    administrator {
      pharmacy {
        detail(pharmacyId: $pharmacyId) {
          id
          name
        }
      }
    }
  }
`;

export const GET_BRANCH_QUERY = /* GraphQL */ `
  query ($branchId: ID!) {
    administrator {
      branch {
        detail(branchId: $branchId) {
          id
          pharmacyName
          name
          status
        }
      }
    }
  }
`;

export const CREATE_BRANCH_MUTATION = /* GraphQL */ `
  mutation ($pharmacyId: ID!, $branch: BranchCreateRequest!) {
    administrator {
      pharmacy {
        branch {
          create(pharmacyId: $pharmacyId, branch: $branch) {
            id
            code
            pharmacyName
            name
            lat
            lng
          }
        }
      }
    }
  }
`;

export const UPDATE_BRANCH_MUTATION = /* GraphQL */ `
  mutation ($branchId: ID!, $branch: BranchRequest!) {
    administrator {
      pharmacy {
        branch {
          update(branchId: $branchId, branch: $branch) {
            id
            pharmacyName
            name
            lat
            lng
          }
        }
      }
    }
  }
`;

export const CREATE_PHARMACY_MUTATION = /* GraphQL */ `
  mutation ($pharmacy: PharmacyRequest!) {
    administrator {
      pharmacy {
        create(pharmacy: $pharmacy) {
          id
          code
          name
        }
      }
    }
  }
`;
