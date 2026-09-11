'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { run } = require('../../lib/run');

const networkEnabled = process.env.MJS_TO_JS_NETWORK_TESTS === '1';

for (const testCase of [
  { packageSpec: 'fuse.js@7.5.0', output: 'fuse.js.min.js', globalName: 'Fuse' },
  { packageSpec: '@floating-ui/dom@1.7.4', output: 'floating-ui.js', globalName: 'FloatingUI' },
]) {
  test(`bundles ${testCase.packageSpec} from the registry`, { skip: !networkEnabled }, async () => {
    const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'mjs-to-js-network-test-'));
    try {
      const result = await run({
        force: false,
        global: testCase.globalName,
        output: testCase.output,
        packageSpec: testCase.packageSpec,
      }, { cwd });
      const stat = await fs.stat(result.outputPath);
      assert.ok(stat.size > 0);
    } finally {
      await fs.rm(cwd, { force: true, recursive: true });
    }
  });
}