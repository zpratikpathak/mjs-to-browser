'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { run } = require('../../lib/run');

async function workspace() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'mjs-to-browser-run-test-'));
}

test('refuses an existing destination before installation', async () => {
  const cwd = await workspace();
  const outputPath = path.join(cwd, 'fixture.min.js');
  await fs.writeFile(outputPath, 'existing');
  let installed = false;

  await assert.rejects(
    () => run(
      { force: false, output: 'fixture.min.js', packageSpec: 'fixture@1.0.0' },
      { cwd, installImpl: async () => { installed = true; } },
    ),
    /already exists/,
  );
  assert.equal(installed, false);
  assert.equal(await fs.readFile(outputPath, 'utf8'), 'existing');
  await fs.rm(cwd, { force: true, recursive: true });
});

test('force replaces output and cleans the temporary project', async () => {
  const cwd = await workspace();
  const tempDir = path.join(cwd, 'temporary-project');
  await fs.mkdir(tempDir);
  await fs.writeFile(path.join(cwd, 'bundle.js'), 'old');

  const result = await run(
    { force: true, global: 'Fixture', output: 'bundle.js', packageSpec: 'fixture@1.0.0' },
    {
      bundleImpl: async () => 'globalThis.Fixture = 42;',
      cwd,
      installImpl: async () => tempDir,
    },
  );

  assert.equal(await fs.readFile(result.outputPath, 'utf8'), 'globalThis.Fixture = 42;');
  await assert.rejects(() => fs.access(tempDir), { code: 'ENOENT' });
  await fs.rm(cwd, { force: true, recursive: true });
});

test('cleans the temporary project after a bundle failure', async () => {
  const cwd = await workspace();
  const tempDir = path.join(cwd, 'temporary-project');
  await fs.mkdir(tempDir);

  await assert.rejects(
    () => run(
      { force: false, packageSpec: 'fixture@1.0.0' },
      {
        bundleImpl: async () => { throw new Error('bundle failed'); },
        cwd,
        installImpl: async () => tempDir,
      },
    ),
    /bundle failed/,
  );
  await assert.rejects(() => fs.access(tempDir), { code: 'ENOENT' });
  await fs.rm(cwd, { force: true, recursive: true });
});

test('cleans the temporary project after an output failure', async () => {
  const cwd = await workspace();
  const tempDir = path.join(cwd, 'temporary-project');
  const blockedParent = path.join(cwd, 'not-a-directory');
  await fs.mkdir(tempDir);
  await fs.writeFile(blockedParent, 'file');

  await assert.rejects(
    () => run(
      { force: false, output: 'not-a-directory/bundle.js', packageSpec: 'fixture@1.0.0' },
      {
        bundleImpl: async () => 'globalThis.Fixture = 42;',
        cwd,
        installImpl: async () => tempDir,
      },
    ),
    /Could not (inspect|write) output/,
  );
  await assert.rejects(() => fs.access(tempDir), { code: 'ENOENT' });
  await fs.rm(cwd, { force: true, recursive: true });
});