'use strict';

const esbuild = require('esbuild');
const { CliError } = require('./errors');

function virtualEntry(packageName, globalName) {
  const packageLiteral = JSON.stringify(packageName);
  const globalLiteral = JSON.stringify(globalName);

  return `import * as packageNamespace from ${packageLiteral};
const exposedValue = Object.prototype.hasOwnProperty.call(packageNamespace, "default")
  ? Reflect.get(packageNamespace, "default")
  : packageNamespace;
globalThis[${globalLiteral}] = exposedValue;`;
}

function formatBuildError(error) {
  const diagnostic = error.errors?.[0];
  if (!diagnostic) {
    return error.message || String(error);
  }

  const location = diagnostic.location;
  const prefix = location ? `${location.file || 'entry'}:${location.line}:${location.column}: ` : '';
  const notes = diagnostic.notes?.map((note) => note.text).filter(Boolean).slice(0, 2) || [];
  return `${prefix}${diagnostic.text}${notes.length ? `\n${notes.join('\n')}` : ''}`;
}

async function bundlePackage(packageName, globalName, projectDir, { buildImpl = esbuild.build } = {}) {
  try {
    const result = await buildImpl({
      bundle: true,
      format: 'iife',
      legalComments: 'none',
      minify: true,
      platform: 'browser',
      stdin: {
        contents: virtualEntry(packageName, globalName),
        loader: 'js',
        resolveDir: projectDir,
        sourcefile: 'mjs-to-js-entry.js',
      },
      target: ['es2020'],
      write: false,
    });

    const output = result.outputFiles?.[0];
    if (!output) {
      throw new Error('esbuild returned no JavaScript output.');
    }
    return output.text;
  } catch (error) {
    throw new CliError(`Could not bundle ${packageName}: ${formatBuildError(error)}`, { cause: error });
  }
}

module.exports = { bundlePackage, formatBuildError, virtualEntry };