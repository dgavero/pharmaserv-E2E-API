export const CREATE_BOX_MUTATION = /* GraphQL */ `
  mutation ($box: BoxRequest!) {
    administrator {
      asset {
        createBox(box: $box) {
          id
          boxNumber
        }
      }
    }
  }
`;

export const GET_BOX_QUERY = /* GraphQL */ `
  query ($assetReferenceId: ID!) {
    administrator {
      asset {
        box(assetReferenceId: $assetReferenceId) {
          boxNumber
        }
      }
    }
  }
`;

export const CREATE_LOGGER_MUTATION = /* GraphQL */ `
  mutation ($logger: LoggerRequest!) {
    administrator {
      asset {
        createLogger(logger: $logger) {
          id
          loggerNumber
        }
      }
    }
  }
`;

export const GET_LOGGER_QUERY = /* GraphQL */ `
  query ($assetReferenceId: ID!) {
    administrator {
      asset {
        logger(assetReferenceId: $assetReferenceId) {
          loggerNumber
        }
      }
    }
  }
`;

export const CREATE_PHONE_MUTATION = /* GraphQL */ `
  mutation ($phone: PhoneRequest!) {
    administrator {
      asset {
        createPhone(phone: $phone) {
          id
          deviceType
          model
          imei
          imei2
        }
      }
    }
  }
`;

export const GET_PHONE_QUERY = /* GraphQL */ `
  query ($assetReferenceId: ID!) {
    administrator {
      asset {
        phone(assetReferenceId: $assetReferenceId) {
          deviceType
          model
          imei
          imei2
        }
      }
    }
  }
`;

export const CREATE_VEHICLE_MUTATION = /* GraphQL */ `
  mutation ($vehicle: VehicleRequest!) {
    administrator {
      asset {
        createVehicle(vehicle: $vehicle) {
          id
          vehicleType
          plateNumber
          model
        }
      }
    }
  }
`;

export const GET_VEHICLE_QUERY = /* GraphQL */ `
  query ($assetReferenceId: ID!) {
    administrator {
      asset {
        vehicle(assetReferenceId: $assetReferenceId) {
          vehicleType
          model
          officialReceiptNumber
          plateNumber
        }
      }
    }
  }
`;

export const GET_PAGED_ASSETS_QUERY = /* GraphQL */ `
  query ($filter: FilterRequest!) {
    administrator {
      asset {
        pagedAssets(filter: $filter) {
          page {
            totalSize
          }
          items {
            id
            type
            status
            assignedTo
            dateAcquired
          }
        }
      }
    }
  }
`;

export const UPDATE_ASSET_MUTATION = /* GraphQL */ `
  mutation ($assetId: ID!, $asset: AssetRequest!) {
    administrator {
      asset {
        updateAsset(assetId: $assetId, asset: $asset) {
          id
          type
          status
        }
      }
    }
  }
`;

export const GET_ASSET_MAINTENANCE_HISTORY_QUERY = /* GraphQL */ `
  query ($assetId: ID!) {
    administrator {
      asset {
        statusHistory(assetId: $assetId) {
          createdAt
          action
        }
      }
    }
  }
`;
