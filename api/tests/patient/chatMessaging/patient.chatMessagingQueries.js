export const GET_CHAT_THREAD_QUERY = /* GraphQL */ `
  query ($orderId: ID!, $type: PartiesType!) {
    patient {
      chat {
        thread(orderId: $orderId, type: $type) {
          id
          partiesType
          requesterType
          requester
          supportAgentType
          supportAgent
        }
      }
    }
  }
`;

export const GET_CHAT_MESSAGES_BY_ORDER_ID_QUERY = /* GraphQL */ `
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

export const GET_CHAT_MESSAGES_BY_THREAD_ID_QUERY = /* GraphQL */ `
  query ($threadId: ID!) {
    patient {
      chat {
        threadMessages(threadId: $threadId) {
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

export const SEND_CHAT_MESSAGE_BY_ORDER_ID_MUTATION = /* GraphQL */ `
  mutation ($orderId: ID!, $chat: ChatMessageRequest!) {
    patient {
      chat {
        sendOrderMessage(orderId: $orderId, chat: $chat) {
          message
          photo
          createdAt
        }
      }
    }
  }
`;

export const SEND_CHAT_MESSAGE_BY_THREAD_ID_MUTATION = /* GraphQL */ `
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

export const SEND_CHAT_PHOTO_BY_ORDER_ID_MUTATION = /* GraphQL */ `
  mutation ($orderId: ID!, $chat: ChatMessageRequest!) {
    patient {
      chat {
        sendOrderMessage(orderId: $orderId, chat: $chat) {
          message
          photo
          createdAt
        }
      }
    }
  }
`;

export const UPDATE_CHAT_MESSAGE_MUTATION = /* GraphQL */ `
  mutation ($id: ID!, $message: String!) {
    patient {
      chat {
        updateMessage(id: $id, message: $message) {
          id
          message
          photo
          edited
          createdAt
        }
      }
    }
  }
`;
