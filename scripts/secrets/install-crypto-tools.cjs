#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const https = require('node:https');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const {
  ensureToolsBinDir,
  getToolPath,
  isWindows,
  mapArch,
  mapPlatform,
  toolsBinDir,
} = require('./tooling.cjs');

const SOPS_VERSION = process.env.SOPS_VERSION || '3.10.2';
const AGE_VERSION = process.env.AGE_VERSION || '1.2.1';

function downloadFile(url, destinationPath) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        response.resume();
        downloadFile(response.headers.location, destinationPath).then(resolve, reject);
        return;
      }

      if (response.statusCode !== 200) {
        response.resume();
        reject(new Error(`Download failed (${response.statusCode}) for ${url}`));
        return;
      }

      const file = fs.createWriteStream(destinationPath);
      response.pipe(file);
      file.on('finish', () => file.close(resolve));
      file.on('error', reject);
    });

    request.on('error', reject);
  });
}

function chmodExecutable(targetPath) {
  if (!isWindows) {
    fs.chmodSync(targetPath, 0o755);
  }
}

function buildSopsUrl() {
  const platform = mapPlatform();
  const arch = mapArch();
  if (platform === 'windows') {
    return `https://github.com/getsops/sops/releases/download/v${SOPS_VERSION}/sops-v${SOPS_VERSION}.${arch}.exe`;
  }
  return `https://github.com/getsops/sops/releases/download/v${SOPS_VERSION}/sops-v${SOPS_VERSION}.${platform}.${arch}`;
}

function buildAgeUrl() {
  const platform = mapPlatform();
  const arch = mapArch();
  const extension = platform === 'windows' ? 'zip' : 'tar.gz';
  return `https://github.com/FiloSottile/age/releases/download/v${AGE_VERSION}/age-v${AGE_VERSION}-${platform}-${arch}.${extension}`;
}

function extractAgeArchive(archivePath, tempDir) {
  const platform = mapPlatform();

  if (platform === 'windows') {
    execFileSync(
      'powershell.exe',
      [
        '-NoProfile',
        '-Command',
        `Expand-Archive -LiteralPath '${archivePath.replace(/'/g, "''")}' -DestinationPath '${tempDir.replace(/'/g, "''")}' -Force`,
      ],
      { stdio: 'inherit' }
    );
    return;
  }

  execFileSync('tar', ['-xzf', archivePath, '-C', tempDir], { stdio: 'inherit' });
}

function findExtractedFile(baseDir, filename) {
  const stack = [baseDir];
  while (stack.length > 0) {
    const currentDir = stack.pop();
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }
      if (entry.isFile() && entry.name === filename) {
        return fullPath;
      }
    }
  }
  throw new Error(`Could not find ${filename} in extracted archive`);
}

async function installSops() {
  const targetPath = getToolPath('sops');
  const tempPath = path.join(os.tmpdir(), `sops-${Date.now()}-${path.basename(targetPath)}`);
  const url = buildSopsUrl();

  process.stdout.write(`Downloading sops from ${url}\n`);
  await downloadFile(url, tempPath);
  fs.copyFileSync(tempPath, targetPath);
  chmodExecutable(targetPath);
  fs.rmSync(tempPath, { force: true });
}

async function installAgeTools() {
  const agePath = getToolPath('age');
  const ageKeygenPath = getToolPath('age-keygen');
  const platform = mapPlatform();
  const archiveExtension = platform === 'windows' ? 'zip' : 'tar.gz';
  const archivePath = path.join(os.tmpdir(), `age-${Date.now()}.${archiveExtension}`);
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'age-tools-'));
  const url = buildAgeUrl();

  process.stdout.write(`Downloading age tools from ${url}\n`);
  await downloadFile(url, archivePath);
  extractAgeArchive(archivePath, tempDir);

  const ageFilename = isWindows ? 'age.exe' : 'age';
  const ageKeygenFilename = isWindows ? 'age-keygen.exe' : 'age-keygen';

  fs.copyFileSync(findExtractedFile(tempDir, ageFilename), agePath);
  fs.copyFileSync(findExtractedFile(tempDir, ageKeygenFilename), ageKeygenPath);
  chmodExecutable(agePath);
  chmodExecutable(ageKeygenPath);

  fs.rmSync(archivePath, { force: true });
  fs.rmSync(tempDir, { recursive: true, force: true });
}

async function main() {
  ensureToolsBinDir();
  process.stdout.write(`Installing local crypto tools into ${toolsBinDir}\n`);
  await installSops();
  await installAgeTools();
  process.stdout.write(`Installed:\n- ${getToolPath('sops')}\n- ${getToolPath('age')}\n- ${getToolPath('age-keygen')}\n`);
}

main().catch((error) => {
  process.stderr.write(`[install-crypto-tools] ${error.message}\n`);
  process.exit(1);
});
