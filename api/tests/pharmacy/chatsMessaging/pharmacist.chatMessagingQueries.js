export const PHARMACIST_GET_CHAT_REGULAR_BRANCH_THREAD_QUERY = /* GraphQL */ `
  query {
    pharmacy {
      chat {
        branchThreads {
          id
          orderId
          partiesType
          requesterType
          requester
          supportAgentType
          supportAgent
          createdAt
          lastMessage
          lastMessageAt
          seen
        }
      }
    }
  }
`;

export const PHARMACIST_GET_CHAT_PSE_BRANCH_THREAD_QUERY = /* GraphQL */ `
  query {
    pharmacy {
      chat {
        psePharmacyThreads {
          orderId
          partiesType
          requesterType
          requester
          requesterPhoto
          supportAgentType
          supportAgent
          createdAt
          lastMessage
          lastMessageAt
          seen
        }
      }
    }
  }
`;

export const PHARMACIST_GET_CHAT_THREAD_BY_ID_QUERY = /* GraphQL */ `
  query ($orderId: ID!, $type: PartiesType!) {
    pharmacy {
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

export const PHARMACIST_GET_CHAT_MESSAGES_BY_ORDER_ID_QUERY = /* GraphQL */ `
  query ($orderId: ID!) {
    pharmacy {
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

export const PHARMACIST_GET_CHAT_MESSAGES_BY_THREAD_ID_QUERY = /* GraphQL */ `
  query ($threadId: ID!) {
    pharmacy {
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

export const PHARMACIST_SEND_CHAT_MESSAGES_BY_ORDER_ID_QUERY = /* GraphQL */ `
  mutation ($orderId: ID!, $chat: ChatMessageRequest!) {
    pharmacy {
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

export const PHARMACIST_SEND_CHAT_MESSAGES_BY_THREAD_ID_QUERY = /* GraphQL */ `
  mutation ($threadId: ID!, $chat: ChatMessageRequest!) {
    pharmacy {
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

export const PHARMACIST_SET_THREAD_SEEN_QUERY = /* GraphQL */ `
  mutation ($threadId: ID!) {
    pharmacy {
      chat {
        seen(threadId: $threadId)
      }
    }
  }
`;
