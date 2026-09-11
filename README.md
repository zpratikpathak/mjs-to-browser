# mjs-to-browser

Bundle an npm package into a minified browser script and expose its preferred export on `globalThis`.

## Usage

Run against any browser-compatible npm package without installing this tool globally:

```sh
npx mjs-to-browser package-name
```

This creates `package-name.min.js` in the current directory. The package's default export, or its module namespace when no default exists, is exposed through an inferred global name:

```html
<script src="./package-name.min.js"></script>
```

When no version is specified, the latest version is used. You can also request an exact version:

```sh
npx mjs-to-browser package-name@1.2.3
```

Explicit tags, ranges, aliases, git URLs, remote tarballs, local paths, and workspace specs are rejected.

## Examples

Bundle the latest Fuse.js release:

```sh
npx mjs-to-browser fuse.js
# Creates fuse.js.min.js and exposes globalThis.Fuse
```

Bundle an exact version under a custom global name and output path:

```sh
npx mjs-to-browser package-name@1.2.3 -o "vendor/package.js" --global PackageAPI
```

Scoped package names produce filesystem-safe output names:

```sh
npx mjs-to-browser @scope/my-lib@1.2.3
# Creates scope-my-lib.min.js and exposes globalThis.MyLib
```

## Options

```text
Usage: mjs-to-browser <name[@exact-version]> [options]

Options:
  -o, --output <path>  Output path (default: <package>.min.js)
      --global <name>  Browser global name (inferred by default)
      --force          Replace an existing output file
  -h, --help           Show this help
```

Existing output files are never replaced unless `--force` is provided.

## Supported packages

The generated script prefers a package's default export. If no default exists, it exposes the module namespace. ESM, CommonJS, and mixed-export packages are supported when esbuild can bundle their browser entry.

The initial release does not add Node.js polyfills or support native addons, runtime filesystem access, CSS/assets, package subpath selection, source maps, or configurable browser targets. Packages intended only for Node.js will fail with an esbuild diagnostic.

## Installation boundary

Each package is installed in an isolated temporary npm project with lifecycle scripts disabled, using `npm install --ignore-scripts`. The temporary project is removed after bundling. This prevents dependency install scripts from running, but generated third-party JavaScript remains untrusted and should be reviewed before loading it in a browser.

## Development

```sh
npm test
```

The default suite is fully offline. Registry smoke tests are opt-in:

```sh
MJS_TO_JS_NETWORK_TESTS=1 npm run test:network
```

## Author

- GitHub: [github.com/zpratikpathak](https://github.com/zpratikpathak/)
- Website: [pratikpathak.com](https://pratikpathak.com)