/* eslint no-undef: 0 */
// Vite serves CJS as ESM — module.exports becomes the default export,
// but some versions need the namespace import pattern instead.
// Requires vite-plugin-commonjs in the Vite config to transform CJS require() calls.
const { default: Nuxeo } = await import('../../lib/index.js');

// Set globals expected by test files.
// Vite handles the "browser" field in package.json, so deps/ remapping works automatically.
globalThis.Nuxeo = Nuxeo;
globalThis.isBrowser = true;
globalThis.support = { readBlob: typeof FileReader !== 'undefined' };

// Base URL for the Nuxeo server — in browser mode, process.env is injected by Vite's define.
// Falls back to localhost default.
globalThis.baseURL = (typeof process !== 'undefined' && process.env && process.env.NUXEO_BASE_URL)
  || 'http://localhost:8080/nuxeo';
