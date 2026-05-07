import { execSync } from 'node:child_process';

const DEFAULT_WORKFLOW_ID = 'tests.yml';
const DEFAULT_RUN_MODE = 'basic';

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

export function buildRerunPayload({
  failedCaseIds = [],
  testEnv = process.env.TEST_ENV || 'DEV',
  threads = process.env.THREADS || '4',
  ref = detectGitRef(),
  repository = detectGitRepository(),
  project = process.env.PROJECT || process.env.PROJECTS || '',
  workflowId = DEFAULT_WORKFLOW_ID,
  runMode = DEFAULT_RUN_MODE,
} = {}) {
  const uniqueIds = normalizeFailedCaseIds(failedCaseIds);
  if (!uniqueIds.length || !ref || !repository) return null;

  const branch = ref.startsWith('refs/heads/') ? ref.replace('refs/heads/', '') : ref;

  return {
    testEnv: String(testEnv || 'DEV').toUpperCase(),
    threads: String(threads || '4'),
    tags: uniqueIds.join('|'),
    ref,
    branch,
    repository,
    project: String(project || ''),
    workflowId,
    runMode,
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

  const encodedPayload = encodeRerunPayload(payload);
  if (!encodedPayload) return null;

  const url = new URL(baseUrl);
  url.searchParams.set('payload', encodedPayload);
  return url.toString();
}
