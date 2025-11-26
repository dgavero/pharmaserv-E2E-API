// Used for Create Address for patient profile
export const CREATE_ADDRESS_QUERY = /* GraphQL */ `
  mutation ($address: AddressRequest!) {
    patient {
      address {
        create(address: $address) {
          id
          addressName
          address
          lat
          lng
        }
      }
    }
  }
`;

// Used for Get Address for patient profile
export const GET_ADDRESS_QUERY = /* GraphQL */ `
  query ($patientId: ID!) {
    patient {
      addresses(patientId: $patientId) {
        id
        addressName
        address
        lat
        lng
      }
    }
  }
`;

// Used for Remove Address for patient profile
export const REMOVE_ADDRESS_QUERY = /* GraphQL */ `
  mutation ($addressId: ID!) {
    patient {
      address {
        remove(addressId: $addressId)
      }
    }
  }
`;
