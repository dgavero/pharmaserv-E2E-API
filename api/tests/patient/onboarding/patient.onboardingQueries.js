export const REQUEST_SIGNUP_OTP_QUERY = /* GraphQL */ `
  mutation ($phoneNumber: String!) {
    patient {
      requestSignupOTP(phoneNumber: $phoneNumber) {
        id
        phoneNumber
      }
    }
  }
`;

export const GET_ADS_LOCATIONS_QUERY = /* GraphQL */ `
  query {
    patient {
      adsLocations {
        id
        locationCode
        location
        address
        codes {
          id
          code
          firstName
          lastName
        }
      }
    }
  }
`;
