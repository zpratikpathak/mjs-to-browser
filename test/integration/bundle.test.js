'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const { bundlePackage } = require('../../lib/bundle');

async function fixtureProject(fixtureName) {
  const projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mjs-to-browser-bundle-test-'));
  const packageDir = path.join(projectDir, 'node_modules', `fixture-${fixtureName}`);
  await fs.mkdir(path.dirname(packageDir), { recursive: true });
  await fs.cp(path.join(__dirname, '..', 'fixtures', fixtureName), packageDir, { recursive: true });
  return projectDir;
}

async function bundledGlobal(fixtureName) {
  const projectDir = await fixtureProject(fixtureName);
  try {
    const code = await bundlePackage(`fixture-${fixtureName}`, 'Fixture', projectDir);
    const context = {};
    vm.runInNewContext(code, context);
    return context.Fixture;
  } finally {
    await fs.rm(projectDir, { force: true, recursive: true });
  }
}

test('exposes an ESM default export', async () => {
  const fixture = await bundledGlobal('esm-default');
  assert.equal(fixture('world'), 'Hello, world');
});

test('exposes an ESM namespace when there is no default', async () => {
  const fixture = await bundledGlobal('esm-namespace');
  assert.equal(fixture.answer, 42);
  assert.equal(fixture.double(4), 8);
});

test('exposes a CommonJS module value', async () => {
  const fixture = await bundledGlobal('commonjs');
  assert.equal(fixture(2, 3), 5);
});

test('prefers the default export for mixed modules', async () => {
  assert.equal(await bundledGlobal('mixed'), 'preferred-default');
});