export const GET_RIDER_DETAIL_QUERY = /* GraphQL */ `
  query ($by: IdentifierRequest!) {
    administrator {
      rider {
        detail(by: $by) {
          id
          uuid
          username
          email
          firstName
          lastName
          status
        }
      }
    }
  }
`;

export const GET_PAGED_RIDERS_QUERY = /* GraphQL */ `
  query ($filter: RiderFilterRequest!) {
    administrator {
      rider {
        pagedRiders(filter: $filter) {
          page {
            totalSize
          }
          items {
            id
            firstName
            lastName
            username
            status
          }
        }
      }
    }
  }
`;

export const GET_RIDER_DOCUMENT_QUERY = /* GraphQL */ `
  query ($riderId: ID!, $type: DocumentType!) {
    administrator {
      rider {
        document(riderId: $riderId, type: $type) {
          type
          photo
        }
      }
    }
  }
`;

export const GET_RIDER_DOCUMENTS_QUERY = /* GraphQL */ `
  query ($riderId: ID!) {
    administrator {
      rider {
        documents(riderId: $riderId) {
          type
          photo
        }
      }
    }
  }
`;

export const REGISTER_RIDER_MUTATION = /* GraphQL */ `
  mutation ($rider: RiderRegister!) {
    administrator {
      rider {
        register(rider: $rider) {
          id
          uuid
          firstName
          lastName
          username
        }
      }
    }
  }
`;

export const UPDATE_RIDER_MUTATION = /* GraphQL */ `
  mutation ($riderId: ID!, $rider: RiderRequest!) {
    administrator {
      rider {
        update(riderId: $riderId, rider: $rider) {
          id
          uuid
          firstName
          lastName
          username
        }
      }
    }
  }
`;

export const SET_RIDER_DOCUMENT_QUERY = /* GraphQL */ `
  mutation ($riderId: ID!, $document: DocumentRequest!) {
    administrator {
      rider {
        setDocument(riderId: $riderId, document: $document) {
          type
          photo
        }
      }
    }
  }
`;

export const SET_RIDER_AVAILABLE_MUTATION = /* GraphQL */ `
  mutation ($riderId: ID!) {
    administrator {
      rider {
        setAvailable(riderId: $riderId) {
          status
        }
      }
    }
  }
`;

export const SET_RIDER_UNAVAILABLE_MUTATION = /* GraphQL */ `
  mutation ($riderId: ID!) {
    administrator {
      rider {
        setUnavailable(riderId: $riderId) {
          status
        }
      }
    }
  }
`;
