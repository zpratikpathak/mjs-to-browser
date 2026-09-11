'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const esbuild = require('esbuild');
const { CliError } = require('./errors');

const PROJECT_URL = 'https://github.com/zpratikpathak';

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

function isPackageEntryResolutionError(error, packageName) {
  return error.errors?.some((diagnostic) => (
    diagnostic.text === `Could not resolve "${packageName}"`
    && diagnostic.location?.file.replace(/\\/g, '/').endsWith('/mjs-to-js-entry.js')
  ));
}

async function bundleBanner(packageName, projectDir) {
  const manifestPath = path.join(projectDir, 'node_modules', ...packageName.split('/'), 'package.json');
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  const safeVersion = String(manifest.version).replace(/\*\//g, '* /').replace(/[\r\n]+/g, ' ');
  return `/*
 * Package: ${packageName}
 * Version: ${safeVersion}
 * Created using npx mjs-to-browser
 * ${PROJECT_URL}
 * Know about the author, run "npx pratikpathak -y"
 */`;
}

async function bundlePackage(packageName, globalName, projectDir, { buildImpl = esbuild.build } = {}) {
  try {
    const [banner, result] = await Promise.all([bundleBanner(packageName, projectDir), buildImpl({
      bundle: true,
      format: 'iife',
      legalComments: 'none',
      logLevel: 'silent',
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
    })]);

    const output = result.outputFiles?.[0];
    if (!output) {
      throw new Error('esbuild returned no JavaScript output.');
    }
    return `${banner}\n${output.text}`;
  } catch (error) {
    if (isPackageEntryResolutionError(error, packageName)) {
      throw new CliError(
        `Package "${packageName}" was installed, but it has no usable JavaScript entry point. Check that this is the intended npm package and that it supports browser bundling.`,
        { cause: error },
      );
    }
    throw new CliError(`Could not bundle ${packageName}: ${formatBuildError(error)}`, { cause: error });
  }
}

module.exports = {
  bundleBanner,
  bundlePackage,
  formatBuildError,
  isPackageEntryResolutionError,
  virtualEntry,
};