#!/usr/bin/env node
'use strict';

const http = require('node:http');

const PORT = parseInt(process.env.RERUN_HELPER_PORT || '8787', 10);
const HOST = process.env.RERUN_HELPER_HOST || '0.0.0.0';
const GITHUB_API_BASE = process.env.RERUN_HELPER_GITHUB_API_BASE || 'https://api.github.com';
const GITHUB_TOKEN = process.env.RERUN_HELPER_GITHUB_TOKEN || '';

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function sendHtml(res, statusCode, html) {
  res.writeHead(statusCode, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': Buffer.byteLength(html),
  });
  res.end(html);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function decodePayload(rawPayload) {
  if (!rawPayload) {
    throw new Error('Missing rerun payload');
  }

  const json = Buffer.from(String(rawPayload), 'base64url').toString('utf-8');
  return JSON.parse(json);
}

function validatePayload(payload) {
  const requiredKeys = ['testEnv', 'threads', 'tags', 'ref', 'repository', 'workflowId'];
  const missingKeys = requiredKeys.filter((key) => !String(payload?.[key] || '').trim());
  if (missingKeys.length) {
    throw new Error(`Missing required payload field(s): ${missingKeys.join(', ')}`);
  }

  return {
    testEnv: String(payload.testEnv).toUpperCase(),
    threads: String(payload.threads),
    tags: String(payload.tags),
    ref: String(payload.ref),
    branch: String(payload.branch || payload.ref),
    repository: String(payload.repository),
    workflowId: String(payload.workflowId),
    runMode: String(payload.runMode || 'basic'),
  };
}

async function triggerWorkflowDispatch(payload) {
  if (!GITHUB_TOKEN) {
    throw new Error('Missing RERUN_HELPER_GITHUB_TOKEN');
  }

  const response = await fetch(
    `${GITHUB_API_BASE}/repos/${payload.repository}/actions/workflows/${encodeURIComponent(payload.workflowId)}/dispatches`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'pharmaserv-rerun-helper',
      },
      body: JSON.stringify({
        ref: payload.ref,
        inputs: {
          run_mode: payload.runMode,
          threads: payload.threads,
          test_env: payload.testEnv,
          tags: payload.tags,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GitHub dispatch failed (${response.status}): ${errorText || 'No response body'}`);
  }

  return {
    ok: true,
    actionsUrl: `https://github.com/${payload.repository}/actions/workflows/${payload.workflowId}`,
  };
}

function renderPage(payload, errorMessage = '') {
  const payloadJson = JSON.stringify(payload);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>GitHub Actions Rerun Helper</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #f3efe6;
        --card: #fffaf2;
        --ink: #1d2a38;
        --muted: #6c7783;
        --accent: #b74d26;
        --accent-dark: #8b3213;
        --border: #d5c7b3;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        font-family: Georgia, "Times New Roman", serif;
        background:
          radial-gradient(circle at top left, rgba(183, 77, 38, 0.18), transparent 30%),
          linear-gradient(180deg, #f8f3e8 0%, var(--bg) 100%);
        color: var(--ink);
      }
      main {
        width: min(760px, calc(100% - 32px));
        margin: 48px auto;
        padding: 32px;
        border: 1px solid var(--border);
        border-radius: 20px;
        background: var(--card);
        box-shadow: 0 20px 50px rgba(29, 42, 56, 0.08);
      }
      h1 {
        margin: 0 0 8px;
        font-size: clamp(2rem, 4vw, 3rem);
      }
      p {
        margin: 0 0 24px;
        color: var(--muted);
        line-height: 1.5;
      }
      dl {
        margin: 0;
        display: grid;
        grid-template-columns: 180px 1fr;
        gap: 12px 20px;
      }
      dt {
        font-weight: 700;
      }
      dd {
        margin: 0;
        word-break: break-word;
        font-family: "Courier New", monospace;
      }
      .error {
        margin: 0 0 20px;
        padding: 14px 16px;
        border-radius: 12px;
        background: #fff0ec;
        border: 1px solid #efc1b1;
        color: #7a2408;
      }
      button {
        margin-top: 28px;
        border: 0;
        border-radius: 999px;
        padding: 14px 22px;
        font: inherit;
        font-weight: 700;
        color: #fffaf2;
        background: linear-gradient(135deg, var(--accent) 0%, var(--accent-dark) 100%);
        cursor: pointer;
      }
      button:disabled {
        cursor: not-allowed;
        opacity: 0.65;
      }
      .status {
        margin-top: 18px;
        font-size: 0.95rem;
        color: var(--muted);
      }
      .footer {
        margin-top: 28px;
        font-size: 0.9rem;
      }
      .footer code {
        font-family: "Courier New", monospace;
      }
      @media (max-width: 640px) {
        main { padding: 24px; }
        dl { grid-template-columns: 1fr; }
      }
    </style>
  </head>
  <body>
    <main>
      <h1>GitHub Actions Rerun Helper</h1>
      <p>Review the preserved execution context, then trigger the existing workflow_dispatch target without editing the current Discord report format.</p>
      ${errorMessage ? `<div class="error">${escapeHtml(errorMessage)}</div>` : ''}
      <dl>
        <dt>Repository</dt><dd>${escapeHtml(payload.repository)}</dd>
        <dt>Workflow</dt><dd>${escapeHtml(payload.workflowId)}</dd>
        <dt>Run Mode</dt><dd>${escapeHtml(payload.runMode)}</dd>
        <dt>TEST_ENV</dt><dd>${escapeHtml(payload.testEnv)}</dd>
        <dt>THREADS</dt><dd>${escapeHtml(payload.threads)}</dd>
        <dt>TAGS</dt><dd>${escapeHtml(payload.tags)}</dd>
        <dt>REF</dt><dd>${escapeHtml(payload.ref)}</dd>
      </dl>
      <button id="run-workflow">Run Workflow</button>
      <div class="status" id="status">Waiting for confirmation.</div>
      <div class="footer">Server requirement: set <code>RERUN_HELPER_GITHUB_TOKEN</code> before using this page.</div>
    </main>
    <script>
      const payload = ${payloadJson};
      const button = document.getElementById('run-workflow');
      const status = document.getElementById('status');

      button.addEventListener('click', async () => {
        button.disabled = true;
        status.textContent = 'Triggering workflow_dispatch...';

        try {
          const response = await fetch('/api/run', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ payload }),
          });
          const body = await response.json();
          if (!response.ok) {
            throw new Error(body.error || 'Dispatch failed');
          }

          status.innerHTML = 'Workflow dispatch accepted. Open <a href="' + body.actionsUrl + '" target="_blank" rel="noreferrer">GitHub Actions</a>.';
        } catch (error) {
          status.textContent = error.message;
          button.disabled = false;
        }
      });
    </script>
  </body>
</html>`;
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

    if (req.method === 'GET' && url.pathname === '/health') {
      return sendJson(res, 200, { ok: true });
    }

    if (req.method === 'GET' && url.pathname === '/') {
      try {
        const payload = validatePayload(decodePayload(url.searchParams.get('payload')));
        return sendHtml(res, 200, renderPage(payload));
      } catch (error) {
        const fallbackPayload = {
          repository: '',
          workflowId: 'tests.yml',
          runMode: 'basic',
          testEnv: '',
          threads: '',
          tags: '',
          ref: '',
        };
        return sendHtml(res, 400, renderPage(fallbackPayload, error.message));
      }
    }

    if (req.method === 'POST' && url.pathname === '/api/run') {
      const rawBody = await readRequestBody(req);
      const body = rawBody ? JSON.parse(rawBody) : {};
      const payload = validatePayload(body.payload || {});
      const result = await triggerWorkflowDispatch(payload);
      return sendJson(res, 200, result);
    }

    return sendJson(res, 404, { error: 'Not found' });
  } catch (error) {
    return sendJson(res, 500, { error: error.message || 'Unexpected server error' });
  }
});

server.listen(PORT, HOST, () => {
  process.stdout.write(`Rerun helper listening on http://${HOST}:${PORT}\n`);
});
