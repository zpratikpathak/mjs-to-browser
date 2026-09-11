'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { parseCliArgs } = require('../../lib/cli');

test('parses package and command options', () => {
  assert.deepEqual(
    parseCliArgs(['fuse.js@7.5.0', '-o', 'dist/fuse.js', '--global', 'FuseSearch', '--force']),
    {
      force: true,
      global: 'FuseSearch',
      help: false,
      output: 'dist/fuse.js',
      packageSpec: 'fuse.js@7.5.0',
    },
  );
});

test('handles help without requiring a package', () => {
  assert.deepEqual(parseCliArgs(['--help']), { help: true });
});

test('rejects missing, extra, and unknown arguments', () => {
  assert.throws(() => parseCliArgs([]), { name: 'UsageError' });
  assert.throws(() => parseCliArgs(['one@1.0.0', 'two@2.0.0']), { name: 'UsageError' });
  assert.throws(() => parseCliArgs(['one@1.0.0', '--unknown']), { name: 'UsageError' });
});