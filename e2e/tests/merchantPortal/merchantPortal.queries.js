export const MERCHANT_MY_BRANCH_QUERY = `
  query {
    pharmacy {
      branch {
        myBranch {
          id
        }
      }
    }
  }
`;

export const MERCHANT_ME_QUERY = `
  query {
    pharmacist {
      me {
        id
        psePharmacist
        username
      }
    }
  }
`;

export const PATIENT_GET_CHAT_MESSAGES_BY_ORDER_ID_QUERY = /* GraphQL */ `
  query ($orderId: ID!) {
    patient {
      chat {
        orderMessages(orderId: $orderId) {
          sender
          recipient
          message
          photo
          createdAt
        }
      }
    }
  }
`;

export const PATIENT_GET_CHAT_THREAD_BY_ORDER_ID_QUERY = /* GraphQL */ `
  query ($orderId: ID!, $type: PartiesType!) {
    patient {
      chat {
        thread(orderId: $orderId, type: $type) {
          id
          partiesType
        }
      }
    }
  }
`;

export const PATIENT_SEND_CHAT_MESSAGE_BY_THREAD_ID_MUTATION = /* GraphQL */ `
  mutation ($threadId: ID!, $chat: ChatMessageRequest!) {
    patient {
      chat {
        sendThreadMessage(threadId: $threadId, chat: $chat) {
          message
          photo
          createdAt
        }
      }
    }
  }
`;
