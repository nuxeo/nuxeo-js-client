#!/usr/bin/env node

const { buildSync } = require('esbuild');
const { readdirSync, statSync } = require('fs');
const path = require('path');

const buildDir = process.env.JS_BUILD_DIR || 'build';

// Recursively find all *.spec.js files under test/
const findSpecs = (dir) => {
  let results = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      // Skip wdio/ directory (WDIO specs are not part of the browser Mocha bundle)
      if (entry !== 'wdio') {
        results = results.concat(findSpecs(full));
      }
    } else if (entry.endsWith('.spec.js')) {
      results.push(full);
    }
  }
  return results;
};

const specFiles = findSpecs('test');

// Build a virtual entry point that requires all setup files and spec files
// in the same order as the old Browserify command.
const entryContents = [
  "require('./test/helpers/setup.js');",
  "require('./test/helpers/setup-browser.js');",
  "require('./test/helpers/setup-logging.js');",
  ...specFiles.map((f) => `require('./${f.replace(/\\/g, '/')}');`),
].join('\n');

buildSync({
  stdin: {
    contents: entryContents,
    resolveDir: process.cwd(),
  },
  bundle: true,
  format: 'iife',
  platform: 'browser',
  outfile: `${buildDir}/tests.js`,
  // Node-only test dependencies that cannot be bundled for the browser.
  // Tests using these are guarded by `isBrowser` checks and will be skipped.
  external: ['jsonwebtoken', 'content-disposition', 'crypto'],
  logLevel: 'warning',
});
