// const TEST_ENV = String(process.env.TEST_ENV || 'DEV').toUpperCase();

// const CHAT_CONSTANTS_BY_ENV = {
//   DEV: {
//     messageId: process.env.PHARMACIST_REUSABLE_MSGID_REG01,
//     orderId: process.env.PHARMACIST_REUSABLE_ORDERID_REG01,
//     threadId: process.env.PHARMACIST_REUSABLE_THREADID_REGO1,
//     photoName: 'md-94f96997-4cc1-46c0-9367-a1e9bad457d7.png',
//   },
//   QA: {
//     messageId: process.env.PHARMACIST_REUSABLE_MSGID_REG01,
//     orderId: process.env.PHARMACIST_REUSABLE_ORDERID_REG01,
//     threadId: process.env.PHARMACIST_REUSABLE_THREADID_REGO1,
//     photoName: 'md-94f96997-4cc1-46c0-9367-a1e9bad457d7.png',
//   },
//   PROD: {
//     messageId: process.env.PHARMACIST_REUSABLE_MSGID_REG01,
//     orderId: process.env.PHARMACIST_REUSABLE_ORDERID_REG01,
//     threadId: process.env.PHARMACIST_REUSABLE_THREADID_REGO1,
//     photoName: 'md-94f96997-4cc1-46c0-9367-a1e9bad457d7.png',
//   },
// };

// const chatConstants = CHAT_CONSTANTS_BY_ENV[TEST_ENV];
// if (!chatConstants) {
//   throw new Error(`Unsupported TEST_ENV="${TEST_ENV}" in patient.chatMessagingConstants.js`);
// }

export const CHAT_MESSAGE_ID = process.env.PHARMACIST_REUSABLE_MSGID_REG01;
export const CHAT_ORDER_ID = process.env.PHARMACIST_REUSABLE_ORDERID_REG01;
export const CHAT_THREAD_ID = process.env.PHARMACIST_REUSABLE_THREADID_REGO1;
export const CHAT_PARTIES_TYPE = 'PATIENT_PHARMACY';
export const CHAT_SENDER_PATIENT = 'PATIENT';
export const CHAT_PHOTO_NAME = 'md-94f96997-4cc1-46c0-9367-a1e9bad457d7.png';
