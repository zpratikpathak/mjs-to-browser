# mjs-to-browser

Bundle an npm package into a minified browser script and expose its preferred export on `globalThis`.

## Usage

Run without installing globally:

```sh
npx mjs-to-browser fuse.js
```

This creates `fuse.js.min.js` in the current directory and exposes `globalThis.Fuse`:

```html
<script src="./fuse.js.min.js"></script>
<script>
  const index = new Fuse(items, { keys: ['title'] });
</script>
```

When no version is specified, the latest version is used. You can also request an exact version:

```sh
npx mjs-to-browser fuse.js@7.5.0
```

Explicit tags, ranges, aliases, git URLs, remote tarballs, local paths, and workspace specs are rejected.

## Options

```text
Usage: mjs-to-browser <name[@exact-version]> [options]

Options:
  -o, --output <path>  Output path (default: <package>.min.js)
      --global <name>  Browser global name (inferred by default)
      --force          Replace an existing output file
  -h, --help           Show this help
```

Scoped package names produce filesystem-safe output names:

```sh
npx mjs-to-browser @scope/my-lib@1.2.3
# Creates scope-my-lib.min.js and exposes globalThis.MyLib
```

Override either inferred value when a package uses different branding:

```sh
npx mjs-to-browser package-name@1.2.3 -o "vendor/package.js" --global PackageAPI
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