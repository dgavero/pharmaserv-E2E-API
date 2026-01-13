export const RESET_PASSWORD_QUERY = /* GraphQL */ `
  mutation ($phoneNumber: String!) {
    pharmacist {
      requestPasswordReset(phoneNumber: $phoneNumber)
    }
  }
`;
