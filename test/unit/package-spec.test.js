'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  defaultOutputName,
  inferGlobalName,
  parsePackageSpec,
  validateGlobalName,
} = require('../../lib/package-spec');

test('accepts exact registry versions including scopes and prereleases', () => {
  assert.deepEqual(parsePackageSpec('fuse.js@7.5.0'), {
    name: 'fuse.js',
    raw: 'fuse.js@7.5.0',
    version: '7.5.0',
  });
  assert.equal(parsePackageSpec('@scope/my-lib@1.2.3-beta.1').version, '1.2.3-beta.1');
});

test('resolves bare registry package names through the latest tag', () => {
  assert.deepEqual(parsePackageSpec('fuse.js'), {
    name: 'fuse.js',
    raw: 'fuse.js@latest',
    version: 'latest',
  });
  assert.equal(parsePackageSpec('@scope/my-lib').raw, '@scope/my-lib@latest');
});

test('rejects non-exact and non-registry specs', () => {
  for (const spec of ['fuse.js@latest', 'fuse.js@*', 'fuse.js@^7', 'github:user/repo', './local-package']) {
    assert.throws(() => parsePackageSpec(spec), { name: 'UsageError' });
  }
});

test('derives deterministic output names', () => {
  assert.equal(defaultOutputName('fuse.js'), 'fuse.js.min.js');
  assert.equal(defaultOutputName('@scope/my-lib'), 'scope-my-lib.min.js');
  assert.equal(defaultOutputName('con'), 'con-package.min.js');
});

test('infers useful browser globals', () => {
  assert.equal(inferGlobalName('fuse.js'), 'Fuse');
  assert.equal(inferGlobalName('@scope/my-lib'), 'MyLib');
  assert.equal(inferGlobalName('3d-viewer'), 'Package3dViewer');
});

test('validates explicit JavaScript identifiers', () => {
  assert.equal(validateGlobalName('$Library_2'), '$Library_2');
  assert.equal(validateGlobalName('Éditeur'), 'Éditeur');
  assert.throws(() => validateGlobalName('my-library'), { name: 'UsageError' });
  assert.throws(() => validateGlobalName('2Library'), { name: 'UsageError' });
});