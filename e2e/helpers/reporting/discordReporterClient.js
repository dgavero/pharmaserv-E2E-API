import fs from 'node:fs';
import path from 'node:path';
import { REST, Routes } from 'discord.js';

const RUN_META_PATH = path.resolve('.discord-run.json');
const TOKEN = process.env.DISCORD_BOT_TOKEN;
const rest = TOKEN ? new REST({ version: '10' }).setToken(TOKEN) : null;

const messageQueue = [];
let flushing = false;
const pendingPosts = new Set();

function readThreadId() {
  try {
    const meta = JSON.parse(fs.readFileSync(RUN_META_PATH, 'utf-8'));
    return meta?.threadId || null;
  } catch {
    return null;
  }
}

function scheduleFlush() {
  if (flushing) return;
  flushing = true;
  setTimeout(() => void flushReports(), 100);
}

export function enqueueDiscordMessage(item) {
  const normalized = typeof item === 'string' ? { content: item } : item && item.content ? item : null;
  if (!normalized) return;
  messageQueue.push(normalized);
  scheduleFlush();
}

export async function flushReports() {
  try {
    const threadId = readThreadId();
    if (!threadId || !rest) {
      setTimeout(() => {
        flushing = false;
        scheduleFlush();
      }, 150);
      return;
    }

    while (messageQueue.length > 0) {
      const { content, filePath, extraNotice } = messageQueue.shift();
      let bodyContent = content;
      if (!filePath && extraNotice) {
        bodyContent = `${content}\n\n${extraNotice}`;
      }

      const options = { body: { content: bodyContent } };
      if (filePath && fs.existsSync(filePath)) {
        options.files = [{ name: path.basename(filePath), data: fs.readFileSync(filePath) }];
      }

      const postPromise = rest.post(Routes.channelMessages(threadId), options);
      pendingPosts.add(postPromise);
      await postPromise.finally(() => pendingPosts.delete(postPromise));
    }
  } finally {
    flushing = false;
    if (messageQueue.length > 0) scheduleFlush();
  }
}

export async function flushPendingReports() {
  await flushReports();
  if (pendingPosts.size > 0) {
    await Promise.all([...pendingPosts]);
  }
}
