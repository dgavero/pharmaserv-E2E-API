// Used for requesting OTP during patient signup
export const REQ_OTP_QUERY = /* GraphQL */ `
  mutation ($phoneNumber: String!) {
    patient {
      requestSignupOTP(phoneNumber: $phoneNumber) {
        id
        phoneNumber
      }
    }
  }
`;

// Used for verifying OTP during patient signup
const VERIFY_OTP_QUERY = /* GraphQL */ `
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
