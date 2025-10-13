// Small utility to send GraphQL and parse JSON (no throws).
// Returns both raw Response and parsed body.
export const DEFAULT_GRAPHQL_PATH =
  process.env.GRAPHQL_PATH || '/api/v1/pharmaserv/graphql';

export async function graphql(api, { query, operationName, variables, path = DEFAULT_GRAPHQL_PATH }) {
  const res = await api.post(path, {
    data: { query, operationName, variables },
  });
  let body = null;
  try { body = await res.json(); } catch { /* leave null if non-JSON */ }
  return { res, body };
}
