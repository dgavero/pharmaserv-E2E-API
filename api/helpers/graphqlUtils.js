import { graphql } from './graphqlClient.js';

function extractGqlError(body) {
  const err = (body?.errors ?? [])[0] ?? {};
  const message = String(err?.message ?? '');
  const code = String(err?.extensions?.code ?? '');
  const classification = String(err?.extensions?.classification ?? '').toUpperCase();
  const path = Array.isArray(err?.path) ? err.path.join('.') : '';
  return { message, code, classification, path };
}

export function getGQLError(resOrBody) {
  const body = resOrBody?.body ?? resOrBody;
  return extractGqlError(body);
}

export function bearer(token) {
  if (!token) throw new Error('bearer: token is required');
  return { Authorization: `Bearer ${token}` };
}

export async function safeGraphQL(api, args) {
  const { res, body } = await graphql(api, args);
  const status = res.status();

  if (!res.ok()) {
    const text = await res.text().catch(() => '');
    return {
      ok: false,
      body,
      error: `HTTP ${status} ${String(text).slice(0, 200)}`,
      httpStatus: status,
      httpOk: false,
      errorCode: null,
      errorClass: null,
      errorMessage: text ? String(text).slice(0, 200) : null,
      errorPath: null,
    };
  }

  if (Array.isArray(body?.errors) && body.errors.length > 0) {
    const { message, code, classification, path } = extractGqlError(body);
    const compact =
      (code ? `${code}: ` : '') + (message || JSON.stringify(body.errors).slice(0, 300));

    return {
      ok: false,
      body,
      error: compact.slice(0, 400),
      httpStatus: status,
      httpOk: true,
      errorCode: code || null,
      errorClass: classification || null,
      errorMessage: message || null,
      errorPath: path || null,
    };
  }

  return {
    ok: true,
    body,
    error: null,
    httpStatus: status,
    httpOk: true,
    errorCode: null,
    errorClass: null,
    errorMessage: null,
    errorPath: null,
  };
}
