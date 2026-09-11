'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { bundlePackage } = require('./bundle');
const { CliError } = require('./errors');
const { installPackage } = require('./install');
const {
  defaultOutputName,
  inferGlobalName,
  parsePackageSpec,
  validateGlobalName,
} = require('./package-spec');

async function destinationExists(outputPath, fsImpl) {
  try {
    await fsImpl.access(outputPath);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw new CliError(`Could not inspect output path "${outputPath}": ${error.message}`, { cause: error });
  }
}

async function run(options, dependencies = {}) {
  const fsImpl = dependencies.fsImpl || fs;
  const installImpl = dependencies.installImpl || installPackage;
  const bundleImpl = dependencies.bundleImpl || bundlePackage;
  const cwd = dependencies.cwd || process.cwd();
  const packageSpec = parsePackageSpec(options.packageSpec);
  const globalName = options.global
    ? validateGlobalName(options.global)
    : inferGlobalName(packageSpec.name);
  const outputPath = path.resolve(cwd, options.output || defaultOutputName(packageSpec.name));

  if (!options.force && await destinationExists(outputPath, fsImpl)) {
    throw new CliError(`Output file already exists: ${outputPath}\nUse --force to replace it.`);
  }

  let tempDir;
  let operationError;
  try {
    tempDir = await installImpl(packageSpec.raw, { signal: options.signal });
    const code = await bundleImpl(packageSpec.name, globalName, tempDir);
    await fsImpl.mkdir(path.dirname(outputPath), { recursive: true });
    await fsImpl.writeFile(outputPath, code, {
      encoding: 'utf8',
      flag: options.force ? 'w' : 'wx',
    });
    return { globalName, outputPath, packageSpec };
  } catch (error) {
    operationError = error;
    if (error instanceof CliError) throw error;
    if (error.code === 'EEXIST' && path.resolve(error.path) === outputPath) {
      throw new CliError(`Output file already exists: ${outputPath}\nUse --force to replace it.`, { cause: error });
    }
    throw new CliError(`Could not write output "${outputPath}": ${error.message}`, { cause: error });
  } finally {
    if (tempDir) {
      try {
        await fsImpl.rm(tempDir, { force: true, recursive: true });
      } catch (error) {
        if (!operationError) {
          throw new CliError(`Could not remove temporary project "${tempDir}": ${error.message}`, { cause: error });
        }
      }
    }
  }
}

module.exports = { destinationExists, run };