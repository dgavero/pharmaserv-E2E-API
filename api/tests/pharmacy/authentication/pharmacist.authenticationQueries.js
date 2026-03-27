export const PHARMACIST_LOGIN_QUERY = /* GraphQL */ `
  mutation ($username: String!, $password: String!) {
    pharmacist {
      auth {
        login(username: $username, password: $password) {
          accessToken
          refreshToken
        }
      }
    }
  }
`;

export const RESET_PASSWORD_QUERY = /* GraphQL */ `
  mutation ($phoneNumber: String!) {
    pharmacist {
      requestPasswordReset(phoneNumber: $phoneNumber)
    }
  }
`;
