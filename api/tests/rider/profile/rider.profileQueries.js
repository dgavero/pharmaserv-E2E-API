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

// Set Rider Status - Available
export const RIDER_SET_AVAILABLE_STATUS_QUERY = /* GraphQL */ `
  mutation {
    rider {
      setAvailable {
        status
      }
    }
  }
`;

export const RIDER_SET_UNAVAILABLE_STATUS_QUERY = /* GraphQL */ `
  mutation {
    rider {
      setUnavailable {
        status
      }
    }
  }
`;

// Set Rider Shift - Start Shift
export const RIDER_SET_SHIFT_START_QUERY = /* GraphQL */ `
  mutation {
    rider {
      schedule {
        startShift
      }
    }
  }
`;

export const RIDER_SET_SHIFT_END_QUERY = /* GraphQL */ `
  mutation {
    rider {
      schedule {
        endShift
      }
    }
  }
`;

export const RIDER_GET_RATING_SUMMARY_QUERY = /* GraphQL */ `
  query {
    rider {
      ratingSummary {
        five
        four
        three
        two
        one
        average
      }
    }
  }
`;

export const RIDER_GET_DOCUMENTS_QUERY = /* GraphQL */ `
  query {
    rider {
      documents {
        type
        photo
      }
    }
  }
`;
