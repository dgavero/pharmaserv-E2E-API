/**
 * Grafana OTP helper for API smsVerification workflows.
 *
 * What it does:
 * - Queries Grafana's Loki datasource proxy for OTP logs from notification-service.
 * - Extracts OTP from log lines like: "Phone: +639XXXXXXXXX OTP: 123456".
 * - Polls for a bounded time because log ingestion can be delayed.
 *
 * When to use:
 * - API E2E tests that need OTP verification without hardcoding OTP values.
 * - Cross-role flows (patient/admin/rider/merchant) that rely on the same SMS log source.
 *
 * Not intended for:
 * - UI tests or shared global harness behavior.
 * - Environments without Grafana proxy credentials in env vars.
 */
const DEFAULT_LOGQL_LABELS = '{service_name="notification-service"}';
const INITIAL_WAIT_MS = 5000;
const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 30000;
const LOOKBACK_MS = 2 * 60 * 1000;
const OTP_PATTERN = /Phone:\s*(\+639\d{9})\s+OTP:\s*(\d{6})/i;

function resolveEnvName() {
  return String(process.env.TEST_ENV || 'DEV').toUpperCase();
}

function getGrafanaProxyConfig() {
  const envName = resolveEnvName();
  const baseUrl = process.env[`GRAFANA_BASE_URL_${envName}`] || '';
  const lokiUid = process.env[`GRAFANA_LOKI_UID_${envName}`] || '';
  const token = process.env[`GRAFANA_TOKEN_${envName}`] || '';
  if (!baseUrl || !lokiUid || !token) {
    throw new Error(
      `Missing Grafana OTP config for TEST_ENV=${envName}. Required: GRAFANA_BASE_URL_${envName}, GRAFANA_LOKI_UID_${envName}, GRAFANA_TOKEN_${envName}`
    );
  }
  return { baseUrl: baseUrl.replace(/\/+$/, ''), lokiUid, token };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseOtpFromLine(line, expectedPhoneNumber) {
  if (!line) return null;

  const directMatch = String(line).match(OTP_PATTERN);
  if (directMatch && directMatch[1] === expectedPhoneNumber) {
    return directMatch[2];
  }

  try {
    const parsed = JSON.parse(String(line));
    const message = String(parsed?.message ?? parsed?.msg ?? '');
    const messageMatch = message.match(OTP_PATTERN);
    if (messageMatch && messageMatch[1] === expectedPhoneNumber) {
      return messageMatch[2];
    }
  } catch {
    // Non-JSON log line; ignore parse error.
  }

  return null;
}

function getLatestOtpFromGrafanaResponse(responseBody, expectedPhoneNumber) {
  const results = responseBody?.data?.result ?? [];
  const allEntries = [];

  for (const stream of results) {
    for (const value of stream?.values ?? []) {
      // Log stream value shape: [ "<nanoseconds>", "<line>" ]
      const ts = Number(value?.[0] ?? 0);
      const line = String(value?.[1] ?? '');
      const otp = parseOtpFromLine(line, expectedPhoneNumber);
      if (otp) {
        allEntries.push({ ts, otp });
      }
    }
  }

  if (!allEntries.length) return null;
  allEntries.sort((a, b) => b.ts - a.ts);
  return allEntries[0].otp;
}

// One-shot Grafana query scoped to the recent lookback window.
export async function fetchLatestOtpFromGrafana({ api, phoneNumber }) {
  const proxy = getGrafanaProxyConfig();
  const query = `${DEFAULT_LOGQL_LABELS} |= "Phone: ${phoneNumber} OTP:"`;
  const endMs = Date.now();
  const startMs = endMs - LOOKBACK_MS;
  const requestUrl = `${proxy.baseUrl}/api/datasources/proxy/uid/${proxy.lokiUid}/loki/api/v1/query_range`;

  const lokiRes = await api.get(requestUrl, {
    params: {
      query,
      start: `${startMs}000000`,
      end: `${endMs}000000`,
      direction: 'backward',
      limit: '50',
    },
    headers: {
      Authorization: `Bearer ${proxy.token}`,
    },
  });

  if (!lokiRes.ok()) {
    const responseText = await lokiRes.text().catch(() => '');
    throw new Error(
      `Grafana log query failed (${lokiRes.status()}) ${responseText.slice(0, 200) || 'No response body'}`
    );
  }

  const body = await lokiRes.json();
  return getLatestOtpFromGrafanaResponse(body, phoneNumber);
}

// Bounded polling wrapper used by tests that need eventual OTP availability.
export async function waitForLatestOtpFromGrafana({ api, phoneNumber }) {
  console.log(`[smsVerification] Fetching latest OTP code for number ${phoneNumber}`);
  await sleep(INITIAL_WAIT_MS);
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  let latestError = null;
  let attempt = 0;

  while (Date.now() < deadline) {
    attempt += 1;
    try {
      const otp = await fetchLatestOtpFromGrafana({ api, phoneNumber });
      if (otp) {
        console.log(`[smsVerification] OTP for number ${phoneNumber} is found: ${otp}`);
        return otp;
      }

      console.log(
        `[smsVerification] No OTP found yet for number ${phoneNumber}; retrying (attempt ${attempt})`
      );
    } catch (error) {
      latestError = error;
      console.log(
        `[smsVerification] OTP fetch attempt ${attempt} failed for ${phoneNumber}; retrying: ${error.message}`
      );
    }

    await sleep(POLL_INTERVAL_MS);
  }

  if (latestError) {
    console.log(
      `[smsVerification] OTP for number ${phoneNumber} is not found after retries. Last error: ${latestError.message}`
    );
    throw new Error(
      `Unable to fetch OTP from Grafana logs for ${phoneNumber} within ${POLL_TIMEOUT_MS}ms: ${latestError.message}`
    );
  }

  console.log(
    `[smsVerification] OTP for number ${phoneNumber} is not found after retries (timeout ${POLL_TIMEOUT_MS}ms)`
  );
  throw new Error(
    `No OTP log found in Grafana logs for ${phoneNumber} within ${POLL_TIMEOUT_MS}ms (lookback ${LOOKBACK_MS}ms)`
  );
}
