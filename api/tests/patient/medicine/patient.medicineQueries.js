export const ADD_FAVORITE_MEDICINE_QUERY = /* GraphQL */ `
  mutation ($patientId: ID!, $medicineId: ID!) {
    patient {
      medicine {
        addFavoriteMedicine(patientId: $patientId, medicineId: $medicineId) {
          medicineId
        }
      }
    }
  }
`;

export const GET_FAVORITE_MEDICINE_QUERY = /* GraphQL */ `
  query ($patientId: ID!) {
    patient {
      favoriteMedicines(patientId: $patientId) {
        medicineId
      }
    }
  }
`;

export const REMOVE_FAVORITE_MEDICINE_QUERY = /* GraphQL */ `
  mutation ($patientId: ID!, $medicineId: ID!) {
    patient {
      removeFavoriteMedicine(patientId: $patientId, medicineId: $medicineId)
    }
  }
`;
