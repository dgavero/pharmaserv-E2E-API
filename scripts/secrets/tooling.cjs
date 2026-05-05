#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..', '..');
const toolsBinDir = path.join(repoRoot, '.tools', 'bin');
const isWindows = process.platform === 'win32';

function mapArch() {
  switch (os.arch()) {
    case 'x64':
      return 'amd64';
    case 'arm64':
      return 'arm64';
    default:
      throw new Error(`Unsupported architecture: ${os.arch()}`);
  }
}

function mapPlatform() {
  switch (process.platform) {
    case 'win32':
      return 'windows';
    case 'darwin':
      return 'darwin';
    case 'linux':
      return 'linux';
    default:
      throw new Error(`Unsupported platform: ${process.platform}`);
  }
}

function ensureToolsBinDir() {
  fs.mkdirSync(toolsBinDir, { recursive: true });
}

function getToolFilename(toolName) {
  return isWindows ? `${toolName}.exe` : toolName;
}

function getToolPath(toolName) {
  return path.join(toolsBinDir, getToolFilename(toolName));
}

function resolveToolCommand(toolName) {
  const localToolPath = getToolPath(toolName);
  return fs.existsSync(localToolPath) ? localToolPath : toolName;
}

module.exports = {
  ensureToolsBinDir,
  getToolPath,
  isWindows,
  mapArch,
  mapPlatform,
  repoRoot,
  resolveToolCommand,
  toolsBinDir,
};
