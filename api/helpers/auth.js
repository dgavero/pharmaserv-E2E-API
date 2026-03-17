import { safeGraphQL } from './graphqlUtils.js';

function requireNonEmptyCredentials(roleLabel, { username, password }) {
  const user = String(username ?? '').trim();
  const pass = String(password ?? '').trim();
  if (!user || !pass) {
    throw new Error(`${roleLabel} login: username and password are required and must be non-empty`);
  }
  return { username: user, password: pass };
}

const LOGIN_MUTATION = `
  mutation ($username: String!, $password: String!) {
    patient {
      auth {
        login(username: $username, password: $password) {
          accessToken
          refreshToken
        }
      }
    }
  }
`;

const ADMIN_LOGIN_MUTATION = `
  mutation ($username: String!, $password: String!) {
    administrator {
      auth {
        login(username: $username, password: $password) {
          accessToken
          refreshToken
        }
      }
    }
  }
`;

export const RIDER_LOGIN_QUERY = /* GraphQL */ `
  mutation ($username: String!, $password: String!) {
    rider {
      auth {
        login(username: $username, password: $password) {
          accessToken
          refreshToken
        }
      }
    }
  }
`;

export const PHARMACIST_LOGIN_QUERY = /* GraphQL */ `
  mutation ($username: String!, $password: String!) {
    pharmacist {
      auth {
        login(username: $username, password: $password) {
          accessToken
          refreshToken
        }
      }
    }
  }
`;

export const INVALID_JWT =
  'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJpbnZhbGlkIiwiZXhwIjoxNTAwMDAwMDAwfQ.invalidsig';

export const bearerInvalid = () => ({ Authorization: `Bearer ${INVALID_JWT}` });
export const noAuth = Object.freeze({});

export const NOAUTH_MESSAGES = [
  'Unauthorized',
  'Unauthorized Access',
  'Access Denied',
  'INTERNAL_SERVER_ERROR',
  'invalid value',
  'Access denied',
  'not found',
  'Bad Request',
];

export const NOAUTH_MESSAGE_PATTERN = new RegExp(`(${NOAUTH_MESSAGES.join('|')})`);

export const NOAUTH_CLASSIFICATIONS = [
  'UNAUTHORIZED',
  'CONFLICT',
  'INTERNAL_ERROR',
  'VALIDATIONERROR',
  'FORBIDDEN',
  'NOT_FOUND',
  'BAD_REQUEST',
];

export const NOAUTH_CODES = ['400', '401', '404', '403', '409', '500'];

export const NOAUTH_HTTP_STATUSES = [401, 404, 403, 500];

export async function loginAndGetTokens(api, { username, password }) {
  const creds = requireNonEmptyCredentials('Patient', { username, password });
  const raw = await safeGraphQL(api, {
    query: LOGIN_MUTATION,
    variables: creds,
  });
  if (!raw.ok) {
    throw new Error(`Login failed: ${raw.error || 'unknown error'}`);
  }
  const node = raw.body?.data?.patient?.auth?.login;
  return {
    accessToken: node?.accessToken ?? null,
    refreshToken: node?.refreshToken ?? null,
    raw,
  };
}

export async function adminLoginAndGetTokens(api, { username, password }) {
  const creds = requireNonEmptyCredentials('Admin', { username, password });
  const raw = await safeGraphQL(api, {
    query: ADMIN_LOGIN_MUTATION,
    variables: creds,
  });
  if (!raw.ok) {
    throw new Error(`Admin login failed: ${raw.error || 'unknown error'}`);
  }
  const node = raw.body?.data?.administrator?.auth?.login;
  return {
    accessToken: node?.accessToken ?? null,
    refreshToken: node?.refreshToken ?? null,
    raw,
  };
}

export async function riderLoginAndGetTokens(api, { username, password }) {
  const creds = requireNonEmptyCredentials('Rider', { username, password });
  const raw = await safeGraphQL(api, {
    query: RIDER_LOGIN_QUERY,
    variables: creds,
  });
  if (!raw.ok) {
    throw new Error(`Rider login failed: ${raw.error || 'unknown error'}`);
  }
  const node = raw.body?.data?.rider?.auth?.login;
  return {
    accessToken: node?.accessToken ?? null,
    refreshToken: node?.refreshToken ?? null,
    raw,
  };
}

export async function pharmacistLoginAndGetTokens(api, { username, password }) {
  const creds = requireNonEmptyCredentials('Pharmacist', { username, password });
  const raw = await safeGraphQL(api, {
    query: PHARMACIST_LOGIN_QUERY,
    variables: creds,
  });
  if (!raw.ok) {
    throw new Error(`Pharmacist login failed: ${raw.error || 'unknown error'}`);
  }
  const node = raw.body?.data?.pharmacist?.auth?.login;
  return {
    accessToken: node?.accessToken ?? null,
    refreshToken: node?.refreshToken ?? null,
    raw,
  };
}
