// General-purpose random helpers for API & E2E tests (lowercase by default).
// Uses Node's crypto for strong randomness.

import { randomInt } from 'crypto';

/** Internal: build a random string from a charset */
function fromCharset(length, charset) {
  if (!Number.isInteger(length) || length < 1) {
    throw new Error(`length must be a positive integer, got: ${length}`);
  }
  const n = charset.length;
  let out = '';
  for (let i = 0; i < length; i++) {
    out += charset[randomInt(0, n)];
  }
  return out;
}

/**
 * randomNum(length): string of numeric digits of given length.
 *   randomNum(5) -> '28413'
 */
export function randomNum(length) {
  return fromCharset(length, '0123456789');
}

/**
 * randomLetters(length): lowercase letters only.
 *   randomLetters(5) -> 'azbxq'
 */
export function randomLetters(length) {
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  return fromCharset(length, lower);
}

/**
 * randomAlphanumeric(length): lowercase letters + digits.
 *   randomAlphanumeric(8) -> 'a3b90qxf'
 */
export function randomAlphanumeric(length) {
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  return fromCharset(length, lower + digits);
}

/** Convenience helpers */
export function randomEmail(prefix = 'user', domain = 'example.com') {
  return `${prefix}+${randomAlphanumeric(8)}@${domain}`;
}

export function randomUsername(prefix = 'user') {
  return `${prefix}_${randomAlphanumeric(8)}`;
}
