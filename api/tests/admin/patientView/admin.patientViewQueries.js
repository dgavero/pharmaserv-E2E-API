export const GET_PATIENT_QUERY = /* GraphQL */ `
  query ($by: IdentifierRequest!) {
    administrator {
      patient {
        detail(by: $by) {
          uuid
          username
          email
          firstName
          lastName
        }
      }
    }
  }
`;

export const GET_PAGED_PATIENTS_QUERY = /* GraphQL */ `
  query ($filter: FilterRequest!) {
    administrator {
      patient {
        pagedPatients(filter: $filter) {
          page {
            totalSize
          }
          items {
            id
            username
            firstName
            lastName
          }
        }
      }
    }
  }
`;
