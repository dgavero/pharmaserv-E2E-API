export const GET_PATIENT_PRIVACY_POLICY_QUERY = /* GraphQL */ `
  query {
    patient {
      legals {
        privacyPolicy {
          title
          content
        }
      }
    }
  }
`;

export const GET_PATIENT_TERMS_AND_CONDITIONS_QUERY = /* GraphQL */ `
  query {
    patient {
      legals {
        termsAndConditions {
          title
          content
        }
      }
    }
  }
`;
