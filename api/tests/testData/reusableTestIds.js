import fs from 'node:fs';
import path from 'node:path';

const SUPPORTED_ENVS = ['DEV', 'QA', 'PROD'];

export const REUSABLE_TEST_IDS_PATH = path.resolve('api/tests/testData/reusableTestIds.json');

export function resolveTestEnv() {
  const testEnv = String(process.env.TEST_ENV || 'DEV').toUpperCase();
  if (!SUPPORTED_ENVS.includes(testEnv)) {
    throw new Error(`Unsupported TEST_ENV="${testEnv}" for reusable test ids`);
  }
  return testEnv;
}

export function normalizeSlotName(slotInput) {
  const rawSlot = String(slotInput || '').trim().toLowerCase();

  if (rawSlot === '1' || rawSlot === 'one' || rawSlot === 'slot1' || rawSlot === 'slotone') {
    return 'slotOne';
  }

  if (rawSlot === '2' || rawSlot === 'two' || rawSlot === 'slot2' || rawSlot === 'slottwo') {
    return 'slotTwo';
  }

  throw new Error(`Unsupported slot "${slotInput}". Use slotOne/slotTwo or 1/2.`);
}

export function readReusableTestIdsRegistry() {
  const registryText = fs.readFileSync(REUSABLE_TEST_IDS_PATH, 'utf8');
  return JSON.parse(registryText);
}

export function getReusableTestIds({ env = resolveTestEnv(), slot }) {
  const slotName = normalizeSlotName(slot);
  const registry = readReusableTestIdsRegistry();
  const envSlots = registry[env];

  if (!envSlots) {
    throw new Error(`Missing reusable test id env entry for TEST_ENV="${env}"`);
  }

  const slotData = envSlots[slotName];
  if (!slotData) {
    throw new Error(`Missing reusable test id entry for ${env}.${slotName}`);
  }

  return slotData;
}

export function getReusableNegativeFixtures({ env = resolveTestEnv() } = {}) {
  const registry = readReusableTestIdsRegistry();
  const envSlots = registry[env];

  if (!envSlots) {
    throw new Error(`Missing reusable test id env entry for TEST_ENV="${env}"`);
  }

  const fixtures = envSlots.negativeFixtures;
  if (!fixtures) {
    throw new Error(`Missing negative fixture entry for TEST_ENV="${env}"`);
  }

  return fixtures;
}

export function updateReusableNegativeFixtures({ env = resolveTestEnv(), data }) {
  const registry = readReusableTestIdsRegistry();

  if (!registry[env]) {
    throw new Error(`Missing reusable test id env entry for TEST_ENV="${env}"`);
  }

  registry[env].negativeFixtures = {
    ...registry[env].negativeFixtures,
    ...data,
  };

  fs.writeFileSync(REUSABLE_TEST_IDS_PATH, `${JSON.stringify(registry, null, 2)}\n`, 'utf8');

  return registry[env].negativeFixtures;
}

export function updateReusableTestIds({ env = resolveTestEnv(), slot, data }) {
  const slotName = normalizeSlotName(slot);
  const registry = readReusableTestIdsRegistry();

  if (!registry[env]) {
    throw new Error(`Missing reusable test id env entry for TEST_ENV="${env}"`);
  }

  registry[env][slotName] = {
    ...registry[env][slotName],
    ...data,
  };

  fs.writeFileSync(REUSABLE_TEST_IDS_PATH, `${JSON.stringify(registry, null, 2)}\n`, 'utf8');

  return registry[env][slotName];
}
