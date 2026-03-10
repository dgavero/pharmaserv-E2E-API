import { getReusableTestIds } from '../../testData/reusableTestIds.js';

const reusableSlotOne = getReusableTestIds({ slot: 'slotOne' });

export const CHAT_MESSAGE_ID = reusableSlotOne.patientMsgId;
export const CHAT_ORDER_ID = reusableSlotOne.orderId;
export const CHAT_THREAD_ID = reusableSlotOne.threadId;
export const CHAT_PARTIES_TYPE = 'PATIENT_PHARMACY';
export const CHAT_SENDER_PATIENT = 'PATIENT';
export const CHAT_PHOTO_NAME = 'md-94f96997-4cc1-46c0-9367-a1e9bad457d7.png';
