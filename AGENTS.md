# Agent Development Guide

## Project Overview

This is the **Nuxeo JavaScript Client** (`nuxeo` on npm), a JavaScript library for interacting with the Nuxeo Platform REST API. It runs on Node.js, browsers, and React Native. The library version is 4.x, published under the Apache 2.0 license.

## Language and Runtime

- **JavaScript (ES6+)** -- no TypeScript
- Node.js >= 14
- No `async`/`await` -- the codebase uses **Promise chains** (`.then()` / `.catch()`) exclusively
- **CommonJS** module system (`require` / `module.exports`) -- no ES modules (`import`/`export`)

## Backward Compatibility

- **Never** introduce `async`/`await`, ES modules, or TypeScript without explicit request
- **Never** break the existing public API surface (class names, method signatures, option names)
- When deprecating a method, keep the old one and add a `@deprecated` JSDoc tag
- Ensure all existing code paths use the new methods internally after deprecation

## Project Structure

```
lib/                        # Source code
  index.js                  # Main entry point (Node.js) -- assembles and exports all modules
  index-browserify.js       # Browser entry point -- merges existing window.Nuxeo, then assigns library
  nuxeo.js                  # Core Nuxeo client class
  base.js                   # Base class with shared options (schemas, enrichers, headers, timeouts, etc.)
  document.js               # Document model with CRUD, permissions, blobs, workflows, and more
  repository.js             # Repository API (fetch, create, update, delete, query)
  operation.js              # Automation operation execution
  request.js                # Low-level REST request builder
  blob.js                   # Blob wrapper (simple data class, does NOT extend Base)
  server-version.js         # Server version parsing and comparison (eq, gt, lt, gte, lte)
  nuxeo-versions.js         # Known Nuxeo version constants (deprecated since 3.5.0)
  auth/                     # Authentication
    auth.js                 # Authenticator registry and built-in authenticators (basic, token, bearerToken, portal)
    oauth2.js               # OAuth2 flow helpers (authorization URL, token exchange, refresh)
  unmarshallers/
    unmarshallers.js         # Unmarshaller registry -- converts JSON responses to typed objects
  upload/                   # Batch upload
    batch.js                # BatchUpload manager (uses promise-queue for concurrency)
    blob.js                 # BatchBlob (simple data class, does NOT extend Base)
  user/                     # User management (Users manager + User model)
  group/                    # Group management (Groups manager + Group model)
  directory/                # Directory management (Directory manager + DirectoryEntry model)
  workflow/                 # Workflow management (Workflows manager + Workflow/Task models)
  deps/                     # Platform abstraction layer (see "Multi-Platform Support")
    fetch.js / fetch-browser.js / fetch-react-native.js
    promise.js / promise-browser.js
    form-data.js / form-data-browser.js
    constants.js            # Shared constants (enricher names, depth values)
    utils/                  # join.js, encodePath.js, base64.js, buffer.js, flatten.js

test/                       # Integration tests (require a live Nuxeo server)
  helpers/                  # Test setup files
    setup.js                # Chai + dirty-chai initialization
    setup-node.js           # Node.js globals (Nuxeo, baseURL, expect, isBrowser)
    setup-browser.js        # Browser globals (Nuxeo, baseURL, expect, isBrowser, support)
    setup-logging.js        # Logging setup
    blob-helper.js          # Blob test utilities
  *.spec.js                 # Test files (one per module)
  <subdir>/*.spec.js        # Subdirectory-specific tests (user/, group/, directory/, workflow/)

ci/                         # CI/CD infrastructure
  Jenkinsfiles/             # Jenkins pipeline definitions (build.groovy, release.groovy)
  helm/                     # Helm charts for deploying test Nuxeo instances
  docker/                   # Docker configs for test Nuxeo images
dist/                       # Built output (generated, gitignored)
examples/                   # Example usage with Express server + OAuth2 demo
bin/                        # Build scripts (build-dist.js copies lib/ to dist/)
```

## Architecture and Key Patterns

### Class Hierarchy

All API, model, and manager classes extend `Base`, which provides shared options propagation:

```
Base (schemas, enrichers, fetchProperties, translateProperties, headers, depth, timeouts)
  +-- Nuxeo (client entry point, HTTP layer, factory methods)
  +-- Repository, Operation, Request (API builders)
  +-- Document, User, Group, DirectoryEntry, Workflow, Task (models)
  +-- Users, Groups, Directory, Workflows (managers)
  +-- BatchUpload (upload manager)
```

Note: `Blob` and `BatchBlob` are simple data classes that do **not** extend `Base`.

### Model Class Variations

Not all model classes follow the same internal pattern. Key differences:

| Class          | Parent ref stored as           | Has `_dirtyProperties` | Has `set()`/`get()` |
|----------------|-------------------------------|------------------------|---------------------|
| Document       | `this._nuxeo`, `this._repository` | Yes                 | Yes                 |
| User           | `this._users` (Users manager)  | Yes                    | Yes                 |
| Group          | `this._groups` (Groups manager)| **No**                 | **No**              |
| DirectoryEntry | `this._directory` (Directory manager) | Yes             | Yes                 |
| Workflow       | `this._nuxeo`                  | **No** (read-only)     | **No**              |
| Task           | `this._nuxeo`                  | **No** (uses `variable()`) | **No** (has `variable()`) |

All model constructors follow the same skeleton: `super(opts)` then `extend(true, this, json)`.

### Fluent Builder Pattern

All API classes use a **fluent builder** pattern where setter methods return `this`:

```js
nuxeo.repository()
  .schemas(['dublincore'])
  .enricher('document', 'acls')
  .fetch('/default-domain')
  .then((doc) => { /* ... */ });
```

### Options Propagation

Options flow top-down through `_computeOptions(opts)` in `Base`. This method deep-merges `this._baseOptions` with the provided `opts`, but **does not merge** `schemas`, `enrichers`, `fetchProperties`, `translateProperties`, and `headers` -- these are overridden entirely if provided in `opts`.

Always use `extend(true, {}, defaults, opts)` for deep merging (via the `extend` package).

### Registry Pattern

Two registries are used for extensibility:
- **Authenticators**: `Nuxeo.registerAuthenticator(method, authenticator)` -- maps auth method names to handler objects
- **Unmarshallers**: `Nuxeo.registerUnmarshaller(entityType, unmarshaller)` -- maps Nuxeo entity types to functions that convert JSON responses into typed JS objects (e.g., `Document`, `User`)

Registered unmarshallers: `document`, `documents`, `workflow`, `workflows`, `task`, `tasks`, `directoryEntry`, `directoryEntries`, `user`, `group`. Note: there are no `users` or `groups` (plural) unmarshallers -- listing users/groups returns raw JSON.

### Dirty Property Tracking

`Document`, `User`, and `DirectoryEntry` track changes via `_dirtyProperties`. The `set()` method accumulates changes, and `save()` sends only the dirty properties to the server. `Group`, `Workflow`, and `Task` do **not** use dirty tracking.

### Error Handling

The codebase uses no custom error classes. Errors are native `Error` objects with an attached `response` property:

```js
// In Nuxeo#http() -- any non-2xx status:
const error = new Error(res.statusText);
error.response = res; // the full fetch Response object
reject(error);
```

Special behavior for **401 responses**: if the authenticator supports refresh (`canRefreshAuthentication()` returns true), the client automatically attempts to refresh authentication (e.g., OAuth2 token refresh) before rejecting.

### Private Members Convention

Private/internal members are prefixed with underscore (`_nuxeo`, `_baseOptions`, `_computeOptions`, etc.). The ESLint config allows `no-underscore-dangle`. The `toJSON()` method in `Base` strips all `_`-prefixed keys.

## Code Style and Conventions

### ESLint

- Extends `airbnb-base` (ESLint v8)
- Max line length: **120** characters
- Arrow parens: always required (`(x) => x`)
- Arrow body style: `as-needed` with `requireReturnForObjectLiteral`
- `no-underscore-dangle`: off (underscored privates are used throughout)
- `no-param-reassign`: error, but property mutation is allowed (`{ props: false }`)
- `class-methods-use-this`: off

### Naming

- **camelCase** for variables, functions, methods, and file names
- **PascalCase** for class names
- **UPPER_SNAKE_CASE** for constants
- File names match the exported class/module in lowercase (e.g., `document.js` exports `Document`)

### General Rules

- Use `const` by default; use `let` only when reassignment is needed; never use `var`
- Use ES6 class syntax for all classes
- Use arrow functions for callbacks and inline functions
- Destructure where it improves clarity
- Always provide default parameter values (`opts = {}`)
- Deep-clone options with `extend(true, {}, ...)` to avoid mutation
- Return `this` from setter/builder methods for fluent chaining
- All asynchronous methods return Promises -- use `.then()` / `.catch()`, never `async`/`await`

### JSDoc

All public classes and methods must have JSDoc comments with:
- `@param` with type and description
- `@returns` with type and description
- `@example` where appropriate
- `@deprecated` with version and replacement when deprecating

## Multi-Platform Support

The library runs on three platforms: **Node.js**, **Browser**, and **React Native**. Platform-specific behavior is abstracted via the `lib/deps/` directory.

`package.json` uses the `"browser"` and `"react-native"` fields to swap `deps/` modules at bundle time:

| Module                       | Node.js                  | Browser                            | React Native                    |
|------------------------------|--------------------------|------------------------------------|---------------------------------|
| `deps/fetch.js`              | `node-fetch`             | `whatwg-fetch` (polyfill)          | global `fetch`                  |
| `deps/promise.js`            | Native `Promise`         | `es6-promise` polyfill + native    | Native `Promise` (same as Node) |
| `deps/form-data.js`          | `form-data` package      | Native `FormData`                  | Node.js `form-data` (not swapped) |
| `deps/utils/buffer.js`       | Native `Buffer`          | `buffer` package                   | Native `Buffer` (not swapped)   |

The `"browser"` field also remaps `promise-queue` to `promise-queue/lib/index.js`.

### Rules for Platform-Specific Code

- **Never** import platform-specific APIs (e.g., `fs`, `window`, `navigator`) directly in `lib/` files
- Always go through the `deps/` abstraction layer
- When adding a new platform-dependent feature, create a file pair: `deps/foo.js` (Node) and `deps/foo-browser.js` (Browser), then add the mapping to `package.json`'s `"browser"` field
- If React Native needs different behavior, also add a `deps/foo-react-native.js` and map it in the `"react-native"` field

## Nuxeo Platform Concepts

Agents working on this codebase should understand these Nuxeo server concepts:

- **Document**: The core entity. Has a `uid`, `path`, `type`, `facets`, and `properties` organized by schemas
- **Schema**: A named set of properties (e.g., `dublincore` provides `dc:title`, `dc:description`). Requested via the `schemas` option which maps to the `properties` HTTP header
- **Enricher**: Server-side content enrichment that adds `contextParameters` to responses (e.g., ACLs, permissions, renditions). Requested via `enrichers-<entity>` headers
- **Fetch Properties**: Controls which referenced properties are resolved. Requested via `fetch-<entity>` headers
- **Translate Properties**: Controls which properties are translated. Requested via `translate-<entity>` headers
- **Operation (Automation)**: Server-side operations invoked via `/automation/<operationId>`. Takes input, params, and context
- **Entity Type**: The `entity-type` field in JSON responses (e.g., `document`, `documents`, `user`, `workflow`). Drives unmarshalling
- **Unmarshaller**: Client-side function that converts a JSON response with a given `entity-type` into a typed JavaScript object
- **Batch Upload**: Two-step upload: first upload blobs to a batch, then reference them when creating/updating documents

## Build System

**Browserify** + **Babel** (`@babel/preset-env`) for browser builds. No webpack, rollup, or other bundlers.

```bash
npm run build           # Clean, copy lib/ to dist/, and build browser bundle
npm run build:dist      # Copy lib/ to dist/ with simplified package.json (no transpilation)
npm run build:browser   # Browserify + Babel bundle to dist/nuxeo.js
npm run lint            # ESLint on lib/ and test/
npm run doc             # Generate JSDoc documentation to doc/
```

Note: `build:dist` copies source files to `dist/` and creates a simplified `package.json` (no devDependencies, no scripts). Babel is only used by Browserify for the browser bundle, not for the Node.js distribution.

## Testing

### Framework

- **Mocha** + **Chai** (expect style) + **dirty-chai** (function-style assertions: `expect(x).to.exist()` not `expect(x).to.exist`)
- Browser tests via **Karma** + **SauceLabs**

### Important: Integration Tests Only

All tests are **integration tests** that require a running Nuxeo Platform instance. They cannot be run locally without a server. The server URL is configured via the `NUXEO_BASE_URL` environment variable (defaults to `http://localhost:8080/nuxeo`).

### Test Conventions

- Test files are named `<module>.spec.js` and placed alongside or mirroring the source structure
- Tests use global variables set up by helpers: `Nuxeo`, `baseURL`, `expect`, `isBrowser`
- Tests authenticate as `Administrator`/`Administrator`
- Use `describe` blocks matching the class/method hierarchy
- Use `.then()` chains in tests, never `async`/`await`
- Return the Promise chain from `it()` blocks so Mocha waits for resolution
- Test-specific ESLint config (`test/.eslintrc`) extends root config and enables the `mocha` env

### Validation Without a Server

When no Nuxeo server is available, validate changes with:

```bash
npm run lint            # Run ESLint -- this is the primary local validation step
npm run build           # Verify the build succeeds
```

## CI/CD and Git

- **Jenkins** pipelines (`ci/Jenkinsfiles/`); tests against Nuxeo LTS 2023 and 2025 via Helm/Docker
- Tested with Node.js "active" and "maintenance" LTS versions
- Release publishes from `dist/` to npm; JSDoc to `gh-pages` branch
- **GitHub Actions** only for Dependabot auto-merge
- Commit format: `NXJS-<number>: <description>` (JIRA prefix); main branch: `master`

## Dependencies

Key runtime deps: `extend` (deep merge), `node-fetch`, `whatwg-fetch`, `es6-promise`, `form-data`, `buffer`, `querystring`, `promise-queue`, `md5`, `random-js`. Note: `mocha` is incorrectly listed as a runtime dependency in `package.json` -- it should be in `devDependencies`.

## Common Tasks

### Adding a New Model Class

1. Create the class file in the appropriate `lib/` subdirectory, extending `Base`
2. Accept `(json, opts)` in the constructor; call `super(opts)` and `extend(true, this, json)`
3. Store a reference to the parent object -- either `opts.nuxeo` as `this._nuxeo` (for top-level models like Document, Workflow, Task) or the manager instance (e.g., `opts.users` as `this._users` for User)
4. Implement `_dirtyProperties` tracking with `set()` and `get()` methods if the entity supports partial updates
5. Create an unmarshaller function and register it in `lib/unmarshallers/unmarshallers.js`
6. Register the unmarshaller in `lib/index.js` via `Nuxeo.registerUnmarshaller()`
7. Export the class on the `Nuxeo` namespace in `lib/index.js`

### Adding a New Manager Class

1. Create the class file in the appropriate `lib/` subdirectory, extending `Base`
2. Accept `(opts)` in the constructor; call `super(opts)` and store `this._nuxeo = opts.nuxeo`
3. Implement CRUD methods: `fetch(id, opts)`, `create(entity, opts)`, `update(entity, opts)`, `delete(id, opts)`
4. In fetch/create/update, pass `options.<managerName> = this` so unmarshallers can construct model objects with a reference back to the manager
5. Add a factory method on the `Nuxeo` class (e.g., `nuxeo.users()`) that creates and returns the manager
6. Export the class on the `Nuxeo` namespace in `lib/index.js`

### Adding a New Authenticator

1. Define an authenticator object with `computeAuthenticationHeaders(auth)` and optionally `authenticateURL(url, auth)`, `canRefreshAuthentication()`, `refreshAuthentication(baseURL, auth)`
2. Export it from `lib/auth/auth.js`
3. Register it in `lib/index.js` via `Nuxeo.registerAuthenticator()`

### Adding a New API Method

1. Add the method to the appropriate class
2. Accept `opts = {}` as the last parameter
3. Call `this._computeOptions(opts)` to merge options
4. Return a Promise chain (via `this._nuxeo.http()`, `this._nuxeo.request()`, or `this._nuxeo.operation()`)
5. Add JSDoc with `@param`, `@returns`, and `@example`
6. Add a corresponding test in `test/`
