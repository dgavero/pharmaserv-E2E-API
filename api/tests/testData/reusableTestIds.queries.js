export const PATIENT_SEND_ORDER_MESSAGE_WITH_ID_MUTATION = /* GraphQL */ `
  mutation ($orderId: ID!, $chat: ChatMessageRequest!) {
    patient {
      chat {
        sendOrderMessage(orderId: $orderId, chat: $chat) {
          id
          message
          photo
          createdAt
        }
      }
    }
  }
`;

export const PATIENT_GET_CHAT_THREAD_WITH_ID_QUERY = /* GraphQL */ `
  query ($orderId: ID!, $type: PartiesType!) {
    patient {
      chat {
        thread(orderId: $orderId, type: $type) {
          id
        }
      }
    }
  }
`;

export const PHARMACIST_SEND_THREAD_MESSAGE_WITH_ID_MUTATION = /* GraphQL */ `
  mutation ($threadId: ID!, $chat: ChatMessageRequest!) {
    pharmacy {
      chat {
        sendThreadMessage(threadId: $threadId, chat: $chat) {
          id
          message
          photo
          createdAt
        }
      }
    }
  }
`;
