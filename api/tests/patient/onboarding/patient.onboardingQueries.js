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

export const VERIFY_SIGNUP_OTP_QUERY = /* GraphQL */ `
  mutation ($otp: OtpRequest!) {
    patient {
      verifySignupOTP(otp: $otp) {
        id
        username
        phoneNumber
      }
    }
  }
`;

export const REGISTER_PATIENT_MUTATION = /* GraphQL */ `
  mutation ($patientId: ID!, $patient: Register!) {
    patient {
      register(patientId: $patientId, patient: $patient) {
        id
        uuid
        firstName
        lastName
        username
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
