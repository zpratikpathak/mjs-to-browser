'use strict';

const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { PassThrough } = require('node:stream');
const test = require('node:test');
const { INSTALL_ARGS, installPackage, runNpm } = require('../../lib/install');

function childProcess({ code = 0, error, stderr = '' } = {}) {
  const child = new EventEmitter();
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();

  queueMicrotask(() => {
    if (stderr) child.stderr.end(stderr);
    if (error) child.emit('error', error);
    else child.emit('close', code, null);
  });
  return child;
}

test('spawns npm with fixed arguments and no shell', async () => {
  let invocation;
  const spawnImpl = (command, args, options) => {
    invocation = { command, args, options };
    return childProcess();
  };

  await runNpm('@scope/pkg@1.2.3', 'C:\\Temp\\project path', { spawnImpl });

  assert.equal(invocation.command, 'npm');
  assert.deepEqual(invocation.args, [...INSTALL_ARGS, '@scope/pkg@1.2.3']);
  assert.equal(invocation.options.cwd, 'C:\\Temp\\project path');
  assert.equal(invocation.options.shell, false);
});

test('reports useful npm failures', async () => {
  const spawnImpl = () => childProcess({ code: 1, stderr: 'npm error package not found\n' });
  await assert.rejects(() => runNpm('missing@1.0.0', 'temp', { spawnImpl }), /package not found/);
});

test('removes the temporary project when installation fails', async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'mjs-to-js-test-'));
  const spawnImpl = () => childProcess({ code: 1 });

  await assert.rejects(() => installPackage('missing@1.0.0', { spawnImpl, tempRoot }));
  assert.deepEqual(await fs.readdir(tempRoot), []);
  await fs.rm(tempRoot, { force: true, recursive: true });
});