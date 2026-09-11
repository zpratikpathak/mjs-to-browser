'use strict';

const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const spawn = require('cross-spawn');
const { CliError } = require('./errors');

const INSTALL_ARGS = [
  'install',
  '--ignore-scripts',
  '--no-audit',
  '--no-fund',
  '--no-save',
  '--package-lock=false',
  '--workspaces=false',
];

function collectOutput(stream, chunks) {
  if (stream) {
    stream.on('data', (chunk) => chunks.push(chunk));
  }
}

function usefulOutput(chunks) {
  return Buffer.concat(chunks)
    .toString('utf8')
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .slice(-4)
    .join('\n');
}

function runNpm(rawSpec, tempDir, { signal, spawnImpl = spawn } = {}) {
  return new Promise((resolve, reject) => {
    const output = [];
    let child;

    try {
      child = spawnImpl('npm', [...INSTALL_ARGS, rawSpec], {
        cwd: tempDir,
        env: process.env,
        shell: false,
        signal,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (error) {
      reject(new CliError(`Could not start npm: ${error.message}`, { cause: error }));
      return;
    }

    collectOutput(child.stdout, output);
    collectOutput(child.stderr, output);
    child.once('error', (error) => {
      reject(new CliError(`Could not start npm: ${error.message}`, { cause: error }));
    });
    child.once('close', (code, childSignal) => {
      if (code === 0) {
        resolve();
        return;
      }

      const detail = usefulOutput(output);
      const status = childSignal ? `signal ${childSignal}` : `exit code ${code}`;
      reject(new CliError(`npm install failed (${status})${detail ? `:\n${detail}` : '.'}`));
    });
  });
}

async function installPackage(rawSpec, options = {}) {
  const fsImpl = options.fsImpl || fs;
  let tempDir;

  try {
    tempDir = await fsImpl.mkdtemp(path.join(options.tempRoot || os.tmpdir(), 'mjs-to-js-'));
  } catch (error) {
    throw new CliError(`Could not create temporary project: ${error.message}`, { cause: error });
  }

  try {
    await fsImpl.writeFile(
      path.join(tempDir, 'package.json'),
      `${JSON.stringify({ name: 'mjs-to-js-temporary-project', private: true })}\n`,
      'utf8',
    );
    await runNpm(rawSpec, tempDir, options);
    return tempDir;
  } catch (error) {
    try {
      await fsImpl.rm(tempDir, { force: true, recursive: true });
    } catch {
      // Preserve the install failure, which is more useful than a cleanup failure.
    }
    if (error instanceof CliError) throw error;
    throw new CliError(`Could not prepare temporary project: ${error.message}`, { cause: error });
  }
}

module.exports = { INSTALL_ARGS, installPackage, runNpm };