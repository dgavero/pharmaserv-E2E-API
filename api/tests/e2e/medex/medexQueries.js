export const MEDEX_LOGIN_PATH = '/api/users/login';

export function buildMedexOrderStatusPath(trackingCode) {
  return `/api/orders/${encodeURIComponent(String(trackingCode))}`;
}

export const MEDEX_CONFIRM_ORDER_PAYLOAD = Object.freeze({
  CODE: 'CNF',
});

export const MEDEX_SET_FOR_PICKUP_PAYLOAD = Object.freeze({
  CODE: 'OOP',
});
