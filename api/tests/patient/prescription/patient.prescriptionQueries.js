export const SCAN_PRESCRIPTION_QUERY = /* GraphQL */ `
  mutation ($prescription: ScanRequest!) {
    patient {
      prescription {
        scan(prescription: $prescription) {
          id
          prescriptionItems {
            medicine {
              id
              brand
              genericName
            }
          }
        }
      }
    }
  }
`;

export const GET_PRESCRIPTION_QUERY = /* GraphQL */ `
  query ($patientId: ID!) {
    patient {
      prescriptions(patientId: $patientId) {
        id
        photo
        prescriptionItems {
          medicine {
            brand
            genericName
          }
        }
      }
    }
  }
`;

export const REMOVE_PRESCRIPTION_QUERY = /* GraphQL */ `
  mutation ($prescriptionId: ID!) {
    patient {
      prescription {
        remove(prescriptionId: $prescriptionId)
      }
    }
  }
`;
