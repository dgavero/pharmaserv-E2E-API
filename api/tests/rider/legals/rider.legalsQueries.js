export const GET_RIDER_PRIVACY_POLICY_QUERY = /* GraphQL */ `
  query {
    rider {
      legals {
        privacyPolicy {
          title
          content
        }
      }
    }
  }
`;
