#!/usr/bin/env node
'use strict';

const { parseCliArgs, HELP_TEXT } = require('../lib/cli');
const { CliError } = require('../lib/errors');
const { run } = require('../lib/run');

async function main(args = process.argv.slice(2)) {
  const abortController = new AbortController();
  let signalExitCode;
  const interrupt = () => {
    signalExitCode = 130;
    abortController.abort();
  };
  const terminate = () => {
    signalExitCode = 143;
    abortController.abort();
  };

  process.once('SIGINT', interrupt);
  process.once('SIGTERM', terminate);

  try {
    const options = parseCliArgs(args);
    if (options.help) {
      console.log(HELP_TEXT);
      return;
    }

    const result = await run({ ...options, signal: abortController.signal });
    console.log(`Created ${result.outputPath}`);
    console.log(`Browser global: ${result.globalName}`);
  } catch (error) {
    if (signalExitCode) {
      process.exitCode = signalExitCode;
      return;
    }

    const cliError = error instanceof CliError ? error : new CliError(error.message || String(error));
    console.error(`Error: ${cliError.message}`);
    if (cliError.exitCode === 2) console.error(`\n${HELP_TEXT}`);
    process.exitCode = cliError.exitCode;
  } finally {
    process.removeListener('SIGINT', interrupt);
    process.removeListener('SIGTERM', terminate);
  }
}

void main();