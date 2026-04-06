// Used for Create Address for patient profile
export const CREATE_ADDRESS_QUERY = /* GraphQL */ `
  mutation ($address: AddressRequest!) {
    patient {
      address {
        create(address: $address) {
          id
          addressName
          address
          label
          landmark
          deliveryInstructions
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

export const UPDATE_ADDRESS_QUERY = /* GraphQL */ `
  mutation ($addressId: ID!, $address: AddressRequest!) {
    patient {
      address {
        update(addressId: $addressId, address: $address) {
          id
          addressName
          address
          label
          landmark
          deliveryInstructions
          lat
          lng
        }
      }
    }
  }
`;

export const CREATE_DISCOUNT_CARD_QUERY = /* GraphQL */ `
  mutation ($discountCard: DiscountCardRequest!) {
    patient {
      discountCard {
        create(discountCard: $discountCard) {
          id
          name
          cardType
          cardNumber
          photo
        }
      }
    }
  }
`;

export const GET_DISCOUNT_CARDS_QUERY = /* GraphQL */ `
  query ($patientId: ID!) {
    patient {
      discountCards(patientId: $patientId) {
        id
        name
        cardType
        cardNumber
        photo
      }
    }
  }
`;

export const REMOVE_DISCOUNT_CARD_QUERY = /* GraphQL */ `
  mutation ($discountCardId: ID!) {
    patient {
      discountCard {
        remove(discountCardId: $discountCardId)
      }
    }
  }
`;

export const UPDATE_DISCOUNT_CARD_QUERY = /* GraphQL */ `
  mutation ($discountCardId: ID!, $discountCard: DiscountCardRequest!) {
    patient {
      discountCard {
        update(discountCardId: $discountCardId, discountCard: $discountCard) {
          id
          name
          cardType
          cardNumber
          photo
        }
      }
    }
  }
`;

export const ADD_DEPENDENT_QUERY = /* GraphQL */ `
  mutation ($patient: PatientRequest!) {
    patient {
      addDependent(patient: $patient) {
        id
        firstName
        lastName
        email
      }
    }
  }
`;

export const GET_DEPENDENTS_QUERY = /* GraphQL */ `
  query {
    patient {
      dependents {
        id
        firstName
        lastName
        email
      }
    }
  }
`;

export const UPDATE_DEPENDENT_QUERY = /* GraphQL */ `
  mutation ($dependentId: ID!, $patient: PatientRequest!) {
    patient {
      updateDependent(dependentId: $dependentId, patient: $patient) {
        id
        firstName
        lastName
        email
        gender
        height
        weight
        bloodType
      }
    }
  }
`;

export const UPDATE_PATIENT_QUERY = /* GraphQL */ `
  mutation ($patient: PatientRequest!) {
    patient {
      update(patient: $patient) {
        id
        firstName
        lastName
        email
        gender
        height
        weight
        bloodType
      }
    }
  }
`;

export const CREATE_IDENTIFICATION_CARD_QUERY = /* GraphQL */ `
  mutation ($identificationCard: IdentificationCardRequest!) {
    patient {
      identificationCard {
        create(identificationCard: $identificationCard) {
          id
          cardType
          cardId
          frontPhoto
          backPhoto
        }
      }
    }
  }
`;

export const GET_IDENTIFICATION_CARD_UPLOAD_URL_QUERY = /* GraphQL */ `
  query ($ext: String!) {
    patient {
      identificationCardUploadURL(ext: $ext) {
        blobName
        url
      }
    }
  }
`;

export const GET_IDENTIFICATION_CARDS_QUERY = /* GraphQL */ `
  query ($patientId: ID!) {
    patient {
      identificationCards(patientId: $patientId) {
        id
        cardType
        cardId
        frontPhoto
        backPhoto
      }
    }
  }
`;

export const UPDATE_IDENTIFICATION_CARD_QUERY = /* GraphQL */ `
  mutation ($identificationCardId: ID!, $identificationCard: IdentificationCardRequest!) {
    patient {
      identificationCard {
        update(identificationCardId: $identificationCardId, identificationCard: $identificationCard) {
          id
          cardType
          cardId
          frontPhoto
          backPhoto
        }
      }
    }
  }
`;

export const REMOVE_IDENTIFICATION_CARD_QUERY = /* GraphQL */ `
  mutation ($identificationCardId: ID!) {
    patient {
      identificationCard {
        remove(identificationCardId: $identificationCardId)
      }
    }
  }
`;

export const SET_DEFAULT_ADDRESS_QUERY = /* GraphQL */ `
  mutation ($patientId: ID!, $addressId: ID!) {
    patient {
      address {
        setDefault(patientId: $patientId, addressId: $addressId)
      }
    }
  }
`;

export const GET_DEFAULT_ADDRESS_QUERY = /* GraphQL */ `
  query ($patientId: ID!) {
    patient {
      defaultAddress(patientId: $patientId) {
        id
        addressName
        address
        label
        landmark
        deliveryInstructions
        lat
        lng
      }
    }
  }
`;
