'use strict';

const npa = require('npm-package-arg');
const { UsageError } = require('./errors');

const WINDOWS_RESERVED_NAMES = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;
const IDENTIFIER_PATTERN = /^[$_\p{ID_Start}][$\u200C\u200D_\p{ID_Continue}]*$/u;

function parsePackageSpec(rawSpec) {
  let parsed;

  try {
    parsed = npa(rawSpec);
  } catch (error) {
    throw new UsageError(`Invalid package spec "${rawSpec}": ${error.message}`, { cause: error });
  }

  if (!parsed.name || parsed.type !== 'version') {
    throw new UsageError(
      `Package spec must be an exact registry version, for example "${parsed.name || 'fuse.js'}@7.5.0".`,
    );
  }

  return {
    name: parsed.name,
    raw: rawSpec,
    version: parsed.fetchSpec,
  };
}

function packageBaseName(packageName) {
  return packageName.startsWith('@') ? packageName.slice(1).replace('/', '-') : packageName;
}

function defaultOutputName(packageName) {
  let baseName = packageBaseName(packageName)
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^[. -]+|[. -]+$/g, '');

  if (!baseName) {
    baseName = 'package';
  }

  if (WINDOWS_RESERVED_NAMES.test(baseName)) {
    baseName = `${baseName}-package`;
  }

  return `${baseName}.min.js`;
}

function inferGlobalName(packageName) {
  const unscopedName = packageName.includes('/') ? packageName.slice(packageName.lastIndexOf('/') + 1) : packageName;
  const brandName = unscopedName.replace(/\.js$/i, '');
  const words = brandName.split(/[^A-Za-z0-9]+/).filter(Boolean);
  let globalName = words
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join('');

  if (!globalName) {
    globalName = 'Package';
  }

  if (/^[0-9]/.test(globalName)) {
    globalName = `Package${globalName}`;
  }

  return globalName;
}

function validateGlobalName(globalName) {
  if (!IDENTIFIER_PATTERN.test(globalName)) {
    throw new UsageError(`Global name "${globalName}" is not a valid JavaScript identifier.`);
  }

  return globalName;
}

module.exports = {
  defaultOutputName,
  inferGlobalName,
  parsePackageSpec,
  validateGlobalName,
};