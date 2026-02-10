export const CREATE_ADS_LOCATION_MUTATION = /* GraphQL */ `
  mutation ($location: AdsLocationRequest!) {
    administrator {
      adsLocation {
        create(location: $location) {
          id
          locationCode
          location
          address
        }
      }
    }
  }
`;

export const CREATE_SECRETARY_CODE_MUTATION = /* GraphQL */ `
  mutation ($code: SecretaryCodeRequest!) {
    administrator {
      secretaryCode {
        create(code: $code) {
          id
          code
          firstName
          lastName
        }
      }
    }
  }
`;
