'use strict';

class CliError extends Error {
  constructor(message, { exitCode = 1, cause } = {}) {
    super(message, { cause });
    this.name = 'CliError';
    this.exitCode = exitCode;
  }
}

class UsageError extends CliError {
  constructor(message, options = {}) {
    super(message, { ...options, exitCode: 2 });
    this.name = 'UsageError';
  }
}

module.exports = { CliError, UsageError };