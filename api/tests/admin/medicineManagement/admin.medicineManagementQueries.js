export const GET_MEDICINE_UPLOAD_URL_QUERY = /* GraphQL */ `
  query ($ext: String!) {
    administrator {
      medicine {
        medicineUploadURL(ext: $ext) {
          blobName
          url
        }
      }
    }
  }
`;

export const CREATE_MEDICINE_MUTATION = /* GraphQL */ `
  mutation ($medicine: CreateMedicineRequest!) {
    administrator {
      medicine {
        create(medicine: $medicine) {
          id
          brand
          genericName
          manufacturer
        }
      }
    }
  }
`;

export const UPDATE_MEDICINE_MUTATION = /* GraphQL */ `
  mutation ($medicineId: ID!, $medicine: MedicineRequest!) {
    medicine {
      update(medicineId: $medicineId, medicine: $medicine) {
        id
        brand
        genericName
        manufacturer
      }
    }
  }
`;

export const ADD_MEDICINE_PHOTO_MUTATION = /* GraphQL */ `
  mutation ($photo: MedicinePhotoRequest!) {
    administrator {
      medicine {
        addPhoto(photo: $photo) {
          photo
        }
      }
    }
  }
`;

export const GET_MEDICINE_PHOTOS_QUERY = /* GraphQL */ `
  query ($medicineId: ID!) {
    administrator {
      medicine {
        medicinePhotos(medicineId: $medicineId) {
          photo
        }
      }
    }
  }
`;
