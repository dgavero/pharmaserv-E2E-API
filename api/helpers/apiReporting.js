import { sendAPIFailure } from '../../helpers/discord/discordBot.js';

const apiMessageQueue = [];
let flushScheduled = false;
const FLUSH_DELAY = 100;

function enqueueMessage(msg) {
  apiMessageQueue.push(msg);
  scheduleFlush();
}

function scheduleFlush() {
  if (flushScheduled) return;
  flushScheduled = true;
  setTimeout(async () => {
    flushScheduled = false;
    await flushApiReports();
  }, FLUSH_DELAY);
}

export async function flushApiReports() {
  while (apiMessageQueue.length > 0) {
    const msg = apiMessageQueue.shift();
    try {
      await msg();
    } catch (err) {
      console.error('[API Reporter] Failed to flush message', err);
    }
  }
}

export function extractApiFailureSnippet(result) {
  const stripAnsi = (s) => (s || '').replace(/\u001b\[[0-9;]*m/g, '');
  const errs =
    Array.isArray(result.errors) && result.errors.length
      ? result.errors
      : result.error
        ? [result.error]
        : [];

  const msgs = errs.map((e) => stripAnsi(e.message || '').trim()).filter(Boolean);
  if (!msgs.length) return '';

  for (const msg of msgs) {
    const errorLine = (msg.match(/^Error:.*$/m) || [])[0];
    const expectedLine = (msg.match(/^(?:Expected:.*)$/m) || [])[0];
    const receivedLine = (msg.match(/^(?:Received:.*)$/m) || [])[0];
    const parts = [errorLine, expectedLine, receivedLine].filter(Boolean);
    if (parts.length) return parts.join('\n');
  }

  for (const msg of msgs) {
    const idx = msg.indexOf('Expected:');
    if (idx !== -1) {
      const slice = msg.slice(idx);
      const match = slice.match(/^(Expected:[\s\S]*?)(?:\n{2,}|\n\s*at\s|\n\s*✓|\s*$)/m);
      return match && match[1] ? match[1] : slice;
    }
  }

  return msgs[0].split('\n').find((line) => line.trim().length) || msgs[0];
}

export function enqueueApiFailure({ title, snippet }) {
  enqueueMessage(async () => {
    await sendAPIFailure({ title, snippet });
  });
}
