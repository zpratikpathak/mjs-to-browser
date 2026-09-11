'use strict';

const { parseArgs } = require('node:util');
const { UsageError } = require('./errors');

const HELP_TEXT = `Usage: mjs-to-js <name@exact-version> [options]

Options:
  -o, --output <path>  Output path (default: <package>.min.js)
      --global <name>  Browser global name (inferred by default)
      --force          Replace an existing output file
  -h, --help           Show this help`;

function parseCliArgs(args) {
  let parsed;

  try {
    parsed = parseArgs({
      args,
      allowPositionals: true,
      options: {
        force: { type: 'boolean', default: false },
        global: { type: 'string' },
        help: { type: 'boolean', short: 'h', default: false },
        output: { type: 'string', short: 'o' },
      },
      strict: true,
    });
  } catch (error) {
    throw new UsageError(error.message, { cause: error });
  }

  if (parsed.values.help) {
    return { help: true };
  }

  if (parsed.positionals.length !== 1) {
    throw new UsageError('Expected exactly one package spec: <name@exact-version>.');
  }

  return {
    force: parsed.values.force,
    global: parsed.values.global,
    help: false,
    output: parsed.values.output,
    packageSpec: parsed.positionals[0],
  };
}

module.exports = { HELP_TEXT, parseCliArgs };