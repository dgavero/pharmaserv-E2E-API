import { execSync } from 'node:child_process';
import { createHmac, timingSafeEqual } from 'node:crypto';

const DEFAULT_WORKFLOW_ID = 'tests.yml';
const DEFAULT_RUN_MODE = 'basic';
const DEFAULT_TTL_MS = 12 * 60 * 60 * 1000;

function normalizeFailedCaseIds(failedCaseIds = []) {
  return Array.from(
    new Set(
      failedCaseIds
        .map((value) => String(value || '').trim())
        .filter(Boolean)
    )
  );
}

function detectGitRef() {
  const envRef = String(process.env.GITHUB_REF || '').trim();
  if (envRef) return envRef;

  try {
    const branch = execSync('git symbolic-ref --quiet --short HEAD', {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (branch) return `refs/heads/${branch}`;
  } catch {
    // Fall back to commit SHA if HEAD is detached.
  }

  try {
    const sha = execSync('git rev-parse HEAD', {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return sha || null;
  } catch {
    return null;
  }
}

function detectGitRepository() {
  const envRepo = String(process.env.GITHUB_REPOSITORY || '').trim();
  if (envRepo) return envRepo;

  try {
    const remote = execSync('git remote get-url origin', {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();

    const sshMatch = remote.match(/github\.com[:/]([^/]+\/[^/.]+?)(?:\.git)?$/i);
    if (sshMatch) return sshMatch[1];

    const httpsMatch = remote.match(/github\.com\/([^/]+\/[^/.]+?)(?:\.git)?$/i);
    if (httpsMatch) return httpsMatch[1];
  } catch {
    return null;
  }

  return null;
}

function buildSignablePayload(payload) {
  return {
    testEnv: String(payload.testEnv || '').toUpperCase(),
    threads: String(payload.threads || ''),
    tags: String(payload.tags || ''),
    ref: String(payload.ref || ''),
    branch: String(payload.branch || ''),
    repository: String(payload.repository || ''),
    workflowId: String(payload.workflowId || ''),
    runMode: String(payload.runMode || ''),
    issuedAt: String(payload.issuedAt || ''),
    expiresAt: String(payload.expiresAt || ''),
  };
}

function computePayloadSignature(payload, secret) {
  const signablePayload = buildSignablePayload(payload);
  return createHmac('sha256', secret).update(JSON.stringify(signablePayload)).digest('hex');
}

export function buildRerunPayload({
  failedCaseIds = [],
  testEnv = process.env.TEST_ENV || 'DEV',
  threads = process.env.THREADS || '4',
  ref = detectGitRef(),
  repository = detectGitRepository(),
  workflowId = DEFAULT_WORKFLOW_ID,
  runMode = DEFAULT_RUN_MODE,
  now = Date.now(),
  ttlMs = DEFAULT_TTL_MS,
} = {}) {
  const uniqueIds = normalizeFailedCaseIds(failedCaseIds);
  if (!uniqueIds.length || !ref || !repository) return null;

  const branch = ref.startsWith('refs/heads/') ? ref.replace('refs/heads/', '') : ref;
  const issuedAt = new Date(now).toISOString();
  const expiresAt = new Date(now + ttlMs).toISOString();

  return {
    testEnv: String(testEnv || 'DEV').toUpperCase(),
    threads: String(threads || '4'),
    tags: uniqueIds.join('|'),
    ref,
    branch,
    repository,
    workflowId,
    runMode,
    issuedAt,
    expiresAt,
  };
}

export function buildRerunPayloadJson(payload) {
  if (!payload) return null;
  return JSON.stringify(payload);
}

export function encodeRerunPayload(payload) {
  const json = buildRerunPayloadJson(payload);
  if (!json) return null;
  return Buffer.from(json, 'utf-8').toString('base64url');
}

export function buildRerunHelperUrl({ baseUrl = process.env.RERUN_HELPER_BASE_URL, payload } = {}) {
  if (!baseUrl || !payload) return null;

  const signingSecret = String(process.env.RERUN_HELPER_SIGNING_SECRET || '').trim();
  if (!signingSecret) return null;

  const signedPayload = {
    ...payload,
    signature: computePayloadSignature(payload, signingSecret),
  };

  const encodedPayload = encodeRerunPayload(signedPayload);
  if (!encodedPayload) return null;

  const url = new URL(baseUrl);
  url.searchParams.set('payload', encodedPayload);
  return url.toString();
}

export function verifySignedRerunPayload(payload, secret = process.env.RERUN_HELPER_SIGNING_SECRET) {
  const signingSecret = String(secret || '').trim();
  const providedSignature = String(payload?.signature || '').trim();
  if (!signingSecret || !providedSignature) return false;

  const expectedSignature = computePayloadSignature(payload, signingSecret);
  const providedBuffer = Buffer.from(providedSignature, 'utf-8');
  const expectedBuffer = Buffer.from(expectedSignature, 'utf-8');
  if (providedBuffer.length !== expectedBuffer.length) return false;

  return timingSafeEqual(providedBuffer, expectedBuffer);
}
