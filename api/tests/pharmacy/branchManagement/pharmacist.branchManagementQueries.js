export const PHARMACIST_UPDATE_BRANCH_QUERY = /* GraphQL */ `
  mutation ($branchId: ID!, $branch: BranchRequest!) {
    pharmacy {
      admin {
        branch {
          update(branchId: $branchId, branch: $branch) {
            id
            name
          }
        }
      }
    }
  }
`;

export const PHARMACIST_GET_PAGED_BRANCH_QUERY = /* GraphQL */ `
  query ($filter: FilterRequest!) {
    pharmacy {
      admin {
        branch {
          pagedBranches(filter: $filter) {
            page {
              totalSize
            }
            items {
              id
              code
              name
            }
          }
        }
      }
    }
  }
`;

export const PHARMACIST_GET_BRANCH_BY_ID_QUERY = /* GraphQL */ `
  query ($branchId: ID!) {
    pharmacy {
      admin {
        branch {
          detail(branchId: $branchId) {
            id
            code
            name
          }
        }
      }
    }
  }
`;
