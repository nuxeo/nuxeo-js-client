(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict';

const md5 = require('md5');
const Random = require('random-js');
const extend = require('extend');

const { btoa } = require('../deps/utils/base64');
const Promise = require('../deps/promise');
const oauth2 = require('../auth/oauth2');

const DEFAULT_AUTHENTICATOR = {
  computeAuthenticationHeaders: () => {},
  authenticateURL: url => url,
  canRefreshAuthentication: () => false,
  refreshAuthentication: (baseURL, auth) => new Promise(resolve => resolve(auth))
};

const authenticators = {};

const Authentication = {
  registerAuthenticator: (method, authenticator) => {
    const auth = extend(true, {}, DEFAULT_AUTHENTICATOR, authenticator);
    authenticators[method] = auth;
  },

  computeAuthenticationHeaders: auth => {
    if (auth) {
      const authenticator = authenticators[auth.method];
      if (authenticator) {
        return authenticator.computeAuthenticationHeaders(auth);
      }
    }
    return {};
  },

  authenticateURL: (url, auth) => {
    if (auth) {
      const authenticator = authenticators[auth.method];
      if (authenticator) {
        return authenticator.authenticateURL(url, auth);
      }
    }
    return url;
  },

  canRefreshAuthentication: auth => {
    if (auth) {
      const authenticator = authenticators[auth.method];
      if (authenticator) {
        return authenticator.canRefreshAuthentication();
      }
    }
    return false;
  },

  refreshAuthentication: (baseURL, auth) => {
    if (auth) {
      const authenticator = authenticators[auth.method];
      if (authenticator) {
        return authenticator.refreshAuthentication(baseURL, auth);
      }
    }
    return new Promise(resolve => resolve(auth));
  }
};

// default authenticators
const basicAuthenticator = {
  computeAuthenticationHeaders: auth => {
    const headers = {};
    if (auth.username && auth.password) {
      const base64 = btoa(`${auth.username}:${auth.password}`);
      const authorization = `Basic ${base64}`;
      headers.Authorization = authorization;
    }
    return headers;
  },

  authenticateURL: (url, auth) => {
    if (auth.username && auth.password) {
      return url.replace('://', `://${auth.username}:${auth.password}@`);
    }
    return url;
  }
};

const tokenAuthenticator = {
  computeAuthenticationHeaders: auth => {
    const headers = {};
    if (auth.token) {
      headers['X-Authentication-Token'] = auth.token;
    }
    return headers;
  },

  authenticateURL: (url, auth) => {
    if (auth.token) {
      return `${url}${url.indexOf('?') === -1 ? '?' : '&'}token=${auth.token}`;
    }
    return url;
  }
};

const bearerTokenAuthenticator = {
  computeAuthenticationHeaders: auth => {
    const headers = {};
    if (auth.token) {
      const accessToken = auth.token.access_token || auth.token;
      headers.Authorization = `Bearer ${accessToken}`;
    }
    return headers;
  },

  authenticateURL: (url, auth) => {
    if (auth.token) {
      const accessToken = auth.token.access_token || auth.token;
      return `${url}${url.indexOf('?') === -1 ? '?' : '&'}access_token=${accessToken}`;
    }
    return url;
  },

  canRefreshAuthentication: () => true,

  refreshAuthentication: (baseURL, auth) => new Promise((resolve, reject) => {
    if (!auth.token.refresh_token || !auth.clientId) {
      return resolve(auth);
    }

    return oauth2.refreshAccessToken(baseURL, auth.clientId, auth.token.refresh_token).then(token => {
      const refreshedAuth = extend(true, {}, auth, { token });
      return resolve(refreshedAuth);
    }).catch(e => reject(e));
  })
};

const random = Random.engines.mt19937().autoSeed();

const portalAuthenticator = {
  computeAuthenticationHeaders: auth => {
    const headers = {};
    if (auth.secret && auth.username) {
      const date = new Date();
      const randomData = random();

      const clearToken = [date.getTime(), randomData, auth.secret, auth.username].join(':');
      const base64hashedToken = btoa(md5(clearToken, { asBytes: true }));
      headers.NX_RD = randomData;
      headers.NX_TS = date.getTime();
      headers.NX_TOKEN = base64hashedToken;
      headers.NX_USER = auth.username;
    }
    return headers;
  }
};

Authentication.basicAuthenticator = basicAuthenticator;
Authentication.tokenAuthenticator = tokenAuthenticator;
Authentication.bearerTokenAuthenticator = bearerTokenAuthenticator;
Authentication.portalAuthenticator = portalAuthenticator;

module.exports = Authentication;

},{"../auth/oauth2":2,"../deps/promise":8,"../deps/utils/base64":9,"extend":41,"md5":44,"random-js":52}],2:[function(require,module,exports){
'use strict';

const extend = require('extend');
const qs = require('querystring');

const doFetch = require('../deps/fetch');
const Promise = require('../deps/promise');

const fetchAccessToken = (baseURL, body) => {
  const url = baseURL.endsWith('/') ? baseURL : `${baseURL}/`;
  return new Promise((resolve, reject) => doFetch(`${url}/oauth2/token`, {
    method: 'POST',
    body: qs.stringify(body),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  }).then(res => res.json()).then(token => {
    if (token.error) {
      return reject(token.error);
    }
    return resolve(token);
  }).catch(e => reject(e)));
};

const oauth2 = {

  /**
   * Returns the OAuth2 authorization URL.
   * @param {string} [baseURL] - Base URL of the Nuxeo Platform.
   * @param {string} [clientId] - The OAuth2 client id.
   * @param {object} [opts] - Optional query parameters such as `state`, `redirect_uri`.
   * @returns {string}
   */
  getAuthorizationURL: (baseURL, clientId, params = {}) => {
    if (!baseURL) {
      throw new Error('Missing `baseURL` argument');
    }
    if (!clientId) {
      throw new Error('Missing `clientId` argument');
    }

    const queryParams = extend(true, { client_id: clientId, response_type: 'code' }, params);
    const url = baseURL.endsWith('/') ? baseURL : `${baseURL}/`;
    return `${url}oauth2/authorize?${qs.stringify(queryParams)}`;
  },

  /**
   * Fetches an OAuth2 access token.
   * @param {string} [baseURL] - Base URL of the Nuxeo Platform.
   * @param {string} [clientId] - The OAuth2 client id.
   * @param {string} [code] - An authorization code.
   * @param {object} [params] - Optional parameters such as `redirect_uri`.
   * @returns {string}
   */
  fetchAccessToken: (baseURL, clientId, code, params = {}) => {
    if (!baseURL) {
      throw new Error('Missing `baseURL` argument');
    }
    if (!clientId) {
      throw new Error('Missing `clientId` argument');
    }
    if (!code) {
      throw new Error('Missing `code` argument');
    }

    const defaultParams = { code, grant_type: 'authorization_code', client_id: clientId };
    const body = extend(true, defaultParams, params);
    return fetchAccessToken(baseURL, body);
  },

  /**
   * Refreshes an OAuth2 access token.
   * @param {string} [baseURL] - Base URL of the Nuxeo Platform.
   * @param {string} [clientId] - The OAuth2 client id.
   * @param {string} [refreshToken] - A refresh token.
   * @param {object} [params] - Optional parameters.
   * @returns {string}
   */
  refreshAccessToken: (baseURL, clientId, refreshToken, params = {}) => {
    if (!baseURL) {
      throw new Error('Missing `baseURL` argument');
    }
    if (!clientId) {
      throw new Error('Missing `clientId` argument');
    }
    if (!refreshToken) {
      throw new Error('Missing `refreshToken` argument');
    }

    const defaultParams = { refresh_token: refreshToken, grant_type: 'refresh_token', client_id: clientId };
    const body = extend(true, defaultParams, params);
    return fetchAccessToken(baseURL, body);
  }
};

module.exports = oauth2;

},{"../deps/fetch":6,"../deps/promise":8,"extend":41,"querystring":51}],3:[function(require,module,exports){
'use strict';

const extend = require('extend');

const DEFAULT_OPTS = {
  repositoryName: undefined,
  schemas: [],
  enrichers: {},
  fetchProperties: {},
  translateProperties: {},
  headers: {},
  httpTimeout: 30000
};

/**
 * This provides methods to store and use global settings when interacting with Nuxeo Platform.
 *
 * It's not meant to be used directly.
 *
 * @mixin
 */
class Base {
  constructor(opts = {}) {
    const options = extend(true, {}, DEFAULT_OPTS, opts);
    this._baseOptions = {};
    this._baseOptions.repositoryName = options.repositoryName;
    this._baseOptions.schemas = options.schemas;
    this._baseOptions.enrichers = options.enrichers;
    this._baseOptions.fetchProperties = options.fetchProperties;
    this._baseOptions.translateProperties = options.translateProperties;
    this._baseOptions.depth = options.depth;
    this._baseOptions.headers = options.headers;
    this._baseOptions.timeout = options.timeout;
    this._baseOptions.transactionTimeout = options.transationTimeout;
    this._baseOptions.httpTimeout = options.httpTimeout;
  }

  /**
   * Sets the repository name.
   * @param {string} repositoryName - The repository name.
   * @returns {Base} The object itself.
   */
  repositoryName(repositoryName) {
    this._baseOptions.repositoryName = repositoryName;
    return this;
  }

  /**
   * Sets the schemas.
   * @param {Array} schemas - The schemas.
   * @returns {Base} The object itself.
   */
  schemas(schemas) {
    this._baseOptions.schemas = [...schemas];
    return this;
  }

  /**
   * Sets the enrichers.
   *
   * By default, the new enrichers override completely the existing ones. By setting `override` to false,
   * enrichers are merged.
   *
   * @example
   * { document: ['acls', 'permissions'] }
   * @param {object} enrichers - The new enrichers.
   * @param {boolean} override - If the new `enrichers` override the existing ones. Default to true.
   * @returns {Base} The object itself.
   */
  enrichers(enrichers, override = true) {
    this._baseOptions.enrichers = override ? {} : this._baseOptions.enrichers;
    // eslint-disable-next-line prefer-const
    for (var _iterator = Object.keys(enrichers), _isArray = Array.isArray(_iterator), _i = 0, _iterator = _isArray ? _iterator : _iterator[Symbol.iterator]();;) {
      var _ref;

      if (_isArray) {
        if (_i >= _iterator.length) break;
        _ref = _iterator[_i++];
      } else {
        _i = _iterator.next();
        if (_i.done) break;
        _ref = _i.value;
      }

      let key = _ref;

      if (override) {
        this._baseOptions.enrichers[key] = [...enrichers[key]];
      } else {
        this._baseOptions.enrichers[key] = this._baseOptions.enrichers[key] || [];
        this._baseOptions.enrichers[key].push(...enrichers[key]);
      }
    }
    return this;
  }

  /**
   * Adds an enricher for a given entity.
   * @param {string} entity - The entity name.
   * @param {string} name - The enricher name.
   * @returns {Base} The object itself.
   */
  enricher(entity, name) {
    const enrichers = this._baseOptions.enrichers[entity] || [];
    enrichers.push(name);
    this._baseOptions.enrichers[entity] = enrichers;
    return this;
  }

  /**
   * Sets the properties to fetch.
   *
   * By default, the new properties override completely the existing ones. By setting `override` to false,
   * the properties to fetch are merged.
   *
   * @example
   * { document: ['dc:creator'] }
   * @param {object} fetchProperties - The new properties to fetch.
   * @param {boolean} override - If the new `fetchProperties` override the existing ones. Default to true.
   * @returns {Base} The object itself.
   */
  fetchProperties(fetchProperties, override = true) {
    this._baseOptions.fetchProperties = override ? {} : this._baseOptions.fetchProperties;
    // eslint-disable-next-line prefer-const
    for (var _iterator2 = Object.keys(fetchProperties), _isArray2 = Array.isArray(_iterator2), _i2 = 0, _iterator2 = _isArray2 ? _iterator2 : _iterator2[Symbol.iterator]();;) {
      var _ref2;

      if (_isArray2) {
        if (_i2 >= _iterator2.length) break;
        _ref2 = _iterator2[_i2++];
      } else {
        _i2 = _iterator2.next();
        if (_i2.done) break;
        _ref2 = _i2.value;
      }

      let key = _ref2;

      if (override) {
        this._baseOptions.fetchProperties[key] = [...fetchProperties[key]];
      } else {
        this._baseOptions.fetchProperties[key] = this._baseOptions.fetchProperties[key] || [];
        this._baseOptions.fetchProperties[key].push(...fetchProperties[key]);
      }
    }
    return this;
  }

  /**
  * Adds a property to fetch for a given entity.
  * @param {string} entity - The entity name.
  * @param {string} name - The property name.
  * @returns {Base} The object itself.
  */
  fetchProperty(entity, name) {
    const fetchProperties = this._baseOptions.fetchProperties[entity] || [];
    fetchProperties.push(name);
    this._baseOptions.fetchProperties[entity] = fetchProperties;
    return this;
  }

  /**
   * Sets the properties to translate.
   *
   * By default, the new properties override completely the existing ones. By setting `override` to false,
   * the properties to translate are merged.
   *
   * @example
   * { directoryEntry: ['label'] }
   * @param {object} translateProperties - The new properties to translate.
   * @param {boolean} override - If the new `translateProperties` override the existing ones. Default to true.
   * @returns {Base} The object itself.
   */
  translateProperties(translateProperties, override = true) {
    this._baseOptions.translateProperties = override ? {} : this._baseOptions.translateProperties;
    // eslint-disable-next-line prefer-const
    for (var _iterator3 = Object.keys(translateProperties), _isArray3 = Array.isArray(_iterator3), _i3 = 0, _iterator3 = _isArray3 ? _iterator3 : _iterator3[Symbol.iterator]();;) {
      var _ref3;

      if (_isArray3) {
        if (_i3 >= _iterator3.length) break;
        _ref3 = _iterator3[_i3++];
      } else {
        _i3 = _iterator3.next();
        if (_i3.done) break;
        _ref3 = _i3.value;
      }

      let key = _ref3;

      if (override) {
        this._baseOptions.translateProperties[key] = [...translateProperties[key]];
      } else {
        this._baseOptions.translateProperties[key] = this._baseOptions.translateProperties[key] || [];
        this._baseOptions.translateProperties[key].push(...translateProperties[key]);
      }
    }
    return this;
  }

  /**
  * Adds a property to translate for a given entity.
  * @param {string} entity - The entity name.
  * @param {string} name - The property name.
  * @returns {Base} The object itself.
  */
  translateProperty(entity, name) {
    const translateProperties = this._baseOptions.translateProperties[entity] || [];
    translateProperties.push(name);
    this._baseOptions.translateProperties[entity] = translateProperties;
    return this;
  }

  /**
   * Sets the depth.
   * Possible values are: `root`, `children` and `max`.
   * @returns {Base} The object itself.
   */
  depth(depth) {
    this._baseOptions.depth = depth;
    return this;
  }

  /**
   * Sets the headers.
   * @param {object} headers - the new headers.
   * @returns {Base} The object itself.
   */
  headers(headers) {
    this._baseOptions.headers = {};
    // eslint-disable-next-line prefer-const
    for (var _iterator4 = Object.keys(headers), _isArray4 = Array.isArray(_iterator4), _i4 = 0, _iterator4 = _isArray4 ? _iterator4 : _iterator4[Symbol.iterator]();;) {
      var _ref4;

      if (_isArray4) {
        if (_i4 >= _iterator4.length) break;
        _ref4 = _iterator4[_i4++];
      } else {
        _i4 = _iterator4.next();
        if (_i4.done) break;
        _ref4 = _i4.value;
      }

      let key = _ref4;

      this._baseOptions.headers[key] = headers[key];
    }
    return this;
  }

  /**
   * Adds a header.
   * @param {string} name - the header name
   * @param {string} value - the header value
   * @returns {Base} The object itself..
   */
  header(name, value) {
    this._baseOptions.headers[name] = value;
    return this;
  }

  /**
   * Sets the global timeout, used as HTTP timeout and transaction timeout
   * by default.
   * @returns {Base} The object itself.
   * @deprecated since 3.6.0, use {#httpTiemout} or {#transactionTimeout} instead.
   */
  timeout(timeout) {
    this._baseOptions.timeout = timeout;
    return this;
  }

  /**
   * Sets the transaction timeout, in seconds.
   * @returns {Base} The object itself.
   */
  transactionTimeout(transactionTimeout) {
    this._baseOptions.transactionTimeout = transactionTimeout;
    return this;
  }

  /**
   * Sets the HTTP timeout, in milliseconds.
   *
   * The HTTP timeout works only in a Node.js environment.
   * @returns {Base} The object itself.
   */
  httpTimeout(httpTimeout) {
    this._baseOptions.httpTimeout = httpTimeout;
    return this;
  }

  /**
   * Computes a full options object from an optional `opts` object and the ones from this object.
   * `schemas`, `enrichers`, `fetchProperties` and `headers` are not merged but the ones from the `opts` object
   * override the ones from this object.
   */
  _computeOptions(opts = {}) {
    const options = extend(true, {}, this._baseOptions, opts);
    // force some options that we don't merge
    if (opts.schemas) {
      options.schemas = [...opts.schemas];
    }
    if (opts.enrichers) {
      options.enrichers = {};
      Object.keys(opts.enrichers).forEach(key => {
        options.enrichers[key] = opts.enrichers[key];
      });
    }
    if (opts.fetchProperties) {
      options.fetchProperties = {};
      Object.keys(opts.fetchProperties).forEach(key => {
        options.fetchProperties[key] = opts.fetchProperties[key];
      });
    }
    if (opts.translateProperties) {
      options.translateProperties = {};
      Object.keys(opts.translateProperties).forEach(key => {
        options.translateProperties[key] = opts.translateProperties[key];
      });
    }
    if (opts.headers) {
      options.headers = {};
      Object.keys(opts.headers).forEach(key => {
        options.headers[key] = opts.headers[key];
      });
    }
    return options;
  }
}

module.exports = Base;

},{"extend":41}],4:[function(require,module,exports){
"use strict";

/**
 * The `Blob` class represents an abstraction over a blob to be used in the APIs.
 *
 * @example
 * // in the browser, assuming you have a File object from an input for instance
 * var blob = new Nuxeo.Blob({ content: file });
 * // in node
 * var file = fs.createReadStream(filePath);
 * var stats = fs.statSync(filePath);
 * var blob = new Nuxeo.Blob({
 *    content: file,
 *    name: path.basename(filePath1),
 *    mimeType: 'text/plain',
 *    size: stats.size,
 *  });
 */
class Blob {
  /*
   * Creates a Blob.
   * @param {string} opts.content - The content of the Blob. Could be a File or Blob object in the browser.
   * @param {string} [opts.name] - The name of the Blob. It overrides the one from content.name.
   * @param {string} [opts.mimeType] - The mime-type of the Blob. It overrides the one from content.type.
   * @param {string} [opts.size] - The size of the Blob. It overrides the one from content.size.
   */
  constructor(opts) {
    this.content = opts.content;
    this.name = opts.name || this.content.name;
    this.mimeType = opts.mimeType || this.content.type;
    this.size = opts.size || this.content.size;
  }
}

module.exports = Blob;

},{}],5:[function(require,module,exports){
'use strict';

const depth = {
  ROOT: 'root',
  CHILDREN: 'children',
  MAX: 'max'
};

const enricher = {
  document: {
    ACLS: 'acls',
    BREADCRUMB: 'breadcrumb',
    CHILDREN: 'children',
    DOCUMENT_URL: 'documentURL',
    PERMISSIONS: 'permissions',
    PREVIEW: 'preview'
  }
};

module.exports = {
  depth,
  enricher
};

},{}],6:[function(require,module,exports){
'use strict';

require('whatwg-fetch');
/* eslint no-undef: 0 */
module.exports = self.fetch.bind(self);

},{"whatwg-fetch":53}],7:[function(require,module,exports){
"use strict";

/* eslint no-undef: 0 */
module.exports = FormData;

},{}],8:[function(require,module,exports){
'use strict';

const P = require('es6-promise');

// use the polyfill only if no `Promise` object exists
if (typeof Promise === 'undefined') {
  P.polyfill();
}

module.exports = Promise;

},{"es6-promise":40}],9:[function(require,module,exports){
'use strict';

const Buffer = require('./buffer');

function btoa(str) {
  return new Buffer(str).toString('base64');
}

module.exports = {
  btoa
};

},{"./buffer":10}],10:[function(require,module,exports){
'use strict';

module.exports = require('buffer/').Buffer;

},{"buffer/":37}],11:[function(require,module,exports){
'use strict';

function encodePath(path) {
  let encodedPath = encodeURIComponent(path);
  // put back '/' character
  encodedPath = encodedPath.replace(/%2F/g, '/');
  // put back '@' character, needed for web adapters for instance...
  encodedPath = encodedPath.replace(/%40/g, '@');

  return encodedPath;
}

module.exports = encodePath;

},{}],12:[function(require,module,exports){
"use strict";

function flatten(list) {
  return list.reduce((a, b) => a.concat(Array.isArray(b) ? flatten(b) : b), []);
}

module.exports = flatten;

},{}],13:[function(require,module,exports){
'use strict';

function join(...args) {
  const joined = args.join('/');
  return joined.replace(/(^\/+)|([^:])\/\/+/g, '$2/');
}

module.exports = join;

},{}],14:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

const Base = require('../base');
const join = require('../deps/utils/join');

/**
 * The `Directory` class allows to work with directories on a Nuxeo Platform instance.
 *
 * **Cannot directly be instantiated**
 *
 * @example
 * var Nuxeo = require('nuxeo')
 * var nuxeo = new Nuxeo({
 *  baseURL: 'http://localhost:8080/nuxeo',
 *  auth: {
 *    method: 'basic',
 *    username: 'Administrator',
 *    password: 'Administrator'
 *  }
 * });
 * nuxeo.directory('nature')
 *   .fetch('article')
 *   .then(function(res) {
 *     // res.properties.id === 'article'
 *     // res.properties.label === 'article label.directories.nature.article'
 *   })
 *   .catch(function(error) {
 *     throw new Error(error));
 *   });
 */
class Directory extends Base {
  /**
   * Creates a Directory.
   * @param {object} opts - The configuration options.
   * @param {string} opts.nuxeo - The {@link Nuxeo} object linked to this directory.
   * @param {string} opts.directoryName - The name of this directory.
   */
  constructor(opts) {
    super(opts);
    this._nuxeo = opts.nuxeo;
    this._directoryName = opts.directoryName;
    this._path = join('directory', this._directoryName);
  }

  /**
   * Fetches all directory entries.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A Promise object resolved with the entries.
   */
  fetchAll(opts = {}) {
    const options = this._computeOptions(opts);
    const path = this._path;
    options.directory = this;
    return this._nuxeo.request(path).get(options);
  }

  /**
   * Fetches a directory entry given its id.
   * @param {string} id - The entry id.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A Promise object resolved with the {@link DirectoryEntry}.
   */
  fetch(id, opts) {
    const options = this._computeOptions(opts);
    const path = join(this._path, id);
    options.directory = this;
    return this._nuxeo.request(path).get(options);
  }

  /**
   * Creates an entry.
   * @param {object} entry - The entry to be created.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A Promise object resolved with the created {@link DirectoryEntry}.
   */
  create(entry, opts = {}) {
    opts.body = _extends({}, entry, {
      'entity-type': 'directoryEntry',
      directoryName: this._directoryName
    });
    const options = this._computeOptions(opts);
    const path = this._path;
    options.directory = this;
    return this._nuxeo.request(path).post(options);
  }

  /**
   * Updates an entry. Assumes that the entry object has an `id` property.
   * @param {object} entry - The entry to be updated.
   * @param {object} entry.id - The string id of the entry to be updated.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A Promise object resolved with the updated {@link DirectoryEntry}.
   */
  update(entry, opts = {}) {
    // compatibility code for 8.10 where the `id` field is not set by the server
    // works only if the `idField` of the directory is `id`
    const id = entry.id || entry.properties.id;
    opts.body = _extends({}, entry, {
      'entity-type': 'directoryEntry',
      directoryName: this._directoryName
    });
    const options = this._computeOptions(opts);
    const path = join(this._path, id);
    options.directory = this;
    return this._nuxeo.request(path).put(options);
  }

  /**
   * Deletes an entry given its id.
   * @param {string} id - The entry id.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A Promise object resolved with the result of the DELETE request.
   */
  delete(id, opts) {
    const options = this._computeOptions(opts);
    const path = join(this._path, id);
    return this._nuxeo.request(path).delete(options);
  }
}

module.exports = Directory;

},{"../base":3,"../deps/utils/join":13}],15:[function(require,module,exports){
'use strict';

const extend = require('extend');
const Base = require('../base');

const { LTS_2017 } = require('../server-version');

/**
 * The `DirectoryEntry` class wraps a directory entry.
 *
 * **Cannot directly be instantiated**
 */
class DirectoryEntry extends Base {
  /**
   * Creates a DirectoryEntry.
   * @param {object} entry - The initial entry object.
   *                         This DirectoryEntry object will be extended with entry properties.
   * @param {object} opts - The configuration options.
   * @param {string} opts.directory - The {@link Directory} object linked to this entry.
   */
  constructor(entry, opts) {
    super(opts);
    this._directory = opts.directory;
    this.properties = {};
    this._dirtyProperties = {};
    const { serverVersion } = this._directory._nuxeo;
    // compatibility code for 8.10 (or unknown version) - make all properties dirty so that
    // the `idField` will be passed when updating
    if (!serverVersion || serverVersion.lt(LTS_2017)) {
      this._dirtyProperties = extend({}, entry.properties);
    }
    extend(true, this, entry);
  }

  /**
   * Sets entry properties.
   * @param {object} properties - The properties to set.
   * @returns {DirectoryEntry}
   *
   * @example
   * entry.set({
   *   'label': 'new label',
   *   'ordering': 50,
   * });
   */
  set(properties) {
    this._dirtyProperties = extend(true, {}, this._dirtyProperties, properties);
    return this;
  }

  /**
   * Gets an entry property.
   * @param {string} propertyName - The property name, such as 'label', 'ordering', ...
   * @returns {DirectoryEntry}
   */
  get(propertyName) {
    return this._dirtyProperties[propertyName] || this.properties[propertyName];
  }

  /**
   * Saves the entry. It updates only the 'dirty properties' set through the {@link DirectoryEntry#set} method.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A promise object resolved with the updated entry.
   */
  save(opts = {}) {
    const options = this._computeOptions(opts);
    return this._directory.update({
      id: this.id,
      properties: this._dirtyProperties
    }, options);
  }
}

module.exports = DirectoryEntry;

},{"../base":3,"../server-version":27,"extend":41}],16:[function(require,module,exports){
'use strict';

const extend = require('extend');
const qs = require('querystring');
const join = require('./deps/utils/join');
const Base = require('./base');
const constants = require('./deps/constants');

/**
 * The `Document` class wraps a document.
 *
 * **Cannot directly be instantiated**
 */
class Document extends Base {
  /**
   * Creates a Document.
   * @param {object} doc - The initial document object. This Document object will be extended with doc properties.
   * @param {object} opts - The configuration options.
   * @param {string} opts.nuxeo - The {@link Nuxeo} object linked to this `Document` object.
   * @param {object} opts.repository - The {@link Repository} object linked to this `Document` object.
   */
  constructor(doc, opts) {
    super(opts);
    this._nuxeo = opts.nuxeo;
    this._repository = opts.repository || this._nuxeo.repository(doc.repository, opts);
    this.properties = {};
    this._dirtyProperties = {};
    extend(true, this, doc);
  }

  /**
   * Sets document properties.
   * @param {object} properties - The properties to set.
   * @returns {Document}
   *
   * @example
   * doc.set({
   *   'dc:title': 'new title',
   *   'dc:description': 'new description',
   * });
   */
  set(properties) {
    this._dirtyProperties = extend(true, {}, this._dirtyProperties, properties);
    return this;
  }

  /**
   * Gets a document property.
   * @param {string} propertyName - The property name, such as 'dc:title', 'file:filename', ...
   * @returns {Document}
   */
  get(propertyName) {
    return this._dirtyProperties[propertyName] || this.properties[propertyName];
  }

  /**
   * Saves the document. It updates only the 'dirty properties' set through the {@link Document#set} method.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A promise object resolved with the updated document.
   */
  save(opts = {}) {
    const options = this._computeOptions(opts);
    return this._repository.update({
      'entity-type': 'document',
      uid: this.uid,
      properties: this._dirtyProperties
    }, options);
  }

  /**
   * Returns whether this document is folderish or not.
   * @returns {Boolean} true if this document is folderish, false otherwise.
   */
  isFolder() {
    return this.hasFacet('Folderish');
  }

  /**
   * Returns whether this document has the input facet or not.
   * @returns {Boolean} true if this document has the facet, false otherwise.
   */
  hasFacet(facet) {
    return this.facets.indexOf(facet) !== -1;
  }

  /**
   * Returns whether this document is a collection or not.
   * @returns {Boolean} true if this document is a collection, false otherwise.
   */
  isCollection() {
    return this.hasFacet('Collection');
  }

  /**
   * Returns whether this document can be added to a collection or not.
   * @returns {Boolean} true if this document can be added to a collection, false otherwise.
   */
  isCollectable() {
    return !this.hasFacet('NotCollectionMember');
  }

  /**
   * Fetch a Blob from this document.
   * @param {string} [xpath=blobholder:0] - The Blob xpath. Default to the main blob 'blobholder:0'.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A promise object resolved with the response.
   */
  fetchBlob(xpath = 'blobholder:0', opts = {}) {
    let options = opts;
    let blobXPath = xpath;
    if (typeof xpath === 'object') {
      options = xpath;
      blobXPath = 'blobholder:0';
    }
    options = this._computeOptions(options);
    const path = join('id', this.uid, '@blob', blobXPath);
    return this._nuxeo.request(path).get(options);
  }

  /**
   * Moves this document.
   * @param {string} dst - The destination folder.
   * @param {string} [name] - The destination name, can be null.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A promise object resolved with the moved document.
   */
  move(dst, name = null, opts = {}) {
    const options = this._computeOptions(opts);
    options.repository = this._repository;
    return this._nuxeo.operation('Document.Move').input(this.uid).params({
      name,
      target: dst
    }).execute(options);
  }

  /**
   * Follows a given life cycle transition.
   * @param {string} transitionName - The life cycle transition to follow.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A promise object resolved with the updated document.
   */
  followTransition(transitionName, opts = {}) {
    const options = this._computeOptions(opts);
    options.repository = this._repository;
    return this._nuxeo.operation('Document.FollowLifecycleTransition').input(this.uid).params({
      value: transitionName
    }).execute(options);
  }

  /**
   * Converts a Blob from this document.
   * @param {object} convertOpts - Configuration options for the conversion.
                                   At least one of the 'converter', 'type' or 'format' option must be defined.
   * @param {string} [convertOpts.xpath=blobholder:0] - The Blob xpath. Default to the main blob 'blobholder:0'.
   * @param {string} convertOpts.converter - Named converter to use.
   * @param {string} convertOpts.type - The destination mime type, such as 'application/pdf'.
   * @param {string} convertOpts.format - The destination format, such as 'pdf'.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A promise object resolved with the response.
   */
  convert(convertOpts, opts = {}) {
    const options = this._computeOptions(opts);
    const xpath = convertOpts.xpath || 'blobholder:0';
    const path = join('id', this.uid, '@blob', xpath, '@convert');
    return this._nuxeo.request(path).queryParams({
      converter: convertOpts.converter,
      type: convertOpts.type,
      format: convertOpts.format
    }).get(options);
  }

  /**
   * Schedule a conversion of the Blob from this document.
   * @param {object} convertOpts - Configuration options for the conversion.
                                   At least one of the 'converter', 'type' or 'format' option must be defined.
   * @param {string} [convertOpts.xpath=blobholder:0] - The Blob xpath. Default to the main blob 'blobholder:0'.
   * @param {string} convertOpts.converter - Named converter to use.
   * @param {string} convertOpts.type - The destination mime type, such as 'application/pdf'.
   * @param {string} convertOpts.format - The destination format, such as 'pdf'.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A promise object resolved with the response.
   */
  scheduleConversion(convertOpts, opts = {}) {
    const params = {
      async: true,
      converter: convertOpts.converter,
      type: convertOpts.type,
      format: convertOpts.format
    };
    opts.body = qs.stringify(params);
    const options = this._computeOptions(opts);
    options.headers['Content-Type'] = 'multipart/form-data';
    const xpath = convertOpts.xpath || 'blobholder:0';
    const path = join('id', this.uid, '@blob', xpath, '@convert');
    return this._nuxeo.request(path).post(options);
  }

  /**
   * Starts a workflow on this document given a workflow model name.
   * @param {string} workflowModelName - The workflow model name.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A promise object resolved with the started `Workflow` object.
   */
  startWorkflow(workflowModelName, opts = {}) {
    opts.body = {
      workflowModelName,
      'entity-type': 'workflow'
    };
    const options = this._computeOptions(opts);
    const path = join('id', this.uid, '@workflow');
    options.documentId = this.uid;
    return this._nuxeo.request(path).post(options);
  }

  /**
   * Fetches the started workflows on this document.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A promise object resolved with the started workflows.
   */
  fetchWorkflows(opts = {}) {
    const options = this._computeOptions(opts);
    const path = join('id', this.uid, '@workflow');
    options.documentId = this.uid;
    return this._nuxeo.request(path).get(options);
  }

  /**
   * Fetches the renditions list of this document.
   *
   * Only available on Nuxeo version LTS 2016 or later.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A promise object resolved with the rendition definitions.
   */
  fetchRenditions(opts = {}) {
    const Promise = this._nuxeo.Promise;
    if (this.contextParameters && this.contextParameters.renditions) {
      return Promise.resolve(this.contextParameters.renditions);
    }

    const options = this._computeOptions(opts);
    options.enrichers = { document: ['renditions'] };
    return this._repository.fetch(this.uid, options).then(doc => {
      if (!this.contextParameters) {
        this.contextParameters = {};
      }
      this.contextParameters.renditions = doc.contextParameters.renditions;
      return this.contextParameters.renditions;
    });
  }

  /**
   * Fetch a rendition from this document.
   * @param {string} name - The rendition name.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A promise object resolved with the response.
   */
  fetchRendition(name, opts = {}) {
    const options = this._computeOptions(opts);
    const path = join('id', this.uid, '@rendition', name);
    return this._nuxeo.request(path).get(options);
  }

  /**
   * Fetches the ACLs list of this document.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A promise object resolved with the ACLs.
   */
  fetchACLs(opts = {}) {
    const Promise = this._nuxeo.Promise;
    if (this.contextParameters && this.contextParameters.acls) {
      return Promise.resolve(this.contextParameters.acls);
    }

    const options = this._computeOptions(opts);
    options.enrichers = { document: [constants.enricher.document.ACLS] };
    return this._repository.fetch(this.uid, options).then(doc => {
      if (!this.contextParameters) {
        this.contextParameters = {};
      }
      this.contextParameters.acls = doc.contextParameters.acls;
      return this.contextParameters.acls;
    });
  }

  /**
   * Checks if the user has a given permission. It only works for now for 'Write', 'Read' and 'Everything' permission.
   * This method may call the server to compute the available permissions (using the 'permissions' enricher)
   * if not already present.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A promise object resolved with true or false.
   */
  hasPermission(name, opts = {}) {
    const Promise = this._nuxeo.Promise;
    if (this.contextParameters && this.contextParameters.permissions) {
      return Promise.resolve(this.contextParameters.permissions.indexOf(name) !== -1);
    }

    const options = this._computeOptions(opts);
    options.enrichers = { document: [constants.enricher.document.PERMISSIONS] };
    return this._repository.fetch(this.uid, options).then(doc => {
      if (!this.contextParameters) {
        this.contextParameters = {};
      }
      this.contextParameters.permissions = doc.contextParameters.permissions;
      return this.contextParameters.permissions.indexOf(name) !== -1;
    });
  }

  /**
   * Adds a new permission.
   * @param {object} params - The params needed to add a new permission.
   * @param {string} params.permission - The permission string to set, such as 'Write', 'Read', ...
   * @param {string} params.username - The target username. `username` or `email` must be set.
   * @param {string} params.email - The target email. `username` or `email` must be set.
   * @param {string} [params.acl] - The ACL name where to add the new permission.
   * @param {string} [params.begin] - Optional begin date.
   * @param {string} [params.end] - Optional end date.
   * @param {string} [params.blockInheritance] - Whether to block the permissions inheritance or not
   *                                             before adding the new permission.
   * @param {string} [params.notify] - Optional flag to notify the user of the new permission.
   * @param {string} [params.comment] - Optional comment used for the user notification.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A promise object resolved with the updated document.
   */
  addPermission(params, opts = {}) {
    const options = this._computeOptions(opts);
    options.repository = this._repository;
    return this._nuxeo.operation('Document.AddPermission').input(this.uid).params(params).execute(options);
  }

  /**
   * Removes a permission given its id, or all permissions for a given user.
   * @param {object} params - The params needed to remove a permission.
   * @param {string} params.id - The permission id. `id` or `user` must be set.
   * @param {string} params.user - The user to rem. `id` or `user` must be set.
   * @param {string} [params.acl] - The ACL name where to add the new permission.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A promise object resolved with the updated document.
   */
  removePermission(params, opts = {}) {
    const options = this._computeOptions(opts);
    options.repository = this._repository;
    return this._nuxeo.operation('Document.RemovePermission').input(this.uid).params(params).execute(options);
  }

  /**
   * Fetches the lock status of the document.
   * @example
   * // if the doc is locked
   * doc.fetchLockStatus()
   *   .then(function(status) {
   *     // status.lockOwner === 'Administrator'
   *     // status.lockCreated === '2011-10-23T12:00:00.00Z'
   *   });
   * @example
   * // if the doc is not locked
   * doc.fetchLockStatus()
   *   .then(function(status) {
   *     // status.lockOwner === undefined
   *     // status.lockCreated === undefined
   *   });
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A promise object resolved with true or false.
   */
  fetchLockStatus(opts = {}) {
    const options = this._computeOptions(opts);
    options.fetchProperties = { document: ['lock'] };
    return this._repository.fetch(this.uid, options).then(doc => ({ lockOwner: doc.lockOwner, lockCreated: doc.lockCreated }));
  }

  /**
   * Locks the document.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A promise object resolved with the updated document.
   */
  lock(opts = {}) {
    const options = this._computeOptions(opts);
    options.repository = this._repository;
    return this._nuxeo.operation('Document.Lock').input(this.uid).execute(options);
  }

  /**
   * Unlocks the document.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A promise object resolved with the updated document.
   */
  unlock(opts = {}) {
    const options = this._computeOptions(opts);
    options.repository = this._repository;
    return this._nuxeo.operation('Document.Unlock').input(this.uid).execute(options);
  }

  /**
   * Fetches the audit of the document.
   * @param {object} [queryOpts] - Parameters for the audit query.
   * @param {Array} [queryOpts.eventId] - List of event ids to filter.
   * @param {Array} [queryOpts.category] - List of categories to filter
   * @param {Array} [queryOpts.principalName] - List of principal names to filter.
   * @param {object} [queryOpts.startEventDate] - Start date.
   * @param {object} [queryParams.endEventDate] - End date
   * @param {number} [queryOpts.pageSize=0] - The number of results per page.
   * @param {number} [queryOpts.currentPageIndex=0] - The current page index.
   * @param {number} [queryOpts.maxResults] - The expected max results.
   * @param {string} [queryOpts.sortBy] - The sort by info.
   * @param {string} [queryOpts.sortOrder] - The sort order info.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A promise object resolved with audit entries.
   */
  fetchAudit(queryOpts = {}, opts = {}) {
    const options = this._computeOptions(opts);
    const path = join('id', this.uid, '@audit');
    return this._nuxeo.request(path).queryParams(queryOpts).get(options);
  }
}

module.exports = Document;

},{"./base":3,"./deps/constants":5,"./deps/utils/join":13,"extend":41,"querystring":51}],17:[function(require,module,exports){
'use strict';

const extend = require('extend');
const Base = require('../base');

/**
 * The `Group` class wraps a group.
 *
 * **Cannot directly be instantiated**
 */
class Group extends Base {
  /**
   * Creates a Group.
   * @param {object} group - The initial group object. This Group object will be extended with group properties.
   * @param {object} opts - The configuration options.
   * @param {string} opts.groups - The {@link Groups} object linked to this group.
   */
  constructor(group, opts) {
    super(opts);
    this._groups = opts.groups;
    extend(true, this, group);
  }

  /**
   * Saves the group.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A promise object resolved with the updated group.
   */
  save(opts = {}) {
    const options = this._computeOptions(opts);
    return this._groups.update({
      'entity-type': 'group',
      groupname: this.groupname,
      grouplabel: this.grouplabel,
      memberUsers: this.memberUsers,
      memberGroups: this.memberGroups
    }, options);
  }
}

module.exports = Group;

},{"../base":3,"extend":41}],18:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

const Base = require('../base');
const join = require('../deps/utils/join');

const GROUP_PATH = 'group';

/**
 * The `Groups` class allows to work with groups on a Nuxeo Platform instance.
 *
 * **Cannot directly be instantiated**
 *
 * @example
 * var Nuxeo = require('nuxeo')
 * var nuxeo = new Nuxeo({
 *  baseURL: 'http://localhost:8080/nuxeo',
 *  auth: {
 *    method: 'basic',
 *    username: 'Administrator',
 *    password: 'Administrator'
 *  }
 * });
 * nuxeo.groups()
 *   .fetch('administrators')
 *   .then(function(res) {
 *     // res.groupname === 'administrators'
 *     // res.grouplabel === 'Administrators group'
 *   })
 *   .catch(function(error) {
 *     throw new Error(error));
 *   });
 */

class Groups extends Base {
  /**
   * Creates a Groups object.
   * @param {object} opts - The configuration options.
   * @param {string} opts.nuxeo - The {@link Nuxeo} object linked to this Groups object.
   */
  constructor(opts) {
    super(opts);
    this._nuxeo = opts.nuxeo;
  }

  /**
   * Fetches a group given a groupname.
   * @param {string} groupname - The groupname.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A Promise object resolved with the {@link Group}.
   */
  fetch(groupname, opts = {}) {
    const options = this._computeOptions(opts);
    const path = join(GROUP_PATH, groupname);
    options.groups = this;
    return this._nuxeo.request(path).get(options);
  }

  /**
   * Creates a group.
   * @param {object} user - The group to be created.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A Promise object resolved with the created {@link Group}.
   */
  create(group, opts = {}) {
    opts.body = _extends({}, group, {
      'entity-type': 'group'
    });
    const options = this._computeOptions(opts);
    options.groups = this;
    return this._nuxeo.request(GROUP_PATH).post(options);
  }

  /**
   * Updates a group. Assumes that the group object has an groupname field.
   * @param {object} group - The group to be updated.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A Promise object resolved with the updated {@link Group}.
   */
  update(group, opts = {}) {
    const id = group.id || group.groupname;
    opts.body = _extends({}, group, {
      'entity-type': 'group'
    });
    const options = this._computeOptions(opts);
    const path = join(GROUP_PATH, id);
    options.groups = this;
    return this._nuxeo.request(path).put(options);
  }

  /**
   * Deletes a group given a groupname.
   * @param {string} groupname - The groupname.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A Promise object resolved with the result of the DELETE request.
   */
  delete(groupname, opts = {}) {
    const options = this._computeOptions(opts);
    const path = join(GROUP_PATH, groupname);
    return this._nuxeo.request(path).delete(options);
  }
}

module.exports = Groups;

},{"../base":3,"../deps/utils/join":13}],19:[function(require,module,exports){
'use strict';

const extend = require('extend');

const N = require('./index');

// keep back anything declared on Nuxeo object
extend(true, N, window.Nuxeo || {});

window.Nuxeo = N;

},{"./index":20,"extend":41}],20:[function(require,module,exports){
'use strict';

const Nuxeo = require('./nuxeo');
const Base = require('./base');
const Operation = require('./operation');
const Request = require('./request');
const Repository = require('./repository');
const Document = require('./document');
const BatchUpload = require('./upload/batch');
const Blob = require('./blob');
const BatchBlob = require('./upload/blob');
const Users = require('./user/users');
const User = require('./user/user');
const Groups = require('./group/groups');
const Group = require('./group/group');
const Directory = require('./directory/directory');
const DirectoryEntry = require('./directory/entry');
const Workflows = require('./workflow/workflows');
const Workflow = require('./workflow/workflow');
const Task = require('./workflow/task');
const constants = require('./deps/constants');
const Promise = require('./deps/promise');
const {
  basicAuthenticator,
  tokenAuthenticator,
  bearerTokenAuthenticator,
  portalAuthenticator
} = require('./auth/auth');
const {
  documentUnmarshaller,
  documentsUnmarshaller,
  workflowUnmarshaller,
  workflowsUnmarshaller,
  taskUnmarshaller,
  tasksUnmarshaller,
  directoryEntryUnmarshaller,
  directoryEntriesUnmarshaller,
  userUnmarshaller,
  groupUnmarshaller
} = require('./unmarshallers/unmarshallers');
const {
  documentMarshaller,
  directoryEntryMarshaller,
  userMarshaller,
  groupMarshaller
} = require('./marshallers/marshallers');
const NuxeoVersions = require('./nuxeo-versions');
const { SERVER_VERSIONS } = require('./server-version');
const oauth2 = require('./auth/oauth2');

const pkg = require('../package.json');

Nuxeo.Base = Base;
Nuxeo.Operation = Operation;
Nuxeo.Request = Request;
Nuxeo.Repository = Repository;
Nuxeo.Document = Document;
Nuxeo.BatchUpload = BatchUpload;
Nuxeo.Blob = Blob;
Nuxeo.BatchBlob = BatchBlob;
Nuxeo.Users = Users;
Nuxeo.User = User;
Nuxeo.Groups = Groups;
Nuxeo.Group = Group;
Nuxeo.Directory = Directory;
Nuxeo.DirectoryEntry = DirectoryEntry;
Nuxeo.Workflows = Workflows;
Nuxeo.Workflow = Workflow;
Nuxeo.Task = Task;
Nuxeo.constants = constants;
Nuxeo.version = pkg.version;

// expose Nuxeo versions
Nuxeo.VERSIONS = NuxeoVersions;
// expose Nuxeo Server versions
Nuxeo.SERVER_VERSIONS = SERVER_VERSIONS;

Nuxeo.oauth2 = oauth2;

Nuxeo.promiseLibrary(Promise);

// register default authenticators
Nuxeo.registerAuthenticator('basic', basicAuthenticator);
Nuxeo.registerAuthenticator('token', tokenAuthenticator);
Nuxeo.registerAuthenticator('bearerToken', bearerTokenAuthenticator);
Nuxeo.registerAuthenticator('portal', portalAuthenticator);

// register default unmarshallers
Nuxeo.registerUnmarshaller('document', documentUnmarshaller);
Nuxeo.registerUnmarshaller('documents', documentsUnmarshaller);
Nuxeo.registerUnmarshaller('workflow', workflowUnmarshaller);
Nuxeo.registerUnmarshaller('workflows', workflowsUnmarshaller);
Nuxeo.registerUnmarshaller('task', taskUnmarshaller);
Nuxeo.registerUnmarshaller('tasks', tasksUnmarshaller);
Nuxeo.registerUnmarshaller('directoryEntry', directoryEntryUnmarshaller);
Nuxeo.registerUnmarshaller('directoryEntries', directoryEntriesUnmarshaller);
Nuxeo.registerUnmarshaller('user', userUnmarshaller);
Nuxeo.registerUnmarshaller('group', groupUnmarshaller);
// make the WorkflowsUnmarshaller work for Nuxeo 7.10
Nuxeo.registerUnmarshaller('worflows', workflowsUnmarshaller);

// register default marshallers
Nuxeo.registerMarshaller('document', documentMarshaller);
Nuxeo.registerMarshaller('directoryEntry', directoryEntryMarshaller);
Nuxeo.registerMarshaller('user', userMarshaller);
Nuxeo.registerMarshaller('group', groupMarshaller);

module.exports = Nuxeo;

},{"../package.json":54,"./auth/auth":1,"./auth/oauth2":2,"./base":3,"./blob":4,"./deps/constants":5,"./deps/promise":8,"./directory/directory":14,"./directory/entry":15,"./document":16,"./group/group":17,"./group/groups":18,"./marshallers/marshallers":21,"./nuxeo":23,"./nuxeo-versions":22,"./operation":24,"./repository":25,"./request":26,"./server-version":27,"./unmarshallers/unmarshallers":28,"./upload/batch":29,"./upload/blob":30,"./user/user":31,"./user/users":32,"./workflow/task":33,"./workflow/workflow":34,"./workflow/workflows":35}],21:[function(require,module,exports){
'use strict';

function _objectEntries(obj) {
  var entries = [];
  var keys = Object.keys(obj);

  for (var k = 0; k < keys.length; ++k) entries.push([keys[k], obj[keys[k]]]);

  return entries;
}

const ENTITY_TYPE_KEY = 'entity-type';

const NUXEO_ENTITY_MAPPING = {
  document: obj => obj.uid,
  directoryEntry: obj => obj.id || obj.properties.id,
  user: obj => obj.id,
  group: obj => obj.id || obj.groupname
};

const isNuxeoObject = obj => {
  if (typeof obj === 'object' && obj[ENTITY_TYPE_KEY]) {
    return !!NUXEO_ENTITY_MAPPING[obj[ENTITY_TYPE_KEY]];
  }
  return false;
};

const processNuxeoObject = obj => {
  const mapping = NUXEO_ENTITY_MAPPING[obj[ENTITY_TYPE_KEY]];
  return mapping ? mapping(obj) : obj;
};

const processObject = obj => {
  function processValue(value) {
    if (value instanceof Array) {
      return value.map(o => processValue(o));
    } else if (typeof value === 'object') {
      return processObject(value);
    }
    return value;
  }

  if (!obj) {
    return obj;
  }

  if (isNuxeoObject(obj)) {
    return processNuxeoObject(obj);
  }

  return _objectEntries(obj).map(([key, value]) => ({ [key]: processValue(value) })).reduce((acc, o) => Object.assign(acc, o), {});
};

// default marshallers

const DOCUMENT_OPTIONAL_FIELDS = ['name', 'type', 'changeToken'];

const documentMarshaller = obj => {
  const {
    [ENTITY_TYPE_KEY]: entityType,
    uid,
    properties
  } = obj;

  const doc = {
    [ENTITY_TYPE_KEY]: entityType,
    uid,
    properties: processObject(properties)
  };

  DOCUMENT_OPTIONAL_FIELDS.map(field => obj[field] ? { [field]: obj[field] } : {}).reduce((acc, o) => Object.assign(acc, o), doc);
  return doc;
};

const directoryEntryMarshaller = obj => {
  const {
    [ENTITY_TYPE_KEY]: entityType,
    id,
    directoryName,
    properties
  } = obj;

  return {
    [ENTITY_TYPE_KEY]: entityType,
    id,
    directoryName,
    properties: processObject(properties)
  };
};

const userMarshaller = obj => {
  const {
    [ENTITY_TYPE_KEY]: entityType,
    id,
    properties
  } = obj;

  return {
    [ENTITY_TYPE_KEY]: entityType,
    id,
    properties: processObject(properties)
  };
};
const groupMarshaller = obj => {
  const {
    [ENTITY_TYPE_KEY]: entityType,
    id,
    groupname,
    grouplabel,
    memberUsers,
    memberGroups,
    properties
  } = obj;

  return {
    [ENTITY_TYPE_KEY]: entityType,
    id,
    groupname,
    grouplabel,
    memberUsers,
    memberGroups,
    properties
  };
};

const marshallers = {};

const Marshallers = {
  registerMarshaller: (entityType, marshaller) => {
    marshallers[entityType] = marshaller;
  },

  marshall: obj => {
    const entityType = obj[ENTITY_TYPE_KEY];
    const marshaller = marshallers[entityType];
    return marshaller && marshaller(obj) || obj;
  },

  documentMarshaller,
  directoryEntryMarshaller,
  userMarshaller,
  groupMarshaller
};

module.exports = Marshallers;

},{}],22:[function(require,module,exports){
'use strict';

/**
 * @deprecated since version 3.5.0.
 */
module.exports = {
  LTS_2015: '7.10',
  LTS_2016: '8.10',
  LTS_2017: '9.10'
};

},{}],23:[function(require,module,exports){
'use strict';

const extend = require('extend');
const Base = require('./base');
const ServerVersion = require('./server-version');
const Operation = require('./operation');
const Request = require('./request');
const Repository = require('./repository');
const BatchUpload = require('./upload/batch');
const Users = require('./user/users');
const Groups = require('./group/groups');
const Directory = require('./directory/directory');
const Workflows = require('./workflow/workflows');
const join = require('./deps/utils/join');
const Promise = require('./deps/promise');
const qs = require('querystring');
const FormData = require('./deps/form-data');
const Authentication = require('./auth/auth');
const Unmarshallers = require('./unmarshallers/unmarshallers');
const Marshallers = require('./marshallers/marshallers');
const doFetch = require('./deps/fetch');

const API_PATH_V1 = 'api/v1/';
const AUTOMATION = 'automation/';

const DEFAULT_OPTS = {
  baseURL: 'http://localhost:8080/nuxeo/',
  apiPath: API_PATH_V1,
  promiseLibrary: null,
  auth: null
};

/**
 * The `Nuxeo` class allows using the REST API of a Nuxeo Platform instance.
 * @extends Base
 *
 * @example
 * var Nuxeo = require('nuxeo')
 * var nuxeo = new Nuxeo({
 *  baseURL: 'http://localhost:8080/nuxeo',
 *  auth: {
 *    method: 'basic',
 *    username: 'Administrator',
 *    password: 'Administrator'
 *  }
 * });
 * nuxeo.request('path/')
 *   .get()
 *   .then(function(doc) {
 *     // doc.uid !== null
 *   });
 */
class Nuxeo extends Base {
  /**
   * Creates a new Nuxeo instance.
   * @param {object} [opts] - The configuration options.
   * @param {string} [opts.baseURL=http://localhost:8080/nuxeo/] - Base URL of the Nuxeo Platform.
   * @param {string} [opts.apiPath=api/v1] - The API path.
   * @param {object} [opts.auth] - The authentication configuration.
   */
  constructor(opts = {}) {
    const options = extend(true, {}, DEFAULT_OPTS, opts);
    super(options);
    this._baseURL = options.baseURL;
    this._restURL = join(this._baseURL, options.apiPath);
    this._automationURL = join(this._restURL, AUTOMATION);
    this._auth = options.auth;
    this._authenticationRefreshedListeners = [];
    this.connected = false;
    this.Promise = Nuxeo.Promise || Promise;
    this._activeRequests = 0;
  }

  /**
   * Connects to the Nuxeo Platform instance using the configured authentication.
   *
   * This method fills the `user` property with the current user
   * and the `serverVersion` property with the Nuxeo Server version.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A promise resolved with the connected client.
   */
  connect(opts = {}) {
    let finalOptions = {
      method: 'GET',
      url: join(this._baseURL, 'json/cmis')
    };
    finalOptions = extend(true, finalOptions, opts);
    finalOptions = this._computeOptions(finalOptions);
    return this.http(finalOptions).then(res => {
      if (res && res.default && res.default.productVersion) {
        this.serverVersion = new ServerVersion(res.default.productVersion);
        this.nuxeoVersion = res.default.productVersion;
      }
      // log the user
      finalOptions.method = 'POST';
      finalOptions.url = join(this._automationURL, 'login');
      return this.http(finalOptions);
    }).then(res => this.users({ enrichers: { user: ['userprofile'] } }).fetch(res.username)).then(user => {
      this.user = user;
      this.connected = true;
      return this;
    });
  }

  /**
   * Connects to the Nuxeo Platform instance using the configured authentication.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A promise resolved with the logged in user.
   * @deprecated since version 3.0, use {#connect} instead.
   */
  login(opts = {}) {
    return this.connect(opts);
  }

  /**
   * Does a http request.
   *
   * To be used when doing any call on Nuxeo Platform.
   */
  http(opts = {}) {
    const options = this._computeFetchOptions(opts);
    return new this.Promise((resolve, reject) => {
      this._activeRequests += 1;

      const fetchOptions = {
        method: options.method,
        headers: options.headers,
        body: options.body
      };
      if (!this._auth) {
        fetchOptions.credentials = 'include';
      }

      doFetch(options.url, fetchOptions).then(res => {
        this._activeRequests -= 1;
        if (res.status === 401 && !opts.refreshedAuthentication && Authentication.canRefreshAuthentication(this._auth)) {
          // try re-authenticate
          opts.refreshedAuthentication = true;
          return Authentication.refreshAuthentication(this._baseURL, this._auth).then(refreshedAuth => {
            this._auth = refreshedAuth;
            this._notifyAuthenticationRefreshed(refreshedAuth);
            return resolve(this.http(opts));
          }).catch(() => {
            const error = new Error(res.statusText);
            error.response = res;
            return reject(error);
          });
        }

        if (!/^2/.test(`${res.status}`)) {
          const error = new Error(res.statusText);
          error.response = res;
          return reject(error);
        }

        if (options.resolveWithFullResponse || res.status === 204) {
          return resolve(res);
        }

        const contentType = res.headers.get('content-type');
        if (contentType && contentType.indexOf('application/json') === 0) {
          options.nuxeo = this;
          return resolve(res.json().then(json => Unmarshallers.unmarshall(json, options, res)));
        }
        return resolve(res);
      }).catch(error => {
        this._activeRequests -= 1;
        return reject(error);
      });
    });
  }

  /**
   * Does a http request.
   *
   * To be used when doing any call on Nuxeo Platform.
   * @deprecated since version 3.3, use {#http} instead.
   */
  _http(opts = {}) {
    return this.http(opts);
  }

  _computeFetchOptions(opts) {
    let options = {
      method: 'GET',
      headers: {},
      json: true,
      timeout: 30000,
      cache: false,
      resolveWithFullResponse: false
    };
    options = extend(true, {}, options, opts);
    const authenticationHeaders = Authentication.computeAuthenticationHeaders(this._auth);
    options.headers = extend(options.headers, authenticationHeaders);

    if (options.schemas && options.schemas.length > 0) {
      options.headers.properties = options.schemas.join(',');
    }
    if (opts.repositoryName !== undefined) {
      options.headers['X-NXRepository'] = options.repositoryName;
    }

    if (opts.enrichers) {
      Object.keys(opts.enrichers).forEach(key => {
        options.headers[`enrichers-${key}`] = options.enrichers[key].join(',');
      });
    }

    if (opts.fetchProperties) {
      Object.keys(opts.fetchProperties).forEach(key => {
        options.headers[`fetch-${key}`] = options.fetchProperties[key].join(',');
      });
    }

    if (opts.translateProperties) {
      Object.keys(opts.translateProperties).forEach(key => {
        options.headers[`translate-${key}`] = options.translateProperties[key].join(',');
      });
    }

    if (options.depth) {
      options.headers.depth = options.depth;
    }

    const { httpTimeout, transactionTimeout } = this._computeTimeouts(options);
    if (transactionTimeout) {
      options.headers['Nuxeo-Transaction-Timeout'] = transactionTimeout;
    }
    options.timeout = httpTimeout;

    if (options.json) {
      options.headers.Accept = 'application/json';
      options.headers['Content-Type'] = options.headers['Content-Type'] || 'application/json';
      // do not marshall/stringify FormData
      if (typeof options.body === 'object' && !(options.body instanceof FormData)) {
        options.body = JSON.stringify(Marshallers.marshall(options.body));
      }
    }

    if (options.method === 'GET') {
      delete options.headers['Content-Type'];
    }

    if (options.queryParams && Object.keys(options.queryParams).length > 0) {
      options.url += options.url.indexOf('?') === -1 ? '?' : '';
      options.url += qs.stringify(options.queryParams);
    }
    return options;
  }

  _computeTimeouts(options) {
    const transactionTimeout = options.transactionTimeout || options.timeout;
    let httpTimeout = options.httpTimeout;
    if (!httpTimeout && transactionTimeout) {
      // make the http timeout a bit longer than the transaction timeout
      httpTimeout = 5 + transactionTimeout;
    }
    return { httpTimeout, transactionTimeout };
  }

  /**
   * Creates a new {@link Operation} object.
   * @param {string} id - The operation ID.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Operation}
   */
  operation(id, opts = {}) {
    let finalOptions = {
      id,
      nuxeo: this,
      url: this._automationURL
    };
    finalOptions = extend(true, finalOptions, opts);
    finalOptions = this._computeOptions(finalOptions);
    return new Operation(finalOptions);
  }

  /**
   * Creates a new {@link Request} object.
   * @param {string} path - The request default path.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Request}
   */
  request(path, opts = {}) {
    let finalOptions = {
      path,
      nuxeo: this,
      url: this._restURL
    };
    finalOptions = extend(true, finalOptions, opts);
    finalOptions = this._computeOptions(finalOptions);
    return new Request(finalOptions);
  }

  /**
   * Creates a new {@link Repository} object.
   * @param {string} name - The repository name. Default to the Nuxeo's repository name.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Repository}
   */
  repository(name = null, opts = {}) {
    let repositoryName = name;
    let options = opts;
    if (typeof repositoryName === 'object') {
      options = repositoryName;
      repositoryName = null;
    }

    let finalOptions = {
      nuxeo: this
    };
    if (repositoryName) {
      finalOptions.repositoryName = repositoryName;
    }
    finalOptions = extend(true, finalOptions, options);
    finalOptions = this._computeOptions(finalOptions);
    return new Repository(finalOptions);
  }

  /**
   * Creates a new {@link BatchUpload} object.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {BatchUpload}
   */
  batchUpload(opts = {}) {
    let finalOptions = {
      nuxeo: this,
      url: this._restURL
    };
    finalOptions = extend(true, finalOptions, opts);
    finalOptions = this._computeOptions(finalOptions);
    return new BatchUpload(finalOptions);
  }

  /**
   * Creates a new {@link Users} object to manage users.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Users}
   */
  users(opts = {}) {
    let finalOptions = {
      nuxeo: this
    };
    finalOptions = extend(true, finalOptions, opts);
    finalOptions = this._computeOptions(finalOptions);
    return new Users(finalOptions);
  }

  /**
   * Creates a new {@link Groups} object to manage groups.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Groups}
   */
  groups(opts = {}) {
    let finalOptions = {
      nuxeo: this
    };
    finalOptions = extend(true, finalOptions, opts);
    finalOptions = this._computeOptions(finalOptions);
    return new Groups(finalOptions);
  }

  /**
   * Creates a new {@link Directory} object.
   * @param {string} name - The directory name.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Directory}
   */
  directory(name, opts = {}) {
    let finalOptions = {
      directoryName: name,
      nuxeo: this
    };
    finalOptions = extend(true, finalOptions, opts);
    finalOptions = this._computeOptions(finalOptions);
    return new Directory(finalOptions);
  }

  /**
   * Creates a new {@link Workflows} object.
   * @param {string} name - The repository name. Default to the Nuxeo's repository name.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Workflows}
   */
  workflows(repositoryName = this._repositoryName, opts = {}) {
    let finalOptions = {
      repositoryName,
      nuxeo: this
    };
    finalOptions = extend(true, finalOptions, opts);
    finalOptions = this._computeOptions(finalOptions);
    return new Workflows(finalOptions);
  }

  requestAuthenticationToken(applicationName, deviceId, deviceDescription, permission, opts = {}) {
    let finalOptions = {
      method: 'GET',
      url: join(this._baseURL, 'authentication', 'token'),
      queryParams: {
        applicationName,
        deviceId,
        deviceDescription,
        permission
      }
    };
    finalOptions = extend(true, finalOptions, opts);
    finalOptions = this._computeOptions(finalOptions);
    return this.http(finalOptions).then(res => res.text());
  }

  computeAuthenticationHeaders() {
    return Authentication.computeAuthenticationHeaders(this._auth);
  }

  authenticateURL(url) {
    return Authentication.authenticateURL(url, this._auth);
  }

  onAuthenticationRefreshed(listener) {
    this._authenticationRefreshedListeners.push(listener);
  }

  _notifyAuthenticationRefreshed(refreshedAuthentication) {
    this._authenticationRefreshedListeners.forEach(listener => listener.call(this, refreshedAuthentication));
  }
}

/**
 * Sets the Promise library class to use.
 */
Nuxeo.promiseLibrary = promiseLibrary => {
  Nuxeo.Promise = promiseLibrary;
};

/**
 * Registers an Authenticator for a given authentication method.
 */
Nuxeo.registerAuthenticator = (method, authenticator) => {
  Authentication.registerAuthenticator(method, authenticator);
};

/**
 * Registers an Unmarshaller for a given entity type.
 */
Nuxeo.registerUnmarshaller = (entityType, unmarshaller) => {
  Unmarshallers.registerUnmarshaller(entityType, unmarshaller);
};

/**
 * Registers an Marshaller for a given entity type.
 */
Nuxeo.registerMarshaller = (entityType, marshaller) => {
  Marshallers.registerMarshaller(entityType, marshaller);
};

module.exports = Nuxeo;

},{"./auth/auth":1,"./base":3,"./deps/fetch":6,"./deps/form-data":7,"./deps/promise":8,"./deps/utils/join":13,"./directory/directory":14,"./group/groups":18,"./marshallers/marshallers":21,"./operation":24,"./repository":25,"./request":26,"./server-version":27,"./unmarshallers/unmarshallers":28,"./upload/batch":29,"./user/users":32,"./workflow/workflows":35,"extend":41,"querystring":51}],24:[function(require,module,exports){
'use strict';

const extend = require('extend');
const Base = require('./base');
const join = require('./deps/utils/join');
const encodePath = require('./deps/utils/encodePath');
const Blob = require('./blob');
const BatchBlob = require('./upload/blob');
const BatchUpload = require('./upload/batch');
const Document = require('./document');
const FormData = require('./deps/form-data');

const isDocument = obj => obj instanceof Document || typeof obj === 'object' && obj['entity-type'] === 'document';

/**
 * The `Operation` class allows to execute an operation on a Nuxeo Platform instance.
 *
 * **Cannot directly be instantiated**
 *
 * @example
 * var Nuxeo = require('nuxeo')
 * var nuxeo = new Nuxeo({
 *  baseURL: 'http://localhost:8080/nuxeo',
 *  auth: {
 *    method: 'basic',
 *    username: 'Administrator',
 *    password: 'Administrator'
 *  }
 * });
 * nuxeo.operation('Document.GetChild')
 *   .input('/default-domain')
 *   .params({
 *     name: 'workspaces',
 *   })
 *   .execute()
 *   .then(function(res) {
 *     // res.uid !== null
 *     // res.title === 'Workspaces'
 *   })
 *   .catch(function(error) {
 *     throw new Error(error);
 *   });
 */
class Operation extends Base {
  /**
   * Creates an Operation.
   * @param {string} opts - The configuration options.
   * @param {string} opts.nuxeo - The {@link Nuxeo} object linked to this `Operation` object.
   * @param {string} opts.id - The ID of the operation.
   * @param {string} opts.url - The automation URL.
   */
  constructor(opts) {
    const options = extend(true, {}, opts);
    super(options);
    this._nuxeo = options.nuxeo;
    this._id = options.id;
    this._url = options.url;
    this._automationParams = {
      params: {},
      context: {},
      input: undefined
    };
  }

  /**
   * Adds an operation param.
   * @param {string} name - The param name.
   * @param {string} value - The param value.
   * @returns {Operation} The operation itself.
   */
  param(name, value) {
    this._automationParams.params[name] = value;
    return this;
  }

  /**
   * Adds operation params. The given params are merged with the existing ones if any.
   * @param {object} params - The params to be merge with the existing ones.
   * @returns {Operation} The operation itself.
   */
  params(params) {
    this._automationParams.params = extend(true, {}, this._automationParams.params, params);
    return this;
  }

  /**
   * Sets this operation context.
   * @param {object} context - The operation context.
   * @returns {Operation} The operation itself.
   */
  context(context) {
    this._automationParams.context = context;
    return this;
  }

  /**
   * Sets this operation input.
   * @param {string|Array|Blob|BatchBlob|BatchUpload} input - The operation input.
   * @returns {Operation} The operation itself.
   */
  input(input) {
    this._automationParams.input = input;
    return this;
  }

  /**
   * Executes this operation.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A Promise object resolved with the result of the Operation.
   */
  execute(opts = {}) {
    opts.headers = opts.headers || {};
    opts.headers['Content-Type'] = this._computeContentTypeHeader(this._automationParams.input);
    const options = this._computeOptions(opts);
    let finalOptions = {
      method: 'POST',
      url: this._computeRequestURL(),
      body: this._computeRequestBody()
    };
    finalOptions = extend(true, finalOptions, options);
    return this._nuxeo.http(finalOptions);
  }

  _computeContentTypeHeader(input) {
    let contentType = 'application/json+nxrequest';
    if (this._isMultipartInput(input)) {
      contentType = 'multipart/form-data';
    } else if (this._isBatchInput(input)) {
      contentType = 'application/json';
    }
    return contentType;
  }

  _computeRequestURL() {
    const input = this._automationParams.input;
    if (input instanceof BatchBlob) {
      return join(this._nuxeo._restURL, 'upload', input['upload-batch'], input['upload-fileId'], 'execute', this._id);
    } else if (input instanceof BatchUpload) {
      return join(this._nuxeo._restURL, 'upload', input._batchId, 'execute', this._id);
    }

    return join(this._url, encodePath(this._id));
  }

  _computeRequestBody() {
    const input = this._automationParams.input;
    if (this._isBatchInput(input)) {
      // no input needed
      const body = extend(true, {}, this._automationParams);
      body.input = undefined;
      return body;
    }

    if (input instanceof Array) {
      if (input.length > 0) {
        const first = input[0];
        if (isDocument(first)) {
          // assume document list
          const docs = input.map(doc => doc.uid);
          this._automationParams.input = `docs:${docs.join(',')}`;
          return this._automationParams;
        } else if (typeof first === 'string') {
          // assume ref list
          this._automationParams.input = `docs:${input.join(',')}`;
          return this._automationParams;
        } else if (first instanceof Blob) {
          // blob list => multipart
          const automationParams = {
            params: this._automationParams.params,
            context: this._automationParams.context
          };
          const form = new FormData();
          form.append('params', JSON.stringify(automationParams));

          let inputIndex = 0;
          // eslint-disable-next-line prefer-const
          for (var _iterator = input, _isArray = Array.isArray(_iterator), _i = 0, _iterator = _isArray ? _iterator : _iterator[Symbol.iterator]();;) {
            var _ref;

            if (_isArray) {
              if (_i >= _iterator.length) break;
              _ref = _iterator[_i++];
            } else {
              _i = _iterator.next();
              if (_i.done) break;
              _ref = _i.value;
            }

            let blob = _ref;

            form.append(`input#${inputIndex}`, blob.content, blob.name);
            inputIndex += 1;
          }
          return form;
        }
      }
    } else if (isDocument(input)) {
      this._automationParams.input = input.uid;
      return this._automationParams;
    } else if (input instanceof Blob) {
      const automationParams = {
        params: this._automationParams.params,
        context: this._automationParams.context
      };
      const form = new FormData();
      form.append('params', JSON.stringify(automationParams));
      form.append('input', input.content, input.name);
      return form;
    }
    return this._automationParams;
  }

  _isMultipartInput(input) {
    if (input instanceof Array) {
      if (input.length > 0) {
        const first = input[0];
        if (first instanceof Blob) {
          return true;
        }
      }
    } else if (input instanceof Blob) {
      return true;
    }
    return false;
  }

  _isBatchInput(input) {
    return input instanceof BatchUpload || input instanceof BatchBlob;
  }
}

module.exports = Operation;

},{"./base":3,"./blob":4,"./deps/form-data":7,"./deps/utils/encodePath":11,"./deps/utils/join":13,"./document":16,"./upload/batch":29,"./upload/blob":30,"extend":41}],25:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

const Base = require('./base');
const join = require('./deps/utils/join');
const { LTS_2016 } = require('./server-version');

function computePath(ref) {
  return join(ref.indexOf('/') === 0 ? 'path' : 'id', ref);
}

/**
 * The `Repository` class allows to work with documents on a Nuxeo Platform instance.
 *
 * **Cannot directly be instantiated**
 *
 * @example
 * var Nuxeo = require('nuxeo')
 * var nuxeo = new Nuxeo({
 *  baseURL: 'http://localhost:8080/nuxeo',
 *  auth: {
 *    method: 'basic',
 *    username: 'Administrator',
 *    password: 'Administrator'
 *  }
 * });
 * nuxeo.repository('default')
 *   .fetch('/default-domain')
 *   .then(function(res) {
 *     // res.uid !== null
 *     // res.type === 'Domain'
 *   })
 *   .catch(function(error) {
 *     throw new Error(error);
 *   });
 */
class Repository extends Base {
  /**
   * Creates a Repository.
   * @param {object} opts - The configuration options.
   * @param {string} opts.nuxeo - The {@link Nuxeo} object linked to this repository.
   */
  constructor(opts = {}) {
    super(opts);
    this._nuxeo = opts.nuxeo;
  }

  /**
   * Fetches a document given a document ref.
   * @param {string} ref - The document ref. A path if starting with '/', otherwise and id.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A Promise object resolved with the {@link Document}.
   */
  fetch(ref, opts = {}) {
    const options = this._computeOptions(opts);
    const path = computePath(ref);
    options.repository = this;
    return this._nuxeo.request(path).get(options);
  }

  /**
   * Creates a document.
   * @param {string} parentRef - The parent document ref. A path if starting with '/', otherwise and id.
   * @param {object} doc - The document to be created.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A Promise object resolved with the created {@link Document}.
   */
  create(parentRef, doc, opts = {}) {
    opts.body = _extends({}, doc, {
      'entity-type': 'document'
    });
    const options = this._computeOptions(opts);
    const path = computePath(parentRef);
    options.repository = this;
    return this._nuxeo.request(path).post(options);
  }

  /**
   * Updates a document. Assumes that the doc object has an uid field.
   * @param {object} doc - The document to be updated.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A Promise object resolved with the updated {@link Document}.
   */
  update(doc, opts = {}) {
    opts.body = _extends({}, doc, {
      'entity-type': 'document'
    });
    const options = this._computeOptions(opts);
    const path = join('id', doc.uid);
    options.repository = this;
    return this._nuxeo.request(path).put(options);
  }

  /**
   * Deletes a document given a document ref.
   * @param {string} ref - The document ref. A path if starting with '/', otherwise and id.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A Promise object resolved with the result of the DELETE request.
   */
  delete(ref, opts = {}) {
    const options = this._computeOptions(opts);
    const path = computePath(ref);
    return this._nuxeo.request(path).delete(options);
  }

  /**
   * Performs a query returning documents.
   * Named parameters can be set in the `queryOpts` object, such as
   * { query: ..., customParam1: 'foo', anotherParam: 'bar'}
   * @param {object} queryOpts - The query options.
   * @param {string} queryOpts.query - The query to execute. `query` or `pageProvider` must be set.
   * @param {string} queryOpts.pageProvider - The page provider name to execute. `query` or `pageProvider` must be set.
   * @param {array} [queryOpts.queryParams] - Ordered parameters for the query or page provider.
   * @param {number} [queryOpts.pageSize=0] - The number of results per page.
   * @param {number} [queryOpts.currentPageIndex=0] - The current page index.
   * @param {number} [queryOpts.maxResults] - The expected max results.
   * @param {string} [queryOpts.sortBy] - The sort by info.
   * @param {string} [queryOpts.sortOrder] - The sort order info.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A Promise object resolved with the response where the entries are replaced
   *                    with Document objetcs.
   */
  query(queryOpts, opts = {}) {
    const options = this._computeOptions(opts);
    const path = this._computeQueryPath(queryOpts);
    options.repository = this;
    return this._nuxeo.request(path).queryParams(queryOpts).get(options);
  }

  _computeQueryPath(queryOpts) {
    const serverVersion = this._nuxeo.serverVersion;
    const isSearchEndPoint = serverVersion && serverVersion.gte(LTS_2016);
    const path = isSearchEndPoint ? join('search', queryOpts.query ? 'lang/NXQL' : `pp/${queryOpts.pageProvider}`, 'execute') : join('query', queryOpts.query ? 'NXQL' : queryOpts.pageProvider);
    return path;
  }
}

module.exports = Repository;

},{"./base":3,"./deps/utils/join":13,"./server-version":27}],26:[function(require,module,exports){
'use strict';

const extend = require('extend');
const join = require('./deps/utils/join');
const encodePath = require('./deps/utils/encodePath');
const Base = require('./base');

const defaultOptions = {
  path: '',
  queryParams: {}
};

/**
 * The `Request` class allows to execute REST request on a Nuxeo Platform instance.
 *
 * **Cannot directly be instantiated**
 *
 * @example
 * var Nuxeo = require('nuxeo')
 * var nuxeo = new Nuxeo({
 *  baseURL: 'http://localhost:8080/nuxeo',
 *  auth: {
 *    method: 'basic',
 *    username: 'Administrator',
 *    password: 'Administrator'
 *  }
 * });
 * nuxeo.request('/path/default-domain')
 *   .get()
 *   .then(function(res) {
 *     // res.uid !== null
 *     // res.type === 'Domain'
 *   })
 *   .catch(function(error) {
 *     throw new Error(error);
 *   });
 */
class Request extends Base {
  /**
   * Creates a Request.
   * @param {object} opts - The configuration options.
   * @param {string} opts.nuxeo - The {@link Nuxeo} object linked to this groups object.
   * @param {string} opts.path - The initial path of the request.
   * @param {string} opts.queryParams - The initial query parameters of the request.
   * @param {string} opts.url - The REST API URL.
   */
  constructor(opts = {}) {
    const options = extend(true, {}, defaultOptions, opts);
    super(options);
    this._nuxeo = options.nuxeo;
    this._path = options.path;
    this._queryParams = options.queryParams;
    this._url = options.url;
  }

  /**
   * Adds path segment.
   * @param {string} path - The path segment.
   * @returns {Request} The request itself.
   */
  path(path) {
    this._path = join(this._path, path);
    return this;
  }

  /**
   * Adds query params. The given query params are merged with the existing ones if any.
   * @param {object} queryParams - The query params to be merged with the existing ones.
   * @returns {Request} The request itself.
   */
  queryParams(queryParams) {
    this._queryParams = extend(true, {}, this._queryParams, queryParams);
    return this;
  }

  /**
   * Performs a GET request.
   * @param {object} opts - Options overriding the ones from the Request object.
   * @returns {Promise} A Promise object resolved with the result of the request.
   */
  get(opts = {}) {
    opts.method = 'GET';
    return this.execute(opts);
  }

  /**
   * Performs a POST request.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A Promise object resolved with the result of the request.
   */
  post(opts = {}) {
    opts.method = 'POST';
    return this.execute(opts);
  }

  /**
   * Performs a PUT request.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A Promise object resolved with the result of the request.
   */
  put(opts = {}) {
    opts.method = 'PUT';
    return this.execute(opts);
  }

  /**
   * Performs a DELETE request.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A Promise object resolved with the result of the request.
   */
  delete(opts = {}) {
    opts.method = 'DELETE';
    return this.execute(opts);
  }

  /**
   * Performs a Request.
   * @param {object} opts - Options overriding the ones from this object.
   * @param {string} opts.method - The HTTP method.
   * @returns {Promise} A Promise object resolved with the result of the request.
   */
  execute(opts = {}) {
    const options = this._computeOptions(opts);

    let path = this._path;
    const repositoryName = options.repositoryName;
    if (repositoryName !== undefined) {
      path = join('repo', repositoryName, path);
    }

    const url = join(this._url, encodePath(path));
    let finalOptions = {
      url,
      queryParams: this._queryParams
    };
    finalOptions = extend(true, finalOptions, options);
    return this._nuxeo.http(finalOptions);
  }
}

module.exports = Request;

},{"./base":3,"./deps/utils/encodePath":11,"./deps/utils/join":13,"extend":41}],27:[function(require,module,exports){
'use strict';

const SERVER_VERSION_PATTERN = /(\d+)\.(\d+)(?:-HF(\d+))?/;

/**
 * The `ServerVersion` class represents a Nuxeo Server version.
 *
 * It handles major, minor and hotfix version.
 *
 * Limitations:
 *   - Ignore the `-SNAPSHOT` and `-IXXXXXXXX_XXXX` suffixes when parsing the server version
 *   - '9.10-SNAPSHOT' is considered equals to '9.10'
 *   - '9.10-20180101_1212' is considered equals to '9.10'
 */
class ServerVersion {

  constructor(version) {
    const match = version.match(SERVER_VERSION_PATTERN);
    if (!match) {
      throw new Error(`Unknown Nuxeo Server version: ${version}`);
    }

    this.major = parseInt(match[1], 10);
    this.minor = parseInt(match[2], 10);
    this.hotfix = parseInt(match[3], 10) || -1;
    this.version = version;
  }

  static create(version) {
    return typeof version === 'string' ? new ServerVersion(version) : version;
  }

  /**
   * Returns whether this version is equal to the `version` param.
   *
   * @param {string|ServerVersion} version - The other version.
   */
  eq(version) {
    const other = ServerVersion.create(version);
    return this.major === other.major && this.minor === other.minor && this.hotfix === other.hotfix;
  }

  /**
   * Returns whether this version is greater than the `version` param.
   *
   * @param {string|ServerVersion} version - The other version.
   */
  gt(version) {
    const other = ServerVersion.create(version);
    return this.major > other.major || this.major === other.major && this.minor > other.minor || this.major === other.major && this.minor === other.minor && this.hotfix > other.hotfix;
  }

  /**
   * Returns whether this version is lesser than the `version` param.
   *
   * @param {string|ServerVersion} version - The other version.
   */
  lt(version) {
    const other = ServerVersion.create(version);
    return this.major < other.major || this.major === other.major && this.minor < other.minor || this.major === other.major && this.minor === other.minor && this.hotfix < other.hotfix;
  }

  /**
   * Returns whether this version is greater than or equal to the `version` param.
   *
   * @param {string|ServerVersion} version - The other version.
   */
  gte(version) {
    const other = ServerVersion.create(version);
    return this.eq(other) || this.gt(other);
  }

  /**
   * Returns whether this version is lesser than or equal to the `version` param.
   *
   * @param {string|ServerVersion} version - The other version.
   */
  lte(version) {
    const other = ServerVersion.create(version);
    return this.eq(other) || this.lt(other);
  }

  toString() {
    return this.version;
  }
}

const LTS_2015 = new ServerVersion('7.10');
const LTS_2016 = new ServerVersion('8.10');
const LTS_2017 = new ServerVersion('9.10');

ServerVersion.LTS_2015 = LTS_2015;
ServerVersion.LTS_2016 = LTS_2016;
ServerVersion.LTS_2017 = LTS_2017;
ServerVersion.SERVER_VERSIONS = { LTS_2015, LTS_2016, LTS_2017 };

module.exports = ServerVersion;

},{}],28:[function(require,module,exports){
'use strict';

const Document = require('../document');
const Workflow = require('../workflow/workflow');
const Task = require('../workflow/task');
const User = require('../user/user');
const Group = require('../group/group');
const DirectoryEntry = require('../directory/entry');

const unmarshallers = {};

const Unmarshallers = {
  registerUnmarshaller: (entityType, unmarshaller) => {
    unmarshallers[entityType] = unmarshaller;
  },

  unmarshall: (json, options) => {
    const entityType = json['entity-type'];
    const unmarshaller = unmarshallers[entityType];
    return unmarshaller && unmarshaller(json, options) || json;
  }
};

// default unmarshallers

const documentUnmarshaller = (json, options) => new Document(json, options);

const documentsUnmarshaller = (json, options) => {
  const { entries } = json;
  const docs = entries.map(doc => new Document(doc, options));
  json.entries = docs;
  return json;
};

const workflowUnmarshaller = (json, options) => new Workflow(json, options);

const workflowsUnmarshaller = (json, options) => {
  const { entries } = json;
  const workflows = entries.map(workflow => new Workflow(workflow, options));
  json.entries = workflows;
  return json;
};

const taskUnmarshaller = (json, options) => new Task(json, options);

const tasksUnmarshaller = (json, options) => {
  const { entries } = json;
  const tasks = entries.map(task => new Task(task, options));
  json.entries = tasks;
  return json;
};

const directoryEntryUnmarshaller = (json, options) => new DirectoryEntry(json, options);

const directoryEntriesUnmarshaller = (json, options) => {
  const { entries } = json;
  const directoryEntries = entries.map(directoryEntry => new DirectoryEntry(directoryEntry, options));
  json.entries = directoryEntries;
  return json;
};

const userUnmarshaller = (json, options) => new User(json, options);

const groupUnmarshaller = (json, options) => new Group(json, options);

Unmarshallers.documentUnmarshaller = documentUnmarshaller;
Unmarshallers.documentsUnmarshaller = documentsUnmarshaller;
Unmarshallers.workflowUnmarshaller = workflowUnmarshaller;
Unmarshallers.workflowsUnmarshaller = workflowsUnmarshaller;
Unmarshallers.taskUnmarshaller = taskUnmarshaller;
Unmarshallers.tasksUnmarshaller = tasksUnmarshaller;
Unmarshallers.directoryEntryUnmarshaller = directoryEntryUnmarshaller;
Unmarshallers.directoryEntriesUnmarshaller = directoryEntriesUnmarshaller;
Unmarshallers.userUnmarshaller = userUnmarshaller;
Unmarshallers.groupUnmarshaller = groupUnmarshaller;

module.exports = Unmarshallers;

},{"../directory/entry":15,"../document":16,"../group/group":17,"../user/user":31,"../workflow/task":33,"../workflow/workflow":34}],29:[function(require,module,exports){
'use strict';

const extend = require('extend');
const Base = require('../base');
const join = require('../deps/utils/join');
const flatten = require('../deps/utils/flatten');
const Queue = require('promise-queue');
const BatchBlob = require('./blob');

const DEFAULT_OPTS = {
  concurrency: 5
};

/**
 * The **BatchUpload** class allows to upload {@link Blob} objets to a Nuxeo Platform instance
 * using the batch upload API.
 *
 * It creates and maintains a batch id from the Nuxeo Platform instance.
 *
 * **Cannot directly be instantiated**
 *
 * @example
 * var Nuxeo = require('nuxeo')
 * var nuxeo = new Nuxeo({
 *  baseURL: 'http://localhost:8080/nuxeo',
 *  auth: {
 *    method: 'basic',
 *    username: 'Administrator',
 *    password: 'Administrator'
 *  }
 * });
 * var batch = nuxeo.batchUpload();
 * var nuxeoBlob = new Nuxeo.Blob(...);
 * batch.upload(nuxeoBlob)
 *   .then(function(res) {
 *     // res.blob instanceof BatchBlob === true
 *   })
 *   .catch(function(error) {
 *     throw new Error(error);
 *   });
 */
class BatchUpload extends Base {
  /**
   * Creates a BatchUpload.
   * @param {object} opts - The configuration options.
   * @param {string} opts.nuxeo - The {@link Nuxeo} object linked to this BatchUpload object.
   * @param {Number} [opts.concurrency=5] - Number of concurrent uploads.
   */
  constructor(opts = {}) {
    const options = extend(true, {}, DEFAULT_OPTS, opts);
    super(options);
    this._url = join(options.url, 'upload/');
    this._nuxeo = options.nuxeo;
    this._uploadIndex = 0;
    Queue.configure(this._nuxeo.Promise);
    this._queue = new Queue(options.concurrency, Infinity);
    this._batchIdPromise = null;
    this._batchId = null;
    this._promises = [];
  }

  /**
   * Upload one or more blobs.
   * @param {...Blob} blobs - Blobs to be uploaded.
   * @returns {Promise} A Promise object resolved when all blobs are uploaded.
   *
   * @example
   * ...
   * nuxeoBatch.upload(blob1, blob2, blob3)
   *   .then(function(res) {
   *     // res.batch === nuxeoBatch
   *     // res.blobs[0] is the BatchBlob object related to blob1
   *     // res.blobs[1] is the BatchBlob object related to blob2
   *     // res.blobs[2] is the BatchBlob object related to blob3
   *   })
   *   .catch(function(error) {
   *     throw new Error(error);
   *   });
   */
  upload(...blobs) {
    const allBlobs = flatten(blobs);
    const promises = allBlobs.map(blob => {
      const promise = this._queue.add(this._upload.bind(this, blob));
      this._promises.push(promise);
      return promise;
    });
    if (promises.length === 1) {
      return promises[0];
    }

    const Promise = this._nuxeo.Promise;
    return Promise.all(promises).then(batchBlobs => ({
      blobs: batchBlobs.map(batchBlob => batchBlob.blob),
      batch: this
    }));
  }

  _upload(blob) {
    if (!this._batchIdPromise) {
      this._batchIdPromise = this._fetchBatchId();
    }

    const uploadIndex = this._uploadIndex;
    this._uploadIndex += 1;
    return this._batchIdPromise.then(() => {
      const opts = {
        json: false,
        method: 'POST',
        url: join(this._url, this._batchId, uploadIndex),
        body: blob.content,
        headers: {
          'Cache-Control': 'no-cache',
          'X-File-Name': encodeURIComponent(blob.name),
          'X-File-Size': blob.size,
          'X-File-Type': blob.mimeType,
          'Content-Length': blob.size
        }
      };
      const options = this._computeOptions(opts);
      return this._nuxeo.http(options);
    }).then(res => {
      res.batchId = this._batchId;
      res.index = uploadIndex;
      return {
        blob: new BatchBlob(res),
        batch: this
      };
    });
  }

  _fetchBatchId() {
    const opts = {
      method: 'POST',
      url: this._url
    };

    const Promise = this._nuxeo.Promise;
    if (this._batchId) {
      return Promise.resolve(this);
    }
    const options = this._computeOptions(opts);
    return this._nuxeo.http(options).then(res => {
      this._batchId = res.batchId;
      return this;
    });
  }

  /**
   * Wait for all the current uploads to be finished. Note that it won't wait for uploads added after done() being call.
   * If an uploaded is added, you should call again done().
   * The {@link BatchUpload#isFinished} method can be used to know if the batch is finished.
   * @returns {Promise} A Promise object resolved when all the current uploads are finished.
   *
   * @example
   * ...
   * nuxeoBatch.upload(blob1, blob2, blob3);
   * nuxeoBatch.done()
   *   .then(function(res) {
   *     // res.batch === nuxeoBatch
   *     // res.blobs[0] is the BatchBlob object related to blob1
   *     // res.blobs[1] is the BatchBlob object related to blob2
   *     // res.blobs[2] is the BatchBlob object related to blob3
   *   })
   *   .catch(function(error) {
   *     throw new Error(error);
   *   });
   */
  done() {
    const Promise = this._nuxeo.Promise;
    return Promise.all(this._promises).then(batchBlobs => ({
      blobs: batchBlobs.map(batchBlob => batchBlob.blob),
      batch: this
    }));
  }

  /**
   * Returns whether the BatchUpload is finished, ie. has uploads running, or not.
   * @returns {Boolean} true if the BatchUpload is finished, false otherwise.
   */
  isFinished() {
    return this._queue.getQueueLength() === 0 && this._queue.getPendingLength() === 0;
  }

  /**
   * Cancels a BatchUpload.
   * @returns {Promise} A Promise object resolved with the BatchUpload itself.
   */
  cancel(opts) {
    const Promise = this._nuxeo.Promise;
    if (!this._batchIdPromise) {
      return Promise.resolve(this);
    }

    const path = join('upload', this._batchId);
    return this._batchIdPromise.then(() => {
      const options = this._computeOptions(opts);
      return this._nuxeo.request(path).delete(options);
    }).then(() => {
      this._batchIdPromise = null;
      this._batchId = null;
      return this;
    });
  }

  /**
   * Fetches a blob at a given index from the batch.
   * @returns {Promise} A Promise object resolved with the BatchUpload itself and the BatchBlob.
   */
  fetchBlob(index, opts = {}) {
    const Promise = this._nuxeo.Promise;
    if (!this._batchId) {
      return Promise.reject(new Error('No \'batchId\' set'));
    }

    let options = {
      method: 'GET',
      url: join(this._url, this._batchId, index)
    };
    options = extend(true, options, opts);
    options = this._computeOptions(options);
    return this._nuxeo.http(options).then(res => {
      res.batchId = this._batchId;
      res.index = index;
      return {
        batch: this,
        blob: new BatchBlob(res)
      };
    });
  }

  /**
   * Removes a blob at a given index from the batch.
   * @returns {Promise} A Promise object resolved with the result of the DELETE request.
   */
  removeBlob(index, opts = {}) {
    const Promise = this._nuxeo.Promise;
    if (!this._batchId) {
      return Promise.reject(new Error('No \'batchId\' set'));
    }

    let options = {
      method: 'DELETE',
      url: join(this._url, this._batchId, index)
    };
    options = extend(true, options, opts);
    options = this._computeOptions(options);
    return this._nuxeo.http(options);
  }

  /**
   * Fetches the blobs from the batch.
   * @returns {Promise} A Promise object resolved with the BatchUpload itself and the BatchBlobs.
   */
  fetchBlobs(opts = {}) {
    const Promise = this._nuxeo.Promise;
    if (!this._batchId) {
      return Promise.reject(new Error('No \'batchId\' set'));
    }

    let options = {
      method: 'GET',
      url: join(this._url, this._batchId)
    };
    options = extend(true, options, opts);
    options = this._computeOptions(options);
    return this._nuxeo.http(options).then(blobs => {
      const batchBlobs = blobs.map((blob, index) => {
        blob.batchId = this._batchId;
        blob.index = index;
        return new BatchBlob(blob);
      });
      return {
        batch: this,
        blobs: batchBlobs
      };
    });
  }
}

module.exports = BatchUpload;

},{"../base":3,"../deps/utils/flatten":12,"../deps/utils/join":13,"./blob":30,"extend":41,"promise-queue":46}],30:[function(require,module,exports){
'use strict';

const extend = require('extend');

/**
 * The `BatchBlob` class wraps a blob uploaded through a {@link BatchUpload} to be used
 * in an {@link Operation} input or as a property value on a {@link Document}.
 */
class BatchBlob {
  constructor(data = {}) {
    this['upload-batch'] = data.batchId;
    this['upload-fileId'] = `${data.index}`;
    delete data.batchId;
    delete data.index;
    extend(this, data);
  }
}

module.exports = BatchBlob;

},{"extend":41}],31:[function(require,module,exports){
'use strict';

const extend = require('extend');
const Base = require('../base');

/**
 * The `User` class wraps an user.
 *
 * **Cannot directly be instantiated**
 */
class User extends Base {
  /**
   * Creates a User.
   * @param {object} user - The initial user object. This User object will be extended with user properties.
   * @param {object} opts - The configuration options.
   * @param {string} opts.users - The {@link Users} object linked to this user.
   */
  constructor(user, opts) {
    super(opts);
    this._users = opts.users;
    this.properties = {};
    this._dirtyProperties = {};
    extend(true, this, user);
  }

  /**
   * Sets user properties.
   * @param {object} properties - The properties to set.
   * @returns {User}
   *
   * @example
   * user.set({
   *   firstName: 'new first name',
   *   company: 'new company',
   * });
   */
  set(properties) {
    this._dirtyProperties = extend(true, {}, this._dirtyProperties, properties);
    return this;
  }

  /**
   * Gets a user property.
   * @param {string} propertyName - The property name, such as 'fistName', 'email', ...
   * @returns {User}
   */
  get(propertyName) {
    return this._dirtyProperties[propertyName] || this.properties[propertyName];
  }

  /**
   * Saves the user. It updates only the 'dirty properties' set through the {@link User#set} method.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A promise object resolved with the updated user.
   */
  save(opts = {}) {
    const options = this._computeOptions(opts);
    return this._users.update({
      id: this.id,
      properties: this._dirtyProperties
    }, options);
  }
}

module.exports = User;

},{"../base":3,"extend":41}],32:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

const Base = require('../base');
const join = require('../deps/utils/join');

const USER_PATH = 'user';

/**
 * The `Users` class allows to work with users on a Nuxeo Platform instance.
 *
 * **Cannot directly be instantiated**
 *
 * @example
 * var Nuxeo = require('nuxeo')
 * var nuxeo = new Nuxeo({
 *  baseURL: 'http://localhost:8080/nuxeo',
 *  auth: {
 *    method: 'basic',
 *    username: 'Administrator',
 *    password: 'Administrator',
 *  }
 * });
 * nuxeo.users()
 *   .fetch('Administrator')
 *   .then(function(res) => {
 *     // res.id === 'Administrator'
 *     // res.properties.username === 'Administrator'
 *   })
 *   .catch(function(error) {
 *     throw new Error(error);
 *   });
 */
class Users extends Base {
  /**
   * Creates a Users object.
   * @param {object} opts - The configuration options.
   * @param {string} opts.nuxeo - The {@link Nuxeo} object linked to this Users object.
   */
  constructor(opts) {
    super(opts);
    this._nuxeo = opts.nuxeo;
  }

  /**
   * Fetches an user given an username.
   * @param {string} username - The username.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A Promise object resolved with the {@link User}.
   */
  fetch(username, opts = {}) {
    const options = this._computeOptions(opts);
    const path = join(USER_PATH, username);
    options.users = this;
    return this._nuxeo.request(path).get(options);
  }

  /**
   * Creates an user.
   * @param {object} user - The user to be created.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A Promise object resolved with the created {@link User}.
   */
  create(user, opts = {}) {
    opts.body = _extends({}, user, {
      'entity-type': 'user'
    });
    const options = this._computeOptions(opts);
    options.users = this;
    return this._nuxeo.request(USER_PATH).post(options);
  }

  /**
   * Updates an user. Assumes that the user object has an id field.
   * @param {object} user - The user to be updated.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A Promise object resolved with the updated {@link User}.
   */
  update(user, opts = {}) {
    opts.body = _extends({}, user, {
      'entity-type': 'user'
    });
    const options = this._computeOptions(opts);
    const path = join(USER_PATH, user.id);
    options.users = this;
    return this._nuxeo.request(path).put(options);
  }

  /**
   * Deletes an user given an username.
   * @param {string} username - The username.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A Promise object resolved with the result of the DELETE request.
   */
  delete(username, opts = {}) {
    const options = this._computeOptions(opts);
    const path = join(USER_PATH, username);
    return this._nuxeo.request(path).delete(options);
  }
}

module.exports = Users;

},{"../base":3,"../deps/utils/join":13}],33:[function(require,module,exports){
'use strict';

const extend = require('extend');
const Base = require('../base');
const join = require('../deps/utils/join');

const TASK_PATH = 'task';

/**
 * The `Task` class wraps a task.
 *
 * **Cannot directly be instantiated**
 */
class Task extends Base {
  /**
   * Creates a `Task`.
   * @param {object} task - The initial task object. This Task object will be extended with task properties.
   * @param {object} opts - The configuration options.
   * @param {string} opts.nuxeo - The {@link Nuxeo} object linked to this task.
   * @param {string} [opts.documentId] - The attached document id of this workflow, if any.
   */
  constructor(task, opts) {
    super(opts);
    this._nuxeo = opts.nuxeo;
    this._documentId = opts.documentId;
    extend(true, this, task);
  }

  /**
   * Sets a task variable.
   * @param {string} name - The name of the variable.
   * @param {string} value - The value of the variable.
   * @returns {Task} The task itself.
   */
  variable(name, value) {
    this.variables[name] = value;
    return this;
  }

  /**
   * Completes the task.
   * @param {string} action - The action name to complete the task.
   * @param {object} [taskOpts] - Configuration options for the task completion.
   * @param {string} [taskOpts.variables] - Optional variables to override the existing ones.
   * @param {string} [taskOpts.comment] - Optional comment.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A promise object resolved with the completed task.
   */
  complete(action, taskOpts = {}, opts = {}) {
    const variables = taskOpts.variables || this.variables;
    opts.body = {
      variables,
      'entity-type': 'task',
      id: this.id,
      comment: taskOpts.comment
    };
    const options = this._computeOptions(opts);
    const path = join(TASK_PATH, this.id, action);
    return this._nuxeo.request(path).put(options);
  }

  /**
   * Reassigns the task to the given actors.
   * @param {string} actors - Actors to reassign the task.
   * @param {object} [taskOpts] - Configuration options for the task reassignment.
   * @param {string} [taskOpts.comment] - Optional comment.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A promise object resolved with nothing.
   */
  reassign(actors, taskOpts = {}, opts = {}) {
    const options = this._computeOptions(opts);
    const path = join(TASK_PATH, this.id, 'reassign');
    return this._nuxeo.request(path).queryParams({
      actors,
      comment: taskOpts.comment
    }).put(options);
  }

  /**
   * Delegates the task to the given actors.
   * @param {string} actors - Actors to delegate the task.
   * @param {object} [taskOpts] - Configuration options for the task delegation.
   * @param {string} [taskOpts.comment] - Optional comment.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A promise object resolved with nothing.
   */
  delegate(actors, taskOpts = {}, opts = {}) {
    const options = this._computeOptions(opts);
    const path = join(TASK_PATH, this.id, 'delegate');
    return this._nuxeo.request(path).queryParams({
      delegatedActors: actors,
      comment: taskOpts.comment
    }).put(options);
  }
}

module.exports = Task;

},{"../base":3,"../deps/utils/join":13,"extend":41}],34:[function(require,module,exports){
'use strict';

const extend = require('extend');
const Base = require('../base');
const join = require('../deps/utils/join');

const WORKFLOW_PATH = 'workflow';

/**
 * The `Workflow` class wraps a workflow.
 *
 * **Cannot directly be instantiated**
 */
class Workflow extends Base {
  /**
   * Creates a `Workflow`.
   * @param {object} workflow - The initial workflow object. This User object will be extended with workflow properties.
   * @param {object} opts - The configuration options.
   * @param {string} opts.nuxeo - The {@link Nuxeo} object linked to this workflow.
   * @param {string} [opts.documentId] - The attached document id of this workflow, if any.
   */
  constructor(workflow, opts) {
    super(opts);
    this._nuxeo = opts.nuxeo;
    this._documentId = opts.documentId;
    extend(true, this, workflow);
  }

  /**
   * Fetches the tasks of this workflow.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A promise object resolved with the tasks.
   */
  fetchTasks(opts = {}) {
    const options = this._computeOptions(opts);
    options.documentId = this.uid;
    return this._buildTasksRequest().get(options);
  }

  /**
   * Fetches this workflow graph.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A promise object resolved with the workflow graph.
   */
  fetchGraph(opts = {}) {
    const options = this._computeOptions(opts);
    const path = join(WORKFLOW_PATH, this.id, 'graph');
    return this._nuxeo.request(path).get(options);
  }

  /**
   * Builds the correct `Request` object depending of whether this workflow is attached to a document or not.
   * @returns {Request} A request object.
   */
  _buildTasksRequest() {
    if (this._documentId) {
      const path = join('id', this._documentId, '@workflow', this.id, 'task');
      return this._nuxeo.request(path);
    }
    return this._nuxeo.request('task').queryParams({
      workflowInstanceId: this.id
    });
  }
}

module.exports = Workflow;

},{"../base":3,"../deps/utils/join":13,"extend":41}],35:[function(require,module,exports){
'use strict';

const Base = require('../base');
const join = require('../deps/utils/join');

const WORKFLOW_PATH = 'workflow';
const TASK_PATH = 'task';

/**
 * The `Workflows` class allows to work with workflows on a Nuxeo Platform instance.
 *
 * **Cannot directly be instantiated**
 *
 * @example
 * var Nuxeo = require('nuxeo')
 * var nuxeo = new Nuxeo({
 *  baseURL: 'http://localhost:8080/nuxeo',
 *  auth: {
 *    method: 'basic',
 *    username: 'Administrator',
 *    password: 'Administrator',
 *  }
 * });
 * nuxeo.workflows()
 *   .start('SerialDocumentReview')
 *   .then(function(res) {
 *     // res['entity-type'] === 'workflow'
 *     // res.workflowModelName === 'SerialDocumentReview'
 *   })
 *   .catch(function(error) {
 *     throw new Error(error);
 *   });
 */
class Workflows extends Base {
  /**
   * Creates a Workflows object.
   * @param {object} opts - The configuration options.
   * @param {string} opts.nuxeo - The {@link Nuxeo} object linked to this Workflows object.
   */
  constructor(opts = {}) {
    super(opts);
    this._nuxeo = opts.nuxeo;
  }

  /**
   * Starts a workflow given a workflow model name.
   * @param {string} workflowModelName - The workflow model name.
   * @param {object} [workflowOpts] - Configuration options for the start of the workflow.
   * @param {Array} [workflowOpts.attachedDocumentIds] - The attached documents id for the workflow.
   * @param {object} [workflowOpts.variables] - The initial variables of the workflow.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A promise object resolved with the started `Workflow` object.
   */
  start(workflowModelName, workflowOpts = {}, opts = {}) {
    opts.body = {
      workflowModelName,
      'entity-type': 'workflow',
      attachedDocumentIds: workflowOpts.attachedDocumentIds,
      variables: workflowOpts.variables
    };
    const options = this._computeOptions(opts);
    return this._nuxeo.request(WORKFLOW_PATH).post(options);
  }

  /**
   * Fetches a workflow given a workflow instance id.
   * @param {string} workflowInstanceId - The workflow instance id.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A promise object resolved with the `Workflow` object.
   */
  fetch(workflowInstanceId, opts = {}) {
    const options = this._computeOptions(opts);
    const path = join(WORKFLOW_PATH, workflowInstanceId);
    return this._nuxeo.request(path).get(options);
  }

  /**
   * Deletes a workflow instance given a workflow instance id.
   * @param {string} workflowInstanceId - The workflow instance id.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A Promise object resolved with the result of the DELETE request.
   */
  delete(workflowInstanceId, opts = {}) {
    const options = this._computeOptions(opts);
    const path = join(WORKFLOW_PATH, workflowInstanceId);
    return this._nuxeo.request(path).delete(options);
  }

  /**
   * Fetches the workflows started by the current user.
   * @param {string} workflowModelName - The workflow model name.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A promise object resolved with the started workflows.
   */
  fetchStartedWorkflows(workflowModelName, opts = {}) {
    const options = this._computeOptions(opts);
    return this._nuxeo.request(WORKFLOW_PATH).queryParams({ workflowModelName }).get(options);
  }

  /**
   * Fetches the tasks for a given workflow id and/or workflow model name and/or actor id.
   * @param {object} [tasksOpts] - Configuration options for the tasks fetch.
   * @param {object} [tasksOpts.actorId] - The actor id.
   * @param {object} [tasksOpts.workflowInstanceId] - The workflow id.
   * @param {object} [tasksOpts.workflowModelName] - The workflow model name.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A promise object resolved with the tasks.
   */
  fetchTasks(tasksOpts = {}, opts = {}) {
    const options = this._computeOptions(opts);
    return this._nuxeo.request(TASK_PATH).queryParams({
      userId: tasksOpts.actorId,
      workflowInstanceId: tasksOpts.workflowInstanceId,
      workflowModelName: tasksOpts.workflowModelName
    }).get(options);
  }
}

module.exports = Workflows;

},{"../base":3,"../deps/utils/join":13}],36:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function getLens (b64) {
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42
  var validLen = b64.indexOf('=')
  if (validLen === -1) validLen = len

  var placeHoldersLen = validLen === len
    ? 0
    : 4 - (validLen % 4)

  return [validLen, placeHoldersLen]
}

// base64 is 4/3 + up to two characters of the original data
function byteLength (b64) {
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function _byteLength (b64, validLen, placeHoldersLen) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function toByteArray (b64) {
  var tmp
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]

  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen))

  var curByte = 0

  // if there are placeholders, only get up to the last complete 4 chars
  var len = placeHoldersLen > 0
    ? validLen - 4
    : validLen

  for (var i = 0; i < len; i += 4) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 18) |
      (revLookup[b64.charCodeAt(i + 1)] << 12) |
      (revLookup[b64.charCodeAt(i + 2)] << 6) |
      revLookup[b64.charCodeAt(i + 3)]
    arr[curByte++] = (tmp >> 16) & 0xFF
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 2) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 2) |
      (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 1) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 10) |
      (revLookup[b64.charCodeAt(i + 1)] << 4) |
      (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] +
    lookup[num >> 12 & 0x3F] +
    lookup[num >> 6 & 0x3F] +
    lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp =
      ((uint8[i] << 16) & 0xFF0000) +
      ((uint8[i + 1] << 8) & 0xFF00) +
      (uint8[i + 2] & 0xFF)
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(
      uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)
    ))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    parts.push(
      lookup[tmp >> 2] +
      lookup[(tmp << 4) & 0x3F] +
      '=='
    )
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1]
    parts.push(
      lookup[tmp >> 10] +
      lookup[(tmp >> 4) & 0x3F] +
      lookup[(tmp << 2) & 0x3F] +
      '='
    )
  }

  return parts.join('')
}

},{}],37:[function(require,module,exports){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = {__proto__: Uint8Array.prototype, foo: function () { return 42 }}
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

Object.defineProperty(Buffer.prototype, 'parent', {
  get: function () {
    if (!(this instanceof Buffer)) {
      return undefined
    }
    return this.buffer
  }
})

Object.defineProperty(Buffer.prototype, 'offset', {
  get: function () {
    if (!(this instanceof Buffer)) {
      return undefined
    }
    return this.byteOffset
  }
})

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('Invalid typed array length')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  buf.__proto__ = Buffer.prototype
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new Error(
        'If encoding is specified then the first argument must be a string'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'number') {
    throw new TypeError('"value" argument must not be a number')
  }

  if (isArrayBuffer(value) || (value && isArrayBuffer(value.buffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  return fromObject(value)
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Buffer.prototype.__proto__ = Uint8Array.prototype
Buffer.__proto__ = Uint8Array

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be of type number')
  } else if (size < 0) {
    throw new RangeError('"size" argument must not be negative')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('Unknown encoding: ' + encoding)
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('"offset" is outside of buffer bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('"length" is outside of buffer bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  buf.__proto__ = Buffer.prototype
  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj) {
    if (ArrayBuffer.isView(obj) || 'length' in obj) {
      if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
        return createBuffer(0)
      }
      return fromArrayLike(obj)
    }

    if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
      return fromArrayLike(obj.data)
    }
  }

  throw new TypeError('The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object.')
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true
}

Buffer.compare = function compare (a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError('Arguments must be Buffers')
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (ArrayBuffer.isView(buf)) {
      buf = Buffer.from(buf)
    }
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || isArrayBuffer(string)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    string = '' + string
  }

  var len = string.length
  if (len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
      case undefined:
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) return utf8ToBytes(string).length // assume utf8
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.toLocaleString = Buffer.prototype.toString

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
    if (this.length > max) str += ' ... '
  }
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (!Buffer.isBuffer(target)) {
    throw new TypeError('Argument must be a Buffer')
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset  // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  var strLen = string.length

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
      : (firstByte > 0xBF) ? 2
      : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  newBuf.__proto__ = Buffer.prototype
  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    // Use built-in when available, missing from IE11
    this.copyWithin(targetStart, start, end)
  } else if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (var i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, end),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if ((encoding === 'utf8' && code < 128) ||
          encoding === 'latin1') {
        // Fast path: If `val` fits into a single byte, use that numeric value.
        val = code
      }
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : new Buffer(val, encoding)
    var len = bytes.length
    if (len === 0) {
      throw new TypeError('The value "' + val +
        '" is invalid for argument "value"')
    }
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node takes equal signs as end of the Base64 encoding
  str = str.split('=')[0]
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffers from another context (i.e. an iframe) do not pass the `instanceof` check
// but they should be treated as valid. See: https://github.com/feross/buffer/issues/166
function isArrayBuffer (obj) {
  return obj instanceof ArrayBuffer ||
    (obj != null && obj.constructor != null && obj.constructor.name === 'ArrayBuffer' &&
      typeof obj.byteLength === 'number')
}

function numberIsNaN (obj) {
  return obj !== obj // eslint-disable-line no-self-compare
}

},{"base64-js":36,"ieee754":42}],38:[function(require,module,exports){
var charenc = {
  // UTF-8 encoding
  utf8: {
    // Convert a string to a byte array
    stringToBytes: function(str) {
      return charenc.bin.stringToBytes(unescape(encodeURIComponent(str)));
    },

    // Convert a byte array to a string
    bytesToString: function(bytes) {
      return decodeURIComponent(escape(charenc.bin.bytesToString(bytes)));
    }
  },

  // Binary encoding
  bin: {
    // Convert a string to a byte array
    stringToBytes: function(str) {
      for (var bytes = [], i = 0; i < str.length; i++)
        bytes.push(str.charCodeAt(i) & 0xFF);
      return bytes;
    },

    // Convert a byte array to a string
    bytesToString: function(bytes) {
      for (var str = [], i = 0; i < bytes.length; i++)
        str.push(String.fromCharCode(bytes[i]));
      return str.join('');
    }
  }
};

module.exports = charenc;

},{}],39:[function(require,module,exports){
(function() {
  var base64map
      = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',

  crypt = {
    // Bit-wise rotation left
    rotl: function(n, b) {
      return (n << b) | (n >>> (32 - b));
    },

    // Bit-wise rotation right
    rotr: function(n, b) {
      return (n << (32 - b)) | (n >>> b);
    },

    // Swap big-endian to little-endian and vice versa
    endian: function(n) {
      // If number given, swap endian
      if (n.constructor == Number) {
        return crypt.rotl(n, 8) & 0x00FF00FF | crypt.rotl(n, 24) & 0xFF00FF00;
      }

      // Else, assume array and swap all items
      for (var i = 0; i < n.length; i++)
        n[i] = crypt.endian(n[i]);
      return n;
    },

    // Generate an array of any length of random bytes
    randomBytes: function(n) {
      for (var bytes = []; n > 0; n--)
        bytes.push(Math.floor(Math.random() * 256));
      return bytes;
    },

    // Convert a byte array to big-endian 32-bit words
    bytesToWords: function(bytes) {
      for (var words = [], i = 0, b = 0; i < bytes.length; i++, b += 8)
        words[b >>> 5] |= bytes[i] << (24 - b % 32);
      return words;
    },

    // Convert big-endian 32-bit words to a byte array
    wordsToBytes: function(words) {
      for (var bytes = [], b = 0; b < words.length * 32; b += 8)
        bytes.push((words[b >>> 5] >>> (24 - b % 32)) & 0xFF);
      return bytes;
    },

    // Convert a byte array to a hex string
    bytesToHex: function(bytes) {
      for (var hex = [], i = 0; i < bytes.length; i++) {
        hex.push((bytes[i] >>> 4).toString(16));
        hex.push((bytes[i] & 0xF).toString(16));
      }
      return hex.join('');
    },

    // Convert a hex string to a byte array
    hexToBytes: function(hex) {
      for (var bytes = [], c = 0; c < hex.length; c += 2)
        bytes.push(parseInt(hex.substr(c, 2), 16));
      return bytes;
    },

    // Convert a byte array to a base-64 string
    bytesToBase64: function(bytes) {
      for (var base64 = [], i = 0; i < bytes.length; i += 3) {
        var triplet = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
        for (var j = 0; j < 4; j++)
          if (i * 8 + j * 6 <= bytes.length * 8)
            base64.push(base64map.charAt((triplet >>> 6 * (3 - j)) & 0x3F));
          else
            base64.push('=');
      }
      return base64.join('');
    },

    // Convert a base-64 string to a byte array
    base64ToBytes: function(base64) {
      // Remove non-base-64 characters
      base64 = base64.replace(/[^A-Z0-9+\/]/ig, '');

      for (var bytes = [], i = 0, imod4 = 0; i < base64.length;
          imod4 = ++i % 4) {
        if (imod4 == 0) continue;
        bytes.push(((base64map.indexOf(base64.charAt(i - 1))
            & (Math.pow(2, -2 * imod4 + 8) - 1)) << (imod4 * 2))
            | (base64map.indexOf(base64.charAt(i)) >>> (6 - imod4 * 2)));
      }
      return bytes;
    }
  };

  module.exports = crypt;
})();

},{}],40:[function(require,module,exports){
(function (process,global){
/*!
 * @overview es6-promise - a tiny implementation of Promises/A+.
 * @copyright Copyright (c) 2014 Yehuda Katz, Tom Dale, Stefan Penner and contributors (Conversion to ES6 API by Jake Archibald)
 * @license   Licensed under MIT license
 *            See https://raw.githubusercontent.com/stefanpenner/es6-promise/master/LICENSE
 * @version   v4.2.4+314e4831
 */

(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.ES6Promise = factory());
}(this, (function () { 'use strict';

function objectOrFunction(x) {
  var type = typeof x;
  return x !== null && (type === 'object' || type === 'function');
}

function isFunction(x) {
  return typeof x === 'function';
}



var _isArray = void 0;
if (Array.isArray) {
  _isArray = Array.isArray;
} else {
  _isArray = function (x) {
    return Object.prototype.toString.call(x) === '[object Array]';
  };
}

var isArray = _isArray;

var len = 0;
var vertxNext = void 0;
var customSchedulerFn = void 0;

var asap = function asap(callback, arg) {
  queue[len] = callback;
  queue[len + 1] = arg;
  len += 2;
  if (len === 2) {
    // If len is 2, that means that we need to schedule an async flush.
    // If additional callbacks are queued before the queue is flushed, they
    // will be processed by this flush that we are scheduling.
    if (customSchedulerFn) {
      customSchedulerFn(flush);
    } else {
      scheduleFlush();
    }
  }
};

function setScheduler(scheduleFn) {
  customSchedulerFn = scheduleFn;
}

function setAsap(asapFn) {
  asap = asapFn;
}

var browserWindow = typeof window !== 'undefined' ? window : undefined;
var browserGlobal = browserWindow || {};
var BrowserMutationObserver = browserGlobal.MutationObserver || browserGlobal.WebKitMutationObserver;
var isNode = typeof self === 'undefined' && typeof process !== 'undefined' && {}.toString.call(process) === '[object process]';

// test for web worker but not in IE10
var isWorker = typeof Uint8ClampedArray !== 'undefined' && typeof importScripts !== 'undefined' && typeof MessageChannel !== 'undefined';

// node
function useNextTick() {
  // node version 0.10.x displays a deprecation warning when nextTick is used recursively
  // see https://github.com/cujojs/when/issues/410 for details
  return function () {
    return process.nextTick(flush);
  };
}

// vertx
function useVertxTimer() {
  if (typeof vertxNext !== 'undefined') {
    return function () {
      vertxNext(flush);
    };
  }

  return useSetTimeout();
}

function useMutationObserver() {
  var iterations = 0;
  var observer = new BrowserMutationObserver(flush);
  var node = document.createTextNode('');
  observer.observe(node, { characterData: true });

  return function () {
    node.data = iterations = ++iterations % 2;
  };
}

// web worker
function useMessageChannel() {
  var channel = new MessageChannel();
  channel.port1.onmessage = flush;
  return function () {
    return channel.port2.postMessage(0);
  };
}

function useSetTimeout() {
  // Store setTimeout reference so es6-promise will be unaffected by
  // other code modifying setTimeout (like sinon.useFakeTimers())
  var globalSetTimeout = setTimeout;
  return function () {
    return globalSetTimeout(flush, 1);
  };
}

var queue = new Array(1000);
function flush() {
  for (var i = 0; i < len; i += 2) {
    var callback = queue[i];
    var arg = queue[i + 1];

    callback(arg);

    queue[i] = undefined;
    queue[i + 1] = undefined;
  }

  len = 0;
}

function attemptVertx() {
  try {
    var vertx = Function('return this')().require('vertx');
    vertxNext = vertx.runOnLoop || vertx.runOnContext;
    return useVertxTimer();
  } catch (e) {
    return useSetTimeout();
  }
}

var scheduleFlush = void 0;
// Decide what async method to use to triggering processing of queued callbacks:
if (isNode) {
  scheduleFlush = useNextTick();
} else if (BrowserMutationObserver) {
  scheduleFlush = useMutationObserver();
} else if (isWorker) {
  scheduleFlush = useMessageChannel();
} else if (browserWindow === undefined && typeof require === 'function') {
  scheduleFlush = attemptVertx();
} else {
  scheduleFlush = useSetTimeout();
}

function then(onFulfillment, onRejection) {
  var parent = this;

  var child = new this.constructor(noop);

  if (child[PROMISE_ID] === undefined) {
    makePromise(child);
  }

  var _state = parent._state;


  if (_state) {
    var callback = arguments[_state - 1];
    asap(function () {
      return invokeCallback(_state, child, callback, parent._result);
    });
  } else {
    subscribe(parent, child, onFulfillment, onRejection);
  }

  return child;
}

/**
  `Promise.resolve` returns a promise that will become resolved with the
  passed `value`. It is shorthand for the following:

  ```javascript
  let promise = new Promise(function(resolve, reject){
    resolve(1);
  });

  promise.then(function(value){
    // value === 1
  });
  ```

  Instead of writing the above, your code now simply becomes the following:

  ```javascript
  let promise = Promise.resolve(1);

  promise.then(function(value){
    // value === 1
  });
  ```

  @method resolve
  @static
  @param {Any} value value that the returned promise will be resolved with
  Useful for tooling.
  @return {Promise} a promise that will become fulfilled with the given
  `value`
*/
function resolve$1(object) {
  /*jshint validthis:true */
  var Constructor = this;

  if (object && typeof object === 'object' && object.constructor === Constructor) {
    return object;
  }

  var promise = new Constructor(noop);
  resolve(promise, object);
  return promise;
}

var PROMISE_ID = Math.random().toString(36).substring(2);

function noop() {}

var PENDING = void 0;
var FULFILLED = 1;
var REJECTED = 2;

var TRY_CATCH_ERROR = { error: null };

function selfFulfillment() {
  return new TypeError("You cannot resolve a promise with itself");
}

function cannotReturnOwn() {
  return new TypeError('A promises callback cannot return that same promise.');
}

function getThen(promise) {
  try {
    return promise.then;
  } catch (error) {
    TRY_CATCH_ERROR.error = error;
    return TRY_CATCH_ERROR;
  }
}

function tryThen(then$$1, value, fulfillmentHandler, rejectionHandler) {
  try {
    then$$1.call(value, fulfillmentHandler, rejectionHandler);
  } catch (e) {
    return e;
  }
}

function handleForeignThenable(promise, thenable, then$$1) {
  asap(function (promise) {
    var sealed = false;
    var error = tryThen(then$$1, thenable, function (value) {
      if (sealed) {
        return;
      }
      sealed = true;
      if (thenable !== value) {
        resolve(promise, value);
      } else {
        fulfill(promise, value);
      }
    }, function (reason) {
      if (sealed) {
        return;
      }
      sealed = true;

      reject(promise, reason);
    }, 'Settle: ' + (promise._label || ' unknown promise'));

    if (!sealed && error) {
      sealed = true;
      reject(promise, error);
    }
  }, promise);
}

function handleOwnThenable(promise, thenable) {
  if (thenable._state === FULFILLED) {
    fulfill(promise, thenable._result);
  } else if (thenable._state === REJECTED) {
    reject(promise, thenable._result);
  } else {
    subscribe(thenable, undefined, function (value) {
      return resolve(promise, value);
    }, function (reason) {
      return reject(promise, reason);
    });
  }
}

function handleMaybeThenable(promise, maybeThenable, then$$1) {
  if (maybeThenable.constructor === promise.constructor && then$$1 === then && maybeThenable.constructor.resolve === resolve$1) {
    handleOwnThenable(promise, maybeThenable);
  } else {
    if (then$$1 === TRY_CATCH_ERROR) {
      reject(promise, TRY_CATCH_ERROR.error);
      TRY_CATCH_ERROR.error = null;
    } else if (then$$1 === undefined) {
      fulfill(promise, maybeThenable);
    } else if (isFunction(then$$1)) {
      handleForeignThenable(promise, maybeThenable, then$$1);
    } else {
      fulfill(promise, maybeThenable);
    }
  }
}

function resolve(promise, value) {
  if (promise === value) {
    reject(promise, selfFulfillment());
  } else if (objectOrFunction(value)) {
    handleMaybeThenable(promise, value, getThen(value));
  } else {
    fulfill(promise, value);
  }
}

function publishRejection(promise) {
  if (promise._onerror) {
    promise._onerror(promise._result);
  }

  publish(promise);
}

function fulfill(promise, value) {
  if (promise._state !== PENDING) {
    return;
  }

  promise._result = value;
  promise._state = FULFILLED;

  if (promise._subscribers.length !== 0) {
    asap(publish, promise);
  }
}

function reject(promise, reason) {
  if (promise._state !== PENDING) {
    return;
  }
  promise._state = REJECTED;
  promise._result = reason;

  asap(publishRejection, promise);
}

function subscribe(parent, child, onFulfillment, onRejection) {
  var _subscribers = parent._subscribers;
  var length = _subscribers.length;


  parent._onerror = null;

  _subscribers[length] = child;
  _subscribers[length + FULFILLED] = onFulfillment;
  _subscribers[length + REJECTED] = onRejection;

  if (length === 0 && parent._state) {
    asap(publish, parent);
  }
}

function publish(promise) {
  var subscribers = promise._subscribers;
  var settled = promise._state;

  if (subscribers.length === 0) {
    return;
  }

  var child = void 0,
      callback = void 0,
      detail = promise._result;

  for (var i = 0; i < subscribers.length; i += 3) {
    child = subscribers[i];
    callback = subscribers[i + settled];

    if (child) {
      invokeCallback(settled, child, callback, detail);
    } else {
      callback(detail);
    }
  }

  promise._subscribers.length = 0;
}

function tryCatch(callback, detail) {
  try {
    return callback(detail);
  } catch (e) {
    TRY_CATCH_ERROR.error = e;
    return TRY_CATCH_ERROR;
  }
}

function invokeCallback(settled, promise, callback, detail) {
  var hasCallback = isFunction(callback),
      value = void 0,
      error = void 0,
      succeeded = void 0,
      failed = void 0;

  if (hasCallback) {
    value = tryCatch(callback, detail);

    if (value === TRY_CATCH_ERROR) {
      failed = true;
      error = value.error;
      value.error = null;
    } else {
      succeeded = true;
    }

    if (promise === value) {
      reject(promise, cannotReturnOwn());
      return;
    }
  } else {
    value = detail;
    succeeded = true;
  }

  if (promise._state !== PENDING) {
    // noop
  } else if (hasCallback && succeeded) {
    resolve(promise, value);
  } else if (failed) {
    reject(promise, error);
  } else if (settled === FULFILLED) {
    fulfill(promise, value);
  } else if (settled === REJECTED) {
    reject(promise, value);
  }
}

function initializePromise(promise, resolver) {
  try {
    resolver(function resolvePromise(value) {
      resolve(promise, value);
    }, function rejectPromise(reason) {
      reject(promise, reason);
    });
  } catch (e) {
    reject(promise, e);
  }
}

var id = 0;
function nextId() {
  return id++;
}

function makePromise(promise) {
  promise[PROMISE_ID] = id++;
  promise._state = undefined;
  promise._result = undefined;
  promise._subscribers = [];
}

function validationError() {
  return new Error('Array Methods must be provided an Array');
}

var Enumerator = function () {
  function Enumerator(Constructor, input) {
    this._instanceConstructor = Constructor;
    this.promise = new Constructor(noop);

    if (!this.promise[PROMISE_ID]) {
      makePromise(this.promise);
    }

    if (isArray(input)) {
      this.length = input.length;
      this._remaining = input.length;

      this._result = new Array(this.length);

      if (this.length === 0) {
        fulfill(this.promise, this._result);
      } else {
        this.length = this.length || 0;
        this._enumerate(input);
        if (this._remaining === 0) {
          fulfill(this.promise, this._result);
        }
      }
    } else {
      reject(this.promise, validationError());
    }
  }

  Enumerator.prototype._enumerate = function _enumerate(input) {
    for (var i = 0; this._state === PENDING && i < input.length; i++) {
      this._eachEntry(input[i], i);
    }
  };

  Enumerator.prototype._eachEntry = function _eachEntry(entry, i) {
    var c = this._instanceConstructor;
    var resolve$$1 = c.resolve;


    if (resolve$$1 === resolve$1) {
      var _then = getThen(entry);

      if (_then === then && entry._state !== PENDING) {
        this._settledAt(entry._state, i, entry._result);
      } else if (typeof _then !== 'function') {
        this._remaining--;
        this._result[i] = entry;
      } else if (c === Promise$1) {
        var promise = new c(noop);
        handleMaybeThenable(promise, entry, _then);
        this._willSettleAt(promise, i);
      } else {
        this._willSettleAt(new c(function (resolve$$1) {
          return resolve$$1(entry);
        }), i);
      }
    } else {
      this._willSettleAt(resolve$$1(entry), i);
    }
  };

  Enumerator.prototype._settledAt = function _settledAt(state, i, value) {
    var promise = this.promise;


    if (promise._state === PENDING) {
      this._remaining--;

      if (state === REJECTED) {
        reject(promise, value);
      } else {
        this._result[i] = value;
      }
    }

    if (this._remaining === 0) {
      fulfill(promise, this._result);
    }
  };

  Enumerator.prototype._willSettleAt = function _willSettleAt(promise, i) {
    var enumerator = this;

    subscribe(promise, undefined, function (value) {
      return enumerator._settledAt(FULFILLED, i, value);
    }, function (reason) {
      return enumerator._settledAt(REJECTED, i, reason);
    });
  };

  return Enumerator;
}();

/**
  `Promise.all` accepts an array of promises, and returns a new promise which
  is fulfilled with an array of fulfillment values for the passed promises, or
  rejected with the reason of the first passed promise to be rejected. It casts all
  elements of the passed iterable to promises as it runs this algorithm.

  Example:

  ```javascript
  let promise1 = resolve(1);
  let promise2 = resolve(2);
  let promise3 = resolve(3);
  let promises = [ promise1, promise2, promise3 ];

  Promise.all(promises).then(function(array){
    // The array here would be [ 1, 2, 3 ];
  });
  ```

  If any of the `promises` given to `all` are rejected, the first promise
  that is rejected will be given as an argument to the returned promises's
  rejection handler. For example:

  Example:

  ```javascript
  let promise1 = resolve(1);
  let promise2 = reject(new Error("2"));
  let promise3 = reject(new Error("3"));
  let promises = [ promise1, promise2, promise3 ];

  Promise.all(promises).then(function(array){
    // Code here never runs because there are rejected promises!
  }, function(error) {
    // error.message === "2"
  });
  ```

  @method all
  @static
  @param {Array} entries array of promises
  @param {String} label optional string for labeling the promise.
  Useful for tooling.
  @return {Promise} promise that is fulfilled when all `promises` have been
  fulfilled, or rejected if any of them become rejected.
  @static
*/
function all(entries) {
  return new Enumerator(this, entries).promise;
}

/**
  `Promise.race` returns a new promise which is settled in the same way as the
  first passed promise to settle.

  Example:

  ```javascript
  let promise1 = new Promise(function(resolve, reject){
    setTimeout(function(){
      resolve('promise 1');
    }, 200);
  });

  let promise2 = new Promise(function(resolve, reject){
    setTimeout(function(){
      resolve('promise 2');
    }, 100);
  });

  Promise.race([promise1, promise2]).then(function(result){
    // result === 'promise 2' because it was resolved before promise1
    // was resolved.
  });
  ```

  `Promise.race` is deterministic in that only the state of the first
  settled promise matters. For example, even if other promises given to the
  `promises` array argument are resolved, but the first settled promise has
  become rejected before the other promises became fulfilled, the returned
  promise will become rejected:

  ```javascript
  let promise1 = new Promise(function(resolve, reject){
    setTimeout(function(){
      resolve('promise 1');
    }, 200);
  });

  let promise2 = new Promise(function(resolve, reject){
    setTimeout(function(){
      reject(new Error('promise 2'));
    }, 100);
  });

  Promise.race([promise1, promise2]).then(function(result){
    // Code here never runs
  }, function(reason){
    // reason.message === 'promise 2' because promise 2 became rejected before
    // promise 1 became fulfilled
  });
  ```

  An example real-world use case is implementing timeouts:

  ```javascript
  Promise.race([ajax('foo.json'), timeout(5000)])
  ```

  @method race
  @static
  @param {Array} promises array of promises to observe
  Useful for tooling.
  @return {Promise} a promise which settles in the same way as the first passed
  promise to settle.
*/
function race(entries) {
  /*jshint validthis:true */
  var Constructor = this;

  if (!isArray(entries)) {
    return new Constructor(function (_, reject) {
      return reject(new TypeError('You must pass an array to race.'));
    });
  } else {
    return new Constructor(function (resolve, reject) {
      var length = entries.length;
      for (var i = 0; i < length; i++) {
        Constructor.resolve(entries[i]).then(resolve, reject);
      }
    });
  }
}

/**
  `Promise.reject` returns a promise rejected with the passed `reason`.
  It is shorthand for the following:

  ```javascript
  let promise = new Promise(function(resolve, reject){
    reject(new Error('WHOOPS'));
  });

  promise.then(function(value){
    // Code here doesn't run because the promise is rejected!
  }, function(reason){
    // reason.message === 'WHOOPS'
  });
  ```

  Instead of writing the above, your code now simply becomes the following:

  ```javascript
  let promise = Promise.reject(new Error('WHOOPS'));

  promise.then(function(value){
    // Code here doesn't run because the promise is rejected!
  }, function(reason){
    // reason.message === 'WHOOPS'
  });
  ```

  @method reject
  @static
  @param {Any} reason value that the returned promise will be rejected with.
  Useful for tooling.
  @return {Promise} a promise rejected with the given `reason`.
*/
function reject$1(reason) {
  /*jshint validthis:true */
  var Constructor = this;
  var promise = new Constructor(noop);
  reject(promise, reason);
  return promise;
}

function needsResolver() {
  throw new TypeError('You must pass a resolver function as the first argument to the promise constructor');
}

function needsNew() {
  throw new TypeError("Failed to construct 'Promise': Please use the 'new' operator, this object constructor cannot be called as a function.");
}

/**
  Promise objects represent the eventual result of an asynchronous operation. The
  primary way of interacting with a promise is through its `then` method, which
  registers callbacks to receive either a promise's eventual value or the reason
  why the promise cannot be fulfilled.

  Terminology
  -----------

  - `promise` is an object or function with a `then` method whose behavior conforms to this specification.
  - `thenable` is an object or function that defines a `then` method.
  - `value` is any legal JavaScript value (including undefined, a thenable, or a promise).
  - `exception` is a value that is thrown using the throw statement.
  - `reason` is a value that indicates why a promise was rejected.
  - `settled` the final resting state of a promise, fulfilled or rejected.

  A promise can be in one of three states: pending, fulfilled, or rejected.

  Promises that are fulfilled have a fulfillment value and are in the fulfilled
  state.  Promises that are rejected have a rejection reason and are in the
  rejected state.  A fulfillment value is never a thenable.

  Promises can also be said to *resolve* a value.  If this value is also a
  promise, then the original promise's settled state will match the value's
  settled state.  So a promise that *resolves* a promise that rejects will
  itself reject, and a promise that *resolves* a promise that fulfills will
  itself fulfill.


  Basic Usage:
  ------------

  ```js
  let promise = new Promise(function(resolve, reject) {
    // on success
    resolve(value);

    // on failure
    reject(reason);
  });

  promise.then(function(value) {
    // on fulfillment
  }, function(reason) {
    // on rejection
  });
  ```

  Advanced Usage:
  ---------------

  Promises shine when abstracting away asynchronous interactions such as
  `XMLHttpRequest`s.

  ```js
  function getJSON(url) {
    return new Promise(function(resolve, reject){
      let xhr = new XMLHttpRequest();

      xhr.open('GET', url);
      xhr.onreadystatechange = handler;
      xhr.responseType = 'json';
      xhr.setRequestHeader('Accept', 'application/json');
      xhr.send();

      function handler() {
        if (this.readyState === this.DONE) {
          if (this.status === 200) {
            resolve(this.response);
          } else {
            reject(new Error('getJSON: `' + url + '` failed with status: [' + this.status + ']'));
          }
        }
      };
    });
  }

  getJSON('/posts.json').then(function(json) {
    // on fulfillment
  }, function(reason) {
    // on rejection
  });
  ```

  Unlike callbacks, promises are great composable primitives.

  ```js
  Promise.all([
    getJSON('/posts'),
    getJSON('/comments')
  ]).then(function(values){
    values[0] // => postsJSON
    values[1] // => commentsJSON

    return values;
  });
  ```

  @class Promise
  @param {Function} resolver
  Useful for tooling.
  @constructor
*/

var Promise$1 = function () {
  function Promise(resolver) {
    this[PROMISE_ID] = nextId();
    this._result = this._state = undefined;
    this._subscribers = [];

    if (noop !== resolver) {
      typeof resolver !== 'function' && needsResolver();
      this instanceof Promise ? initializePromise(this, resolver) : needsNew();
    }
  }

  /**
  The primary way of interacting with a promise is through its `then` method,
  which registers callbacks to receive either a promise's eventual value or the
  reason why the promise cannot be fulfilled.
   ```js
  findUser().then(function(user){
    // user is available
  }, function(reason){
    // user is unavailable, and you are given the reason why
  });
  ```
   Chaining
  --------
   The return value of `then` is itself a promise.  This second, 'downstream'
  promise is resolved with the return value of the first promise's fulfillment
  or rejection handler, or rejected if the handler throws an exception.
   ```js
  findUser().then(function (user) {
    return user.name;
  }, function (reason) {
    return 'default name';
  }).then(function (userName) {
    // If `findUser` fulfilled, `userName` will be the user's name, otherwise it
    // will be `'default name'`
  });
   findUser().then(function (user) {
    throw new Error('Found user, but still unhappy');
  }, function (reason) {
    throw new Error('`findUser` rejected and we're unhappy');
  }).then(function (value) {
    // never reached
  }, function (reason) {
    // if `findUser` fulfilled, `reason` will be 'Found user, but still unhappy'.
    // If `findUser` rejected, `reason` will be '`findUser` rejected and we're unhappy'.
  });
  ```
  If the downstream promise does not specify a rejection handler, rejection reasons will be propagated further downstream.
   ```js
  findUser().then(function (user) {
    throw new PedagogicalException('Upstream error');
  }).then(function (value) {
    // never reached
  }).then(function (value) {
    // never reached
  }, function (reason) {
    // The `PedgagocialException` is propagated all the way down to here
  });
  ```
   Assimilation
  ------------
   Sometimes the value you want to propagate to a downstream promise can only be
  retrieved asynchronously. This can be achieved by returning a promise in the
  fulfillment or rejection handler. The downstream promise will then be pending
  until the returned promise is settled. This is called *assimilation*.
   ```js
  findUser().then(function (user) {
    return findCommentsByAuthor(user);
  }).then(function (comments) {
    // The user's comments are now available
  });
  ```
   If the assimliated promise rejects, then the downstream promise will also reject.
   ```js
  findUser().then(function (user) {
    return findCommentsByAuthor(user);
  }).then(function (comments) {
    // If `findCommentsByAuthor` fulfills, we'll have the value here
  }, function (reason) {
    // If `findCommentsByAuthor` rejects, we'll have the reason here
  });
  ```
   Simple Example
  --------------
   Synchronous Example
   ```javascript
  let result;
   try {
    result = findResult();
    // success
  } catch(reason) {
    // failure
  }
  ```
   Errback Example
   ```js
  findResult(function(result, err){
    if (err) {
      // failure
    } else {
      // success
    }
  });
  ```
   Promise Example;
   ```javascript
  findResult().then(function(result){
    // success
  }, function(reason){
    // failure
  });
  ```
   Advanced Example
  --------------
   Synchronous Example
   ```javascript
  let author, books;
   try {
    author = findAuthor();
    books  = findBooksByAuthor(author);
    // success
  } catch(reason) {
    // failure
  }
  ```
   Errback Example
   ```js
   function foundBooks(books) {
   }
   function failure(reason) {
   }
   findAuthor(function(author, err){
    if (err) {
      failure(err);
      // failure
    } else {
      try {
        findBoooksByAuthor(author, function(books, err) {
          if (err) {
            failure(err);
          } else {
            try {
              foundBooks(books);
            } catch(reason) {
              failure(reason);
            }
          }
        });
      } catch(error) {
        failure(err);
      }
      // success
    }
  });
  ```
   Promise Example;
   ```javascript
  findAuthor().
    then(findBooksByAuthor).
    then(function(books){
      // found books
  }).catch(function(reason){
    // something went wrong
  });
  ```
   @method then
  @param {Function} onFulfilled
  @param {Function} onRejected
  Useful for tooling.
  @return {Promise}
  */

  /**
  `catch` is simply sugar for `then(undefined, onRejection)` which makes it the same
  as the catch block of a try/catch statement.
  ```js
  function findAuthor(){
  throw new Error('couldn't find that author');
  }
  // synchronous
  try {
  findAuthor();
  } catch(reason) {
  // something went wrong
  }
  // async with promises
  findAuthor().catch(function(reason){
  // something went wrong
  });
  ```
  @method catch
  @param {Function} onRejection
  Useful for tooling.
  @return {Promise}
  */


  Promise.prototype.catch = function _catch(onRejection) {
    return this.then(null, onRejection);
  };

  /**
    `finally` will be invoked regardless of the promise's fate just as native
    try/catch/finally behaves
  
    Synchronous example:
  
    ```js
    findAuthor() {
      if (Math.random() > 0.5) {
        throw new Error();
      }
      return new Author();
    }
  
    try {
      return findAuthor(); // succeed or fail
    } catch(error) {
      return findOtherAuther();
    } finally {
      // always runs
      // doesn't affect the return value
    }
    ```
  
    Asynchronous example:
  
    ```js
    findAuthor().catch(function(reason){
      return findOtherAuther();
    }).finally(function(){
      // author was either found, or not
    });
    ```
  
    @method finally
    @param {Function} callback
    @return {Promise}
  */


  Promise.prototype.finally = function _finally(callback) {
    var promise = this;
    var constructor = promise.constructor;

    return promise.then(function (value) {
      return constructor.resolve(callback()).then(function () {
        return value;
      });
    }, function (reason) {
      return constructor.resolve(callback()).then(function () {
        throw reason;
      });
    });
  };

  return Promise;
}();

Promise$1.prototype.then = then;
Promise$1.all = all;
Promise$1.race = race;
Promise$1.resolve = resolve$1;
Promise$1.reject = reject$1;
Promise$1._setScheduler = setScheduler;
Promise$1._setAsap = setAsap;
Promise$1._asap = asap;

/*global self*/
function polyfill() {
  var local = void 0;

  if (typeof global !== 'undefined') {
    local = global;
  } else if (typeof self !== 'undefined') {
    local = self;
  } else {
    try {
      local = Function('return this')();
    } catch (e) {
      throw new Error('polyfill failed because global object is unavailable in this environment');
    }
  }

  var P = local.Promise;

  if (P) {
    var promiseToString = null;
    try {
      promiseToString = Object.prototype.toString.call(P.resolve());
    } catch (e) {
      // silently ignored
    }

    if (promiseToString === '[object Promise]' && !P.cast) {
      return;
    }
  }

  local.Promise = Promise$1;
}

// Strange compat..
Promise$1.polyfill = polyfill;
Promise$1.Promise = Promise$1;

return Promise$1;

})));





}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"_process":45}],41:[function(require,module,exports){
'use strict';

var hasOwn = Object.prototype.hasOwnProperty;
var toStr = Object.prototype.toString;

var isArray = function isArray(arr) {
	if (typeof Array.isArray === 'function') {
		return Array.isArray(arr);
	}

	return toStr.call(arr) === '[object Array]';
};

var isPlainObject = function isPlainObject(obj) {
	if (!obj || toStr.call(obj) !== '[object Object]') {
		return false;
	}

	var hasOwnConstructor = hasOwn.call(obj, 'constructor');
	var hasIsPrototypeOf = obj.constructor && obj.constructor.prototype && hasOwn.call(obj.constructor.prototype, 'isPrototypeOf');
	// Not own constructor property must be Object
	if (obj.constructor && !hasOwnConstructor && !hasIsPrototypeOf) {
		return false;
	}

	// Own properties are enumerated firstly, so to speed up,
	// if last one is own, then all properties are own.
	var key;
	for (key in obj) { /**/ }

	return typeof key === 'undefined' || hasOwn.call(obj, key);
};

module.exports = function extend() {
	var options, name, src, copy, copyIsArray, clone;
	var target = arguments[0];
	var i = 1;
	var length = arguments.length;
	var deep = false;

	// Handle a deep copy situation
	if (typeof target === 'boolean') {
		deep = target;
		target = arguments[1] || {};
		// skip the boolean and the target
		i = 2;
	}
	if (target == null || (typeof target !== 'object' && typeof target !== 'function')) {
		target = {};
	}

	for (; i < length; ++i) {
		options = arguments[i];
		// Only deal with non-null/undefined values
		if (options != null) {
			// Extend the base object
			for (name in options) {
				src = target[name];
				copy = options[name];

				// Prevent never-ending loop
				if (target !== copy) {
					// Recurse if we're merging plain objects or arrays
					if (deep && copy && (isPlainObject(copy) || (copyIsArray = isArray(copy)))) {
						if (copyIsArray) {
							copyIsArray = false;
							clone = src && isArray(src) ? src : [];
						} else {
							clone = src && isPlainObject(src) ? src : {};
						}

						// Never move original objects, clone them
						target[name] = extend(deep, clone, copy);

					// Don't bring in undefined values
					} else if (typeof copy !== 'undefined') {
						target[name] = copy;
					}
				}
			}
		}
	}

	// Return the modified object
	return target;
};

},{}],42:[function(require,module,exports){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],43:[function(require,module,exports){
/*!
 * Determine if an object is a Buffer
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */

// The _isBuffer check is for Safari 5-7 support, because it's missing
// Object.prototype.constructor. Remove this eventually
module.exports = function (obj) {
  return obj != null && (isBuffer(obj) || isSlowBuffer(obj) || !!obj._isBuffer)
}

function isBuffer (obj) {
  return !!obj.constructor && typeof obj.constructor.isBuffer === 'function' && obj.constructor.isBuffer(obj)
}

// For Node v0.10 support. Remove this eventually.
function isSlowBuffer (obj) {
  return typeof obj.readFloatLE === 'function' && typeof obj.slice === 'function' && isBuffer(obj.slice(0, 0))
}

},{}],44:[function(require,module,exports){
(function(){
  var crypt = require('crypt'),
      utf8 = require('charenc').utf8,
      isBuffer = require('is-buffer'),
      bin = require('charenc').bin,

  // The core
  md5 = function (message, options) {
    // Convert to byte array
    if (message.constructor == String)
      if (options && options.encoding === 'binary')
        message = bin.stringToBytes(message);
      else
        message = utf8.stringToBytes(message);
    else if (isBuffer(message))
      message = Array.prototype.slice.call(message, 0);
    else if (!Array.isArray(message))
      message = message.toString();
    // else, assume byte array already

    var m = crypt.bytesToWords(message),
        l = message.length * 8,
        a =  1732584193,
        b = -271733879,
        c = -1732584194,
        d =  271733878;

    // Swap endian
    for (var i = 0; i < m.length; i++) {
      m[i] = ((m[i] <<  8) | (m[i] >>> 24)) & 0x00FF00FF |
             ((m[i] << 24) | (m[i] >>>  8)) & 0xFF00FF00;
    }

    // Padding
    m[l >>> 5] |= 0x80 << (l % 32);
    m[(((l + 64) >>> 9) << 4) + 14] = l;

    // Method shortcuts
    var FF = md5._ff,
        GG = md5._gg,
        HH = md5._hh,
        II = md5._ii;

    for (var i = 0; i < m.length; i += 16) {

      var aa = a,
          bb = b,
          cc = c,
          dd = d;

      a = FF(a, b, c, d, m[i+ 0],  7, -680876936);
      d = FF(d, a, b, c, m[i+ 1], 12, -389564586);
      c = FF(c, d, a, b, m[i+ 2], 17,  606105819);
      b = FF(b, c, d, a, m[i+ 3], 22, -1044525330);
      a = FF(a, b, c, d, m[i+ 4],  7, -176418897);
      d = FF(d, a, b, c, m[i+ 5], 12,  1200080426);
      c = FF(c, d, a, b, m[i+ 6], 17, -1473231341);
      b = FF(b, c, d, a, m[i+ 7], 22, -45705983);
      a = FF(a, b, c, d, m[i+ 8],  7,  1770035416);
      d = FF(d, a, b, c, m[i+ 9], 12, -1958414417);
      c = FF(c, d, a, b, m[i+10], 17, -42063);
      b = FF(b, c, d, a, m[i+11], 22, -1990404162);
      a = FF(a, b, c, d, m[i+12],  7,  1804603682);
      d = FF(d, a, b, c, m[i+13], 12, -40341101);
      c = FF(c, d, a, b, m[i+14], 17, -1502002290);
      b = FF(b, c, d, a, m[i+15], 22,  1236535329);

      a = GG(a, b, c, d, m[i+ 1],  5, -165796510);
      d = GG(d, a, b, c, m[i+ 6],  9, -1069501632);
      c = GG(c, d, a, b, m[i+11], 14,  643717713);
      b = GG(b, c, d, a, m[i+ 0], 20, -373897302);
      a = GG(a, b, c, d, m[i+ 5],  5, -701558691);
      d = GG(d, a, b, c, m[i+10],  9,  38016083);
      c = GG(c, d, a, b, m[i+15], 14, -660478335);
      b = GG(b, c, d, a, m[i+ 4], 20, -405537848);
      a = GG(a, b, c, d, m[i+ 9],  5,  568446438);
      d = GG(d, a, b, c, m[i+14],  9, -1019803690);
      c = GG(c, d, a, b, m[i+ 3], 14, -187363961);
      b = GG(b, c, d, a, m[i+ 8], 20,  1163531501);
      a = GG(a, b, c, d, m[i+13],  5, -1444681467);
      d = GG(d, a, b, c, m[i+ 2],  9, -51403784);
      c = GG(c, d, a, b, m[i+ 7], 14,  1735328473);
      b = GG(b, c, d, a, m[i+12], 20, -1926607734);

      a = HH(a, b, c, d, m[i+ 5],  4, -378558);
      d = HH(d, a, b, c, m[i+ 8], 11, -2022574463);
      c = HH(c, d, a, b, m[i+11], 16,  1839030562);
      b = HH(b, c, d, a, m[i+14], 23, -35309556);
      a = HH(a, b, c, d, m[i+ 1],  4, -1530992060);
      d = HH(d, a, b, c, m[i+ 4], 11,  1272893353);
      c = HH(c, d, a, b, m[i+ 7], 16, -155497632);
      b = HH(b, c, d, a, m[i+10], 23, -1094730640);
      a = HH(a, b, c, d, m[i+13],  4,  681279174);
      d = HH(d, a, b, c, m[i+ 0], 11, -358537222);
      c = HH(c, d, a, b, m[i+ 3], 16, -722521979);
      b = HH(b, c, d, a, m[i+ 6], 23,  76029189);
      a = HH(a, b, c, d, m[i+ 9],  4, -640364487);
      d = HH(d, a, b, c, m[i+12], 11, -421815835);
      c = HH(c, d, a, b, m[i+15], 16,  530742520);
      b = HH(b, c, d, a, m[i+ 2], 23, -995338651);

      a = II(a, b, c, d, m[i+ 0],  6, -198630844);
      d = II(d, a, b, c, m[i+ 7], 10,  1126891415);
      c = II(c, d, a, b, m[i+14], 15, -1416354905);
      b = II(b, c, d, a, m[i+ 5], 21, -57434055);
      a = II(a, b, c, d, m[i+12],  6,  1700485571);
      d = II(d, a, b, c, m[i+ 3], 10, -1894986606);
      c = II(c, d, a, b, m[i+10], 15, -1051523);
      b = II(b, c, d, a, m[i+ 1], 21, -2054922799);
      a = II(a, b, c, d, m[i+ 8],  6,  1873313359);
      d = II(d, a, b, c, m[i+15], 10, -30611744);
      c = II(c, d, a, b, m[i+ 6], 15, -1560198380);
      b = II(b, c, d, a, m[i+13], 21,  1309151649);
      a = II(a, b, c, d, m[i+ 4],  6, -145523070);
      d = II(d, a, b, c, m[i+11], 10, -1120210379);
      c = II(c, d, a, b, m[i+ 2], 15,  718787259);
      b = II(b, c, d, a, m[i+ 9], 21, -343485551);

      a = (a + aa) >>> 0;
      b = (b + bb) >>> 0;
      c = (c + cc) >>> 0;
      d = (d + dd) >>> 0;
    }

    return crypt.endian([a, b, c, d]);
  };

  // Auxiliary functions
  md5._ff  = function (a, b, c, d, x, s, t) {
    var n = a + (b & c | ~b & d) + (x >>> 0) + t;
    return ((n << s) | (n >>> (32 - s))) + b;
  };
  md5._gg  = function (a, b, c, d, x, s, t) {
    var n = a + (b & d | c & ~d) + (x >>> 0) + t;
    return ((n << s) | (n >>> (32 - s))) + b;
  };
  md5._hh  = function (a, b, c, d, x, s, t) {
    var n = a + (b ^ c ^ d) + (x >>> 0) + t;
    return ((n << s) | (n >>> (32 - s))) + b;
  };
  md5._ii  = function (a, b, c, d, x, s, t) {
    var n = a + (c ^ (b | ~d)) + (x >>> 0) + t;
    return ((n << s) | (n >>> (32 - s))) + b;
  };

  // Package private blocksize
  md5._blocksize = 16;
  md5._digestsize = 16;

  module.exports = function (message, options) {
    if (message === undefined || message === null)
      throw new Error('Illegal argument ' + message);

    var digestbytes = crypt.wordsToBytes(md5(message, options));
    return options && options.asBytes ? digestbytes :
        options && options.asString ? bin.bytesToString(digestbytes) :
        crypt.bytesToHex(digestbytes);
  };

})();

},{"charenc":38,"crypt":39,"is-buffer":43}],45:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],46:[function(require,module,exports){
(function (process){
module.exports = process.env.PROMISE_QUEUE_COVERAGE ?
    require('./lib-cov') :
    require('./lib');

}).call(this,require('_process'))
},{"./lib":48,"./lib-cov":47,"_process":45}],47:[function(require,module,exports){

},{}],48:[function(require,module,exports){
/* global define, Promise */
(function (root, factory) {
    'use strict';
    if (typeof module === 'object' && module.exports && typeof require === 'function') {
        // CommonJS
        module.exports = factory();
    } else if (typeof define === 'function' && typeof define.amd === 'object') {
        // AMD. Register as an anonymous module.
        define(factory);
    } else {
        // Browser globals
        root.Queue = factory();
    }
})
(this, function () {
    'use strict';

    /**
     * @return {Object}
     */
    var LocalPromise = typeof Promise !== 'undefined' ? Promise : function () {
        return {
            then: function () {
                throw new Error('Queue.configure() before use Queue');
            }
        };
    };

    var noop = function () {};

    /**
     * @param {*} value
     * @returns {LocalPromise}
     */
    var resolveWith = function (value) {
        if (value && typeof value.then === 'function') {
            return value;
        }

        return new LocalPromise(function (resolve) {
            resolve(value);
        });
    };

    /**
     * It limits concurrently executed promises
     *
     * @param {Number} [maxPendingPromises=Infinity] max number of concurrently executed promises
     * @param {Number} [maxQueuedPromises=Infinity]  max number of queued promises
     * @constructor
     *
     * @example
     *
     * var queue = new Queue(1);
     *
     * queue.add(function () {
     *     // resolve of this promise will resume next request
     *     return downloadTarballFromGithub(url, file);
     * })
     * .then(function (file) {
     *     doStuffWith(file);
     * });
     *
     * queue.add(function () {
     *     return downloadTarballFromGithub(url, file);
     * })
     * // This request will be paused
     * .then(function (file) {
     *     doStuffWith(file);
     * });
     */
    function Queue(maxPendingPromises, maxQueuedPromises, options) {
        this.options = options = options || {};
        this.pendingPromises = 0;
        this.maxPendingPromises = typeof maxPendingPromises !== 'undefined' ? maxPendingPromises : Infinity;
        this.maxQueuedPromises = typeof maxQueuedPromises !== 'undefined' ? maxQueuedPromises : Infinity;
        this.queue = [];
    }

    /**
     * Defines promise promiseFactory
     * @param {Function} GlobalPromise
     */
    Queue.configure = function (GlobalPromise) {
        LocalPromise = GlobalPromise;
    };

    /**
     * @param {Function} promiseGenerator
     * @return {LocalPromise}
     */
    Queue.prototype.add = function (promiseGenerator) {
        var self = this;
        return new LocalPromise(function (resolve, reject, notify) {
            // Do not queue to much promises
            if (self.queue.length >= self.maxQueuedPromises) {
                reject(new Error('Queue limit reached'));
                return;
            }

            // Add to queue
            self.queue.push({
                promiseGenerator: promiseGenerator,
                resolve: resolve,
                reject: reject,
                notify: notify || noop
            });

            self._dequeue();
        });
    };

    /**
     * Number of simultaneously running promises (which are resolving)
     *
     * @return {number}
     */
    Queue.prototype.getPendingLength = function () {
        return this.pendingPromises;
    };

    /**
     * Number of queued promises (which are waiting)
     *
     * @return {number}
     */
    Queue.prototype.getQueueLength = function () {
        return this.queue.length;
    };

    /**
     * @returns {boolean} true if first item removed from queue
     * @private
     */
    Queue.prototype._dequeue = function () {
        var self = this;
        if (this.pendingPromises >= this.maxPendingPromises) {
            return false;
        }

        // Remove from queue
        var item = this.queue.shift();
        if (!item) {
            if (this.options.onEmpty) {
                this.options.onEmpty();
            }
            return false;
        }

        try {
            this.pendingPromises++;

            resolveWith(item.promiseGenerator())
            // Forward all stuff
                .then(function (value) {
                    // It is not pending now
                    self.pendingPromises--;
                    // It should pass values
                    item.resolve(value);
                    self._dequeue();
                }, function (err) {
                    // It is not pending now
                    self.pendingPromises--;
                    // It should not mask errors
                    item.reject(err);
                    self._dequeue();
                }, function (message) {
                    // It should pass notifications
                    item.notify(message);
                });
        } catch (err) {
            self.pendingPromises--;
            item.reject(err);
            self._dequeue();

        }

        return true;
    };

    return Queue;
});

},{}],49:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

// If obj.hasOwnProperty has been overridden, then calling
// obj.hasOwnProperty(prop) will break.
// See: https://github.com/joyent/node/issues/1707
function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

module.exports = function(qs, sep, eq, options) {
  sep = sep || '&';
  eq = eq || '=';
  var obj = {};

  if (typeof qs !== 'string' || qs.length === 0) {
    return obj;
  }

  var regexp = /\+/g;
  qs = qs.split(sep);

  var maxKeys = 1000;
  if (options && typeof options.maxKeys === 'number') {
    maxKeys = options.maxKeys;
  }

  var len = qs.length;
  // maxKeys <= 0 means that we should not limit keys count
  if (maxKeys > 0 && len > maxKeys) {
    len = maxKeys;
  }

  for (var i = 0; i < len; ++i) {
    var x = qs[i].replace(regexp, '%20'),
        idx = x.indexOf(eq),
        kstr, vstr, k, v;

    if (idx >= 0) {
      kstr = x.substr(0, idx);
      vstr = x.substr(idx + 1);
    } else {
      kstr = x;
      vstr = '';
    }

    k = decodeURIComponent(kstr);
    v = decodeURIComponent(vstr);

    if (!hasOwnProperty(obj, k)) {
      obj[k] = v;
    } else if (isArray(obj[k])) {
      obj[k].push(v);
    } else {
      obj[k] = [obj[k], v];
    }
  }

  return obj;
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

},{}],50:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

var stringifyPrimitive = function(v) {
  switch (typeof v) {
    case 'string':
      return v;

    case 'boolean':
      return v ? 'true' : 'false';

    case 'number':
      return isFinite(v) ? v : '';

    default:
      return '';
  }
};

module.exports = function(obj, sep, eq, name) {
  sep = sep || '&';
  eq = eq || '=';
  if (obj === null) {
    obj = undefined;
  }

  if (typeof obj === 'object') {
    return map(objectKeys(obj), function(k) {
      var ks = encodeURIComponent(stringifyPrimitive(k)) + eq;
      if (isArray(obj[k])) {
        return map(obj[k], function(v) {
          return ks + encodeURIComponent(stringifyPrimitive(v));
        }).join(sep);
      } else {
        return ks + encodeURIComponent(stringifyPrimitive(obj[k]));
      }
    }).join(sep);

  }

  if (!name) return '';
  return encodeURIComponent(stringifyPrimitive(name)) + eq +
         encodeURIComponent(stringifyPrimitive(obj));
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

function map (xs, f) {
  if (xs.map) return xs.map(f);
  var res = [];
  for (var i = 0; i < xs.length; i++) {
    res.push(f(xs[i], i));
  }
  return res;
}

var objectKeys = Object.keys || function (obj) {
  var res = [];
  for (var key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) res.push(key);
  }
  return res;
};

},{}],51:[function(require,module,exports){
'use strict';

exports.decode = exports.parse = require('./decode');
exports.encode = exports.stringify = require('./encode');

},{"./decode":49,"./encode":50}],52:[function(require,module,exports){
/*jshint eqnull:true*/
(function (root) {
  "use strict";

  var GLOBAL_KEY = "Random";

  var imul = (typeof Math.imul !== "function" || Math.imul(0xffffffff, 5) !== -5 ?
    function (a, b) {
      var ah = (a >>> 16) & 0xffff;
      var al = a & 0xffff;
      var bh = (b >>> 16) & 0xffff;
      var bl = b & 0xffff;
      // the shift by 0 fixes the sign on the high part
      // the final |0 converts the unsigned value into a signed value
      return (al * bl) + (((ah * bl + al * bh) << 16) >>> 0) | 0;
    } :
    Math.imul);

  var stringRepeat = (typeof String.prototype.repeat === "function" && "x".repeat(3) === "xxx" ?
    function (x, y) {
      return x.repeat(y);
    } : function (pattern, count) {
      var result = "";
      while (count > 0) {
        if (count & 1) {
          result += pattern;
        }
        count >>= 1;
        pattern += pattern;
      }
      return result;
    });

  function Random(engine) {
    if (!(this instanceof Random)) {
      return new Random(engine);
    }

    if (engine == null) {
      engine = Random.engines.nativeMath;
    } else if (typeof engine !== "function") {
      throw new TypeError("Expected engine to be a function, got " + typeof engine);
    }
    this.engine = engine;
  }
  var proto = Random.prototype;

  Random.engines = {
    nativeMath: function () {
      return (Math.random() * 0x100000000) | 0;
    },
    mt19937: (function (Int32Array) {
      // http://en.wikipedia.org/wiki/Mersenne_twister
      function refreshData(data) {
        var k = 0;
        var tmp = 0;
        for (;
          (k | 0) < 227; k = (k + 1) | 0) {
          tmp = (data[k] & 0x80000000) | (data[(k + 1) | 0] & 0x7fffffff);
          data[k] = data[(k + 397) | 0] ^ (tmp >>> 1) ^ ((tmp & 0x1) ? 0x9908b0df : 0);
        }

        for (;
          (k | 0) < 623; k = (k + 1) | 0) {
          tmp = (data[k] & 0x80000000) | (data[(k + 1) | 0] & 0x7fffffff);
          data[k] = data[(k - 227) | 0] ^ (tmp >>> 1) ^ ((tmp & 0x1) ? 0x9908b0df : 0);
        }

        tmp = (data[623] & 0x80000000) | (data[0] & 0x7fffffff);
        data[623] = data[396] ^ (tmp >>> 1) ^ ((tmp & 0x1) ? 0x9908b0df : 0);
      }

      function temper(value) {
        value ^= value >>> 11;
        value ^= (value << 7) & 0x9d2c5680;
        value ^= (value << 15) & 0xefc60000;
        return value ^ (value >>> 18);
      }

      function seedWithArray(data, source) {
        var i = 1;
        var j = 0;
        var sourceLength = source.length;
        var k = Math.max(sourceLength, 624) | 0;
        var previous = data[0] | 0;
        for (;
          (k | 0) > 0; --k) {
          data[i] = previous = ((data[i] ^ imul((previous ^ (previous >>> 30)), 0x0019660d)) + (source[j] | 0) + (j | 0)) | 0;
          i = (i + 1) | 0;
          ++j;
          if ((i | 0) > 623) {
            data[0] = data[623];
            i = 1;
          }
          if (j >= sourceLength) {
            j = 0;
          }
        }
        for (k = 623;
          (k | 0) > 0; --k) {
          data[i] = previous = ((data[i] ^ imul((previous ^ (previous >>> 30)), 0x5d588b65)) - i) | 0;
          i = (i + 1) | 0;
          if ((i | 0) > 623) {
            data[0] = data[623];
            i = 1;
          }
        }
        data[0] = 0x80000000;
      }

      function mt19937() {
        var data = new Int32Array(624);
        var index = 0;
        var uses = 0;

        function next() {
          if ((index | 0) >= 624) {
            refreshData(data);
            index = 0;
          }

          var value = data[index];
          index = (index + 1) | 0;
          uses += 1;
          return temper(value) | 0;
        }
        next.getUseCount = function() {
          return uses;
        };
        next.discard = function (count) {
          uses += count;
          if ((index | 0) >= 624) {
            refreshData(data);
            index = 0;
          }
          while ((count - index) > 624) {
            count -= 624 - index;
            refreshData(data);
            index = 0;
          }
          index = (index + count) | 0;
          return next;
        };
        next.seed = function (initial) {
          var previous = 0;
          data[0] = previous = initial | 0;

          for (var i = 1; i < 624; i = (i + 1) | 0) {
            data[i] = previous = (imul((previous ^ (previous >>> 30)), 0x6c078965) + i) | 0;
          }
          index = 624;
          uses = 0;
          return next;
        };
        next.seedWithArray = function (source) {
          next.seed(0x012bd6aa);
          seedWithArray(data, source);
          return next;
        };
        next.autoSeed = function () {
          return next.seedWithArray(Random.generateEntropyArray());
        };
        return next;
      }

      return mt19937;
    }(typeof Int32Array === "function" ? Int32Array : Array)),
    browserCrypto: (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function" && typeof Int32Array === "function") ? (function () {
      var data = null;
      var index = 128;

      return function () {
        if (index >= 128) {
          if (data === null) {
            data = new Int32Array(128);
          }
          crypto.getRandomValues(data);
          index = 0;
        }

        return data[index++] | 0;
      };
    }()) : null
  };

  Random.generateEntropyArray = function () {
    var array = [];
    var engine = Random.engines.nativeMath;
    for (var i = 0; i < 16; ++i) {
      array[i] = engine() | 0;
    }
    array.push(new Date().getTime() | 0);
    return array;
  };

  function returnValue(value) {
    return function () {
      return value;
    };
  }

  // [-0x80000000, 0x7fffffff]
  Random.int32 = function (engine) {
    return engine() | 0;
  };
  proto.int32 = function () {
    return Random.int32(this.engine);
  };

  // [0, 0xffffffff]
  Random.uint32 = function (engine) {
    return engine() >>> 0;
  };
  proto.uint32 = function () {
    return Random.uint32(this.engine);
  };

  // [0, 0x1fffffffffffff]
  Random.uint53 = function (engine) {
    var high = engine() & 0x1fffff;
    var low = engine() >>> 0;
    return (high * 0x100000000) + low;
  };
  proto.uint53 = function () {
    return Random.uint53(this.engine);
  };

  // [0, 0x20000000000000]
  Random.uint53Full = function (engine) {
    while (true) {
      var high = engine() | 0;
      if (high & 0x200000) {
        if ((high & 0x3fffff) === 0x200000 && (engine() | 0) === 0) {
          return 0x20000000000000;
        }
      } else {
        var low = engine() >>> 0;
        return ((high & 0x1fffff) * 0x100000000) + low;
      }
    }
  };
  proto.uint53Full = function () {
    return Random.uint53Full(this.engine);
  };

  // [-0x20000000000000, 0x1fffffffffffff]
  Random.int53 = function (engine) {
    var high = engine() | 0;
    var low = engine() >>> 0;
    return ((high & 0x1fffff) * 0x100000000) + low + (high & 0x200000 ? -0x20000000000000 : 0);
  };
  proto.int53 = function () {
    return Random.int53(this.engine);
  };

  // [-0x20000000000000, 0x20000000000000]
  Random.int53Full = function (engine) {
    while (true) {
      var high = engine() | 0;
      if (high & 0x400000) {
        if ((high & 0x7fffff) === 0x400000 && (engine() | 0) === 0) {
          return 0x20000000000000;
        }
      } else {
        var low = engine() >>> 0;
        return ((high & 0x1fffff) * 0x100000000) + low + (high & 0x200000 ? -0x20000000000000 : 0);
      }
    }
  };
  proto.int53Full = function () {
    return Random.int53Full(this.engine);
  };

  function add(generate, addend) {
    if (addend === 0) {
      return generate;
    } else {
      return function (engine) {
        return generate(engine) + addend;
      };
    }
  }

  Random.integer = (function () {
    function isPowerOfTwoMinusOne(value) {
      return ((value + 1) & value) === 0;
    }

    function bitmask(masking) {
      return function (engine) {
        return engine() & masking;
      };
    }

    function downscaleToLoopCheckedRange(range) {
      var extendedRange = range + 1;
      var maximum = extendedRange * Math.floor(0x100000000 / extendedRange);
      return function (engine) {
        var value = 0;
        do {
          value = engine() >>> 0;
        } while (value >= maximum);
        return value % extendedRange;
      };
    }

    function downscaleToRange(range) {
      if (isPowerOfTwoMinusOne(range)) {
        return bitmask(range);
      } else {
        return downscaleToLoopCheckedRange(range);
      }
    }

    function isEvenlyDivisibleByMaxInt32(value) {
      return (value | 0) === 0;
    }

    function upscaleWithHighMasking(masking) {
      return function (engine) {
        var high = engine() & masking;
        var low = engine() >>> 0;
        return (high * 0x100000000) + low;
      };
    }

    function upscaleToLoopCheckedRange(extendedRange) {
      var maximum = extendedRange * Math.floor(0x20000000000000 / extendedRange);
      return function (engine) {
        var ret = 0;
        do {
          var high = engine() & 0x1fffff;
          var low = engine() >>> 0;
          ret = (high * 0x100000000) + low;
        } while (ret >= maximum);
        return ret % extendedRange;
      };
    }

    function upscaleWithinU53(range) {
      var extendedRange = range + 1;
      if (isEvenlyDivisibleByMaxInt32(extendedRange)) {
        var highRange = ((extendedRange / 0x100000000) | 0) - 1;
        if (isPowerOfTwoMinusOne(highRange)) {
          return upscaleWithHighMasking(highRange);
        }
      }
      return upscaleToLoopCheckedRange(extendedRange);
    }

    function upscaleWithinI53AndLoopCheck(min, max) {
      return function (engine) {
        var ret = 0;
        do {
          var high = engine() | 0;
          var low = engine() >>> 0;
          ret = ((high & 0x1fffff) * 0x100000000) + low + (high & 0x200000 ? -0x20000000000000 : 0);
        } while (ret < min || ret > max);
        return ret;
      };
    }

    return function (min, max) {
      min = Math.floor(min);
      max = Math.floor(max);
      if (min < -0x20000000000000 || !isFinite(min)) {
        throw new RangeError("Expected min to be at least " + (-0x20000000000000));
      } else if (max > 0x20000000000000 || !isFinite(max)) {
        throw new RangeError("Expected max to be at most " + 0x20000000000000);
      }

      var range = max - min;
      if (range <= 0 || !isFinite(range)) {
        return returnValue(min);
      } else if (range === 0xffffffff) {
        if (min === 0) {
          return Random.uint32;
        } else {
          return add(Random.int32, min + 0x80000000);
        }
      } else if (range < 0xffffffff) {
        return add(downscaleToRange(range), min);
      } else if (range === 0x1fffffffffffff) {
        return add(Random.uint53, min);
      } else if (range < 0x1fffffffffffff) {
        return add(upscaleWithinU53(range), min);
      } else if (max - 1 - min === 0x1fffffffffffff) {
        return add(Random.uint53Full, min);
      } else if (min === -0x20000000000000 && max === 0x20000000000000) {
        return Random.int53Full;
      } else if (min === -0x20000000000000 && max === 0x1fffffffffffff) {
        return Random.int53;
      } else if (min === -0x1fffffffffffff && max === 0x20000000000000) {
        return add(Random.int53, 1);
      } else if (max === 0x20000000000000) {
        return add(upscaleWithinI53AndLoopCheck(min - 1, max - 1), 1);
      } else {
        return upscaleWithinI53AndLoopCheck(min, max);
      }
    };
  }());
  proto.integer = function (min, max) {
    return Random.integer(min, max)(this.engine);
  };

  // [0, 1] (floating point)
  Random.realZeroToOneInclusive = function (engine) {
    return Random.uint53Full(engine) / 0x20000000000000;
  };
  proto.realZeroToOneInclusive = function () {
    return Random.realZeroToOneInclusive(this.engine);
  };

  // [0, 1) (floating point)
  Random.realZeroToOneExclusive = function (engine) {
    return Random.uint53(engine) / 0x20000000000000;
  };
  proto.realZeroToOneExclusive = function () {
    return Random.realZeroToOneExclusive(this.engine);
  };

  Random.real = (function () {
    function multiply(generate, multiplier) {
      if (multiplier === 1) {
        return generate;
      } else if (multiplier === 0) {
        return function () {
          return 0;
        };
      } else {
        return function (engine) {
          return generate(engine) * multiplier;
        };
      }
    }

    return function (left, right, inclusive) {
      if (!isFinite(left)) {
        throw new RangeError("Expected left to be a finite number");
      } else if (!isFinite(right)) {
        throw new RangeError("Expected right to be a finite number");
      }
      return add(
        multiply(
          inclusive ? Random.realZeroToOneInclusive : Random.realZeroToOneExclusive,
          right - left),
        left);
    };
  }());
  proto.real = function (min, max, inclusive) {
    return Random.real(min, max, inclusive)(this.engine);
  };

  Random.bool = (function () {
    function isLeastBitTrue(engine) {
      return (engine() & 1) === 1;
    }

    function lessThan(generate, value) {
      return function (engine) {
        return generate(engine) < value;
      };
    }

    function probability(percentage) {
      if (percentage <= 0) {
        return returnValue(false);
      } else if (percentage >= 1) {
        return returnValue(true);
      } else {
        var scaled = percentage * 0x100000000;
        if (scaled % 1 === 0) {
          return lessThan(Random.int32, (scaled - 0x80000000) | 0);
        } else {
          return lessThan(Random.uint53, Math.round(percentage * 0x20000000000000));
        }
      }
    }

    return function (numerator, denominator) {
      if (denominator == null) {
        if (numerator == null) {
          return isLeastBitTrue;
        }
        return probability(numerator);
      } else {
        if (numerator <= 0) {
          return returnValue(false);
        } else if (numerator >= denominator) {
          return returnValue(true);
        }
        return lessThan(Random.integer(0, denominator - 1), numerator);
      }
    };
  }());
  proto.bool = function (numerator, denominator) {
    return Random.bool(numerator, denominator)(this.engine);
  };

  function toInteger(value) {
    var number = +value;
    if (number < 0) {
      return Math.ceil(number);
    } else {
      return Math.floor(number);
    }
  }

  function convertSliceArgument(value, length) {
    if (value < 0) {
      return Math.max(value + length, 0);
    } else {
      return Math.min(value, length);
    }
  }
  Random.pick = function (engine, array, begin, end) {
    var length = array.length;
    var start = begin == null ? 0 : convertSliceArgument(toInteger(begin), length);
    var finish = end === void 0 ? length : convertSliceArgument(toInteger(end), length);
    if (start >= finish) {
      return void 0;
    }
    var distribution = Random.integer(start, finish - 1);
    return array[distribution(engine)];
  };
  proto.pick = function (array, begin, end) {
    return Random.pick(this.engine, array, begin, end);
  };

  function returnUndefined() {
    return void 0;
  }
  var slice = Array.prototype.slice;
  Random.picker = function (array, begin, end) {
    var clone = slice.call(array, begin, end);
    if (!clone.length) {
      return returnUndefined;
    }
    var distribution = Random.integer(0, clone.length - 1);
    return function (engine) {
      return clone[distribution(engine)];
    };
  };

  Random.shuffle = function (engine, array, downTo) {
    var length = array.length;
    if (length) {
      if (downTo == null) {
        downTo = 0;
      }
      for (var i = (length - 1) >>> 0; i > downTo; --i) {
        var distribution = Random.integer(0, i);
        var j = distribution(engine);
        if (i !== j) {
          var tmp = array[i];
          array[i] = array[j];
          array[j] = tmp;
        }
      }
    }
    return array;
  };
  proto.shuffle = function (array) {
    return Random.shuffle(this.engine, array);
  };

  Random.sample = function (engine, population, sampleSize) {
    if (sampleSize < 0 || sampleSize > population.length || !isFinite(sampleSize)) {
      throw new RangeError("Expected sampleSize to be within 0 and the length of the population");
    }

    if (sampleSize === 0) {
      return [];
    }

    var clone = slice.call(population);
    var length = clone.length;
    if (length === sampleSize) {
      return Random.shuffle(engine, clone, 0);
    }
    var tailLength = length - sampleSize;
    return Random.shuffle(engine, clone, tailLength - 1).slice(tailLength);
  };
  proto.sample = function (population, sampleSize) {
    return Random.sample(this.engine, population, sampleSize);
  };

  Random.die = function (sideCount) {
    return Random.integer(1, sideCount);
  };
  proto.die = function (sideCount) {
    return Random.die(sideCount)(this.engine);
  };

  Random.dice = function (sideCount, dieCount) {
    var distribution = Random.die(sideCount);
    return function (engine) {
      var result = [];
      result.length = dieCount;
      for (var i = 0; i < dieCount; ++i) {
        result[i] = distribution(engine);
      }
      return result;
    };
  };
  proto.dice = function (sideCount, dieCount) {
    return Random.dice(sideCount, dieCount)(this.engine);
  };

  // http://en.wikipedia.org/wiki/Universally_unique_identifier
  Random.uuid4 = (function () {
    function zeroPad(string, zeroCount) {
      return stringRepeat("0", zeroCount - string.length) + string;
    }

    return function (engine) {
      var a = engine() >>> 0;
      var b = engine() | 0;
      var c = engine() | 0;
      var d = engine() >>> 0;

      return (
        zeroPad(a.toString(16), 8) +
        "-" +
        zeroPad((b & 0xffff).toString(16), 4) +
        "-" +
        zeroPad((((b >> 4) & 0x0fff) | 0x4000).toString(16), 4) +
        "-" +
        zeroPad(((c & 0x3fff) | 0x8000).toString(16), 4) +
        "-" +
        zeroPad(((c >> 4) & 0xffff).toString(16), 4) +
        zeroPad(d.toString(16), 8));
    };
  }());
  proto.uuid4 = function () {
    return Random.uuid4(this.engine);
  };

  Random.string = (function () {
    // has 2**x chars, for faster uniform distribution
    var DEFAULT_STRING_POOL = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-";

    return function (pool) {
      if (pool == null) {
        pool = DEFAULT_STRING_POOL;
      }

      var length = pool.length;
      if (!length) {
        throw new Error("Expected pool not to be an empty string");
      }

      var distribution = Random.integer(0, length - 1);
      return function (engine, length) {
        var result = "";
        for (var i = 0; i < length; ++i) {
          var j = distribution(engine);
          result += pool.charAt(j);
        }
        return result;
      };
    };
  }());
  proto.string = function (length, pool) {
    return Random.string(pool)(this.engine, length);
  };

  Random.hex = (function () {
    var LOWER_HEX_POOL = "0123456789abcdef";
    var lowerHex = Random.string(LOWER_HEX_POOL);
    var upperHex = Random.string(LOWER_HEX_POOL.toUpperCase());

    return function (upper) {
      if (upper) {
        return upperHex;
      } else {
        return lowerHex;
      }
    };
  }());
  proto.hex = function (length, upper) {
    return Random.hex(upper)(this.engine, length);
  };

  Random.date = function (start, end) {
    if (!(start instanceof Date)) {
      throw new TypeError("Expected start to be a Date, got " + typeof start);
    } else if (!(end instanceof Date)) {
      throw new TypeError("Expected end to be a Date, got " + typeof end);
    }
    var distribution = Random.integer(start.getTime(), end.getTime());
    return function (engine) {
      return new Date(distribution(engine));
    };
  };
  proto.date = function (start, end) {
    return Random.date(start, end)(this.engine);
  };

  if (typeof define === "function" && define.amd) {
    define(function () {
      return Random;
    });
  } else if (typeof module !== "undefined" && typeof require === "function") {
    module.exports = Random;
  } else {
    (function () {
      var oldGlobal = root[GLOBAL_KEY];
      Random.noConflict = function () {
        root[GLOBAL_KEY] = oldGlobal;
        return this;
      };
    }());
    root[GLOBAL_KEY] = Random;
  }
}(this));
},{}],53:[function(require,module,exports){
(function(self) {
  'use strict';

  if (self.fetch) {
    return
  }

  var support = {
    searchParams: 'URLSearchParams' in self,
    iterable: 'Symbol' in self && 'iterator' in Symbol,
    blob: 'FileReader' in self && 'Blob' in self && (function() {
      try {
        new Blob()
        return true
      } catch(e) {
        return false
      }
    })(),
    formData: 'FormData' in self,
    arrayBuffer: 'ArrayBuffer' in self
  }

  if (support.arrayBuffer) {
    var viewClasses = [
      '[object Int8Array]',
      '[object Uint8Array]',
      '[object Uint8ClampedArray]',
      '[object Int16Array]',
      '[object Uint16Array]',
      '[object Int32Array]',
      '[object Uint32Array]',
      '[object Float32Array]',
      '[object Float64Array]'
    ]

    var isDataView = function(obj) {
      return obj && DataView.prototype.isPrototypeOf(obj)
    }

    var isArrayBufferView = ArrayBuffer.isView || function(obj) {
      return obj && viewClasses.indexOf(Object.prototype.toString.call(obj)) > -1
    }
  }

  function normalizeName(name) {
    if (typeof name !== 'string') {
      name = String(name)
    }
    if (/[^a-z0-9\-#$%&'*+.\^_`|~]/i.test(name)) {
      throw new TypeError('Invalid character in header field name')
    }
    return name.toLowerCase()
  }

  function normalizeValue(value) {
    if (typeof value !== 'string') {
      value = String(value)
    }
    return value
  }

  // Build a destructive iterator for the value list
  function iteratorFor(items) {
    var iterator = {
      next: function() {
        var value = items.shift()
        return {done: value === undefined, value: value}
      }
    }

    if (support.iterable) {
      iterator[Symbol.iterator] = function() {
        return iterator
      }
    }

    return iterator
  }

  function Headers(headers) {
    this.map = {}

    if (headers instanceof Headers) {
      headers.forEach(function(value, name) {
        this.append(name, value)
      }, this)
    } else if (Array.isArray(headers)) {
      headers.forEach(function(header) {
        this.append(header[0], header[1])
      }, this)
    } else if (headers) {
      Object.getOwnPropertyNames(headers).forEach(function(name) {
        this.append(name, headers[name])
      }, this)
    }
  }

  Headers.prototype.append = function(name, value) {
    name = normalizeName(name)
    value = normalizeValue(value)
    var oldValue = this.map[name]
    this.map[name] = oldValue ? oldValue+','+value : value
  }

  Headers.prototype['delete'] = function(name) {
    delete this.map[normalizeName(name)]
  }

  Headers.prototype.get = function(name) {
    name = normalizeName(name)
    return this.has(name) ? this.map[name] : null
  }

  Headers.prototype.has = function(name) {
    return this.map.hasOwnProperty(normalizeName(name))
  }

  Headers.prototype.set = function(name, value) {
    this.map[normalizeName(name)] = normalizeValue(value)
  }

  Headers.prototype.forEach = function(callback, thisArg) {
    for (var name in this.map) {
      if (this.map.hasOwnProperty(name)) {
        callback.call(thisArg, this.map[name], name, this)
      }
    }
  }

  Headers.prototype.keys = function() {
    var items = []
    this.forEach(function(value, name) { items.push(name) })
    return iteratorFor(items)
  }

  Headers.prototype.values = function() {
    var items = []
    this.forEach(function(value) { items.push(value) })
    return iteratorFor(items)
  }

  Headers.prototype.entries = function() {
    var items = []
    this.forEach(function(value, name) { items.push([name, value]) })
    return iteratorFor(items)
  }

  if (support.iterable) {
    Headers.prototype[Symbol.iterator] = Headers.prototype.entries
  }

  function consumed(body) {
    if (body.bodyUsed) {
      return Promise.reject(new TypeError('Already read'))
    }
    body.bodyUsed = true
  }

  function fileReaderReady(reader) {
    return new Promise(function(resolve, reject) {
      reader.onload = function() {
        resolve(reader.result)
      }
      reader.onerror = function() {
        reject(reader.error)
      }
    })
  }

  function readBlobAsArrayBuffer(blob) {
    var reader = new FileReader()
    var promise = fileReaderReady(reader)
    reader.readAsArrayBuffer(blob)
    return promise
  }

  function readBlobAsText(blob) {
    var reader = new FileReader()
    var promise = fileReaderReady(reader)
    reader.readAsText(blob)
    return promise
  }

  function readArrayBufferAsText(buf) {
    var view = new Uint8Array(buf)
    var chars = new Array(view.length)

    for (var i = 0; i < view.length; i++) {
      chars[i] = String.fromCharCode(view[i])
    }
    return chars.join('')
  }

  function bufferClone(buf) {
    if (buf.slice) {
      return buf.slice(0)
    } else {
      var view = new Uint8Array(buf.byteLength)
      view.set(new Uint8Array(buf))
      return view.buffer
    }
  }

  function Body() {
    this.bodyUsed = false

    this._initBody = function(body) {
      this._bodyInit = body
      if (!body) {
        this._bodyText = ''
      } else if (typeof body === 'string') {
        this._bodyText = body
      } else if (support.blob && Blob.prototype.isPrototypeOf(body)) {
        this._bodyBlob = body
      } else if (support.formData && FormData.prototype.isPrototypeOf(body)) {
        this._bodyFormData = body
      } else if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
        this._bodyText = body.toString()
      } else if (support.arrayBuffer && support.blob && isDataView(body)) {
        this._bodyArrayBuffer = bufferClone(body.buffer)
        // IE 10-11 can't handle a DataView body.
        this._bodyInit = new Blob([this._bodyArrayBuffer])
      } else if (support.arrayBuffer && (ArrayBuffer.prototype.isPrototypeOf(body) || isArrayBufferView(body))) {
        this._bodyArrayBuffer = bufferClone(body)
      } else {
        throw new Error('unsupported BodyInit type')
      }

      if (!this.headers.get('content-type')) {
        if (typeof body === 'string') {
          this.headers.set('content-type', 'text/plain;charset=UTF-8')
        } else if (this._bodyBlob && this._bodyBlob.type) {
          this.headers.set('content-type', this._bodyBlob.type)
        } else if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
          this.headers.set('content-type', 'application/x-www-form-urlencoded;charset=UTF-8')
        }
      }
    }

    if (support.blob) {
      this.blob = function() {
        var rejected = consumed(this)
        if (rejected) {
          return rejected
        }

        if (this._bodyBlob) {
          return Promise.resolve(this._bodyBlob)
        } else if (this._bodyArrayBuffer) {
          return Promise.resolve(new Blob([this._bodyArrayBuffer]))
        } else if (this._bodyFormData) {
          throw new Error('could not read FormData body as blob')
        } else {
          return Promise.resolve(new Blob([this._bodyText]))
        }
      }

      this.arrayBuffer = function() {
        if (this._bodyArrayBuffer) {
          return consumed(this) || Promise.resolve(this._bodyArrayBuffer)
        } else {
          return this.blob().then(readBlobAsArrayBuffer)
        }
      }
    }

    this.text = function() {
      var rejected = consumed(this)
      if (rejected) {
        return rejected
      }

      if (this._bodyBlob) {
        return readBlobAsText(this._bodyBlob)
      } else if (this._bodyArrayBuffer) {
        return Promise.resolve(readArrayBufferAsText(this._bodyArrayBuffer))
      } else if (this._bodyFormData) {
        throw new Error('could not read FormData body as text')
      } else {
        return Promise.resolve(this._bodyText)
      }
    }

    if (support.formData) {
      this.formData = function() {
        return this.text().then(decode)
      }
    }

    this.json = function() {
      return this.text().then(JSON.parse)
    }

    return this
  }

  // HTTP methods whose capitalization should be normalized
  var methods = ['DELETE', 'GET', 'HEAD', 'OPTIONS', 'POST', 'PUT']

  function normalizeMethod(method) {
    var upcased = method.toUpperCase()
    return (methods.indexOf(upcased) > -1) ? upcased : method
  }

  function Request(input, options) {
    options = options || {}
    var body = options.body

    if (input instanceof Request) {
      if (input.bodyUsed) {
        throw new TypeError('Already read')
      }
      this.url = input.url
      this.credentials = input.credentials
      if (!options.headers) {
        this.headers = new Headers(input.headers)
      }
      this.method = input.method
      this.mode = input.mode
      if (!body && input._bodyInit != null) {
        body = input._bodyInit
        input.bodyUsed = true
      }
    } else {
      this.url = String(input)
    }

    this.credentials = options.credentials || this.credentials || 'omit'
    if (options.headers || !this.headers) {
      this.headers = new Headers(options.headers)
    }
    this.method = normalizeMethod(options.method || this.method || 'GET')
    this.mode = options.mode || this.mode || null
    this.referrer = null

    if ((this.method === 'GET' || this.method === 'HEAD') && body) {
      throw new TypeError('Body not allowed for GET or HEAD requests')
    }
    this._initBody(body)
  }

  Request.prototype.clone = function() {
    return new Request(this, { body: this._bodyInit })
  }

  function decode(body) {
    var form = new FormData()
    body.trim().split('&').forEach(function(bytes) {
      if (bytes) {
        var split = bytes.split('=')
        var name = split.shift().replace(/\+/g, ' ')
        var value = split.join('=').replace(/\+/g, ' ')
        form.append(decodeURIComponent(name), decodeURIComponent(value))
      }
    })
    return form
  }

  function parseHeaders(rawHeaders) {
    var headers = new Headers()
    // Replace instances of \r\n and \n followed by at least one space or horizontal tab with a space
    // https://tools.ietf.org/html/rfc7230#section-3.2
    var preProcessedHeaders = rawHeaders.replace(/\r?\n[\t ]+/g, ' ')
    preProcessedHeaders.split(/\r?\n/).forEach(function(line) {
      var parts = line.split(':')
      var key = parts.shift().trim()
      if (key) {
        var value = parts.join(':').trim()
        headers.append(key, value)
      }
    })
    return headers
  }

  Body.call(Request.prototype)

  function Response(bodyInit, options) {
    if (!options) {
      options = {}
    }

    this.type = 'default'
    this.status = options.status === undefined ? 200 : options.status
    this.ok = this.status >= 200 && this.status < 300
    this.statusText = 'statusText' in options ? options.statusText : 'OK'
    this.headers = new Headers(options.headers)
    this.url = options.url || ''
    this._initBody(bodyInit)
  }

  Body.call(Response.prototype)

  Response.prototype.clone = function() {
    return new Response(this._bodyInit, {
      status: this.status,
      statusText: this.statusText,
      headers: new Headers(this.headers),
      url: this.url
    })
  }

  Response.error = function() {
    var response = new Response(null, {status: 0, statusText: ''})
    response.type = 'error'
    return response
  }

  var redirectStatuses = [301, 302, 303, 307, 308]

  Response.redirect = function(url, status) {
    if (redirectStatuses.indexOf(status) === -1) {
      throw new RangeError('Invalid status code')
    }

    return new Response(null, {status: status, headers: {location: url}})
  }

  self.Headers = Headers
  self.Request = Request
  self.Response = Response

  self.fetch = function(input, init) {
    return new Promise(function(resolve, reject) {
      var request = new Request(input, init)
      var xhr = new XMLHttpRequest()

      xhr.onload = function() {
        var options = {
          status: xhr.status,
          statusText: xhr.statusText,
          headers: parseHeaders(xhr.getAllResponseHeaders() || '')
        }
        options.url = 'responseURL' in xhr ? xhr.responseURL : options.headers.get('X-Request-URL')
        var body = 'response' in xhr ? xhr.response : xhr.responseText
        resolve(new Response(body, options))
      }

      xhr.onerror = function() {
        reject(new TypeError('Network request failed'))
      }

      xhr.ontimeout = function() {
        reject(new TypeError('Network request failed'))
      }

      xhr.open(request.method, request.url, true)

      if (request.credentials === 'include') {
        xhr.withCredentials = true
      } else if (request.credentials === 'omit') {
        xhr.withCredentials = false
      }

      if ('responseType' in xhr && support.blob) {
        xhr.responseType = 'blob'
      }

      request.headers.forEach(function(value, name) {
        xhr.setRequestHeader(name, value)
      })

      xhr.send(typeof request._bodyInit === 'undefined' ? null : request._bodyInit)
    })
  }
  self.fetch.polyfill = true
})(typeof self !== 'undefined' ? self : this);

},{}],54:[function(require,module,exports){
module.exports={
  "name": "nuxeo",
  "description": "JavaScript client library for Nuxeo API",
  "version": "3.6.1",
  "main": "./lib/index.js",
  "author": "Nuxeo (http://www.nuxeo.com/)",
  "contributors": [
    {
      "name": "Thomas Roger",
      "email": "troger@nuxeo.com"
    }
  ],
  "license": "Apache-2.0",
  "homepage": "https://github.com/nuxeo/nuxeo-js-client",
  "repository": {
    "type": "git",
    "url": "git://github.com/nuxeo/nuxeo-js-client.git"
  },
  "engines": {
    "node": ">= 4.9.1"
  },
  "keywords": [
    "nuxeo"
  ],
  "dependencies": {
    "buffer": "^5.0.2",
    "es6-promise": "^4.0.5",
    "extend": "^3.0.0",
    "form-data": "^2.1.2",
    "md5": "^2.2.1",
    "node-fetch-npm": "^2.0.2",
    "promise-queue": "^2.2.2",
    "querystring": "^0.2.0",
    "random-js": "^1.0.8",
    "whatwg-fetch": "^2.0.2"
  },
  "devDependencies": {
    "babel-core": "^6.4.0",
    "babel-plugin-add-module-exports": "^0.2.1",
    "babel-plugin-transform-es2015-for-of": "^6.18.0",
    "babel-plugin-transform-es2015-modules-commonjs": "^6.4.0",
    "babel-plugin-transform-es2017-object-entries": "^0.0.4",
    "babel-plugin-transform-object-rest-spread": "^6.26.0",
    "babel-preset-es2017": "^6.24.1",
    "babelify": "^7.2.0",
    "browserify": "^13.0.0",
    "browserify-versionify": "^1.0.6",
    "chai": "^3.0.0",
    "chai-as-promised": "^6.0.0",
    "content-disposition": "^0.5.2",
    "del": "^2.2.0",
    "dirty-chai": "^1.2.2",
    "eslint": "^3.13.0",
    "eslint-config-airbnb-base": "^11.0.0",
    "eslint-plugin-import": "^2.2.0",
    "express": "^4.15.3",
    "gulp": "^3.9.1",
    "gulp-babel": "^6.1.2",
    "gulp-eslint": "^3.0.0",
    "gulp-istanbul": "^1.1.1",
    "gulp-mocha": "^3.0.1",
    "gulp-sequence": "^0.4.4",
    "jsdoc": "^3.5.3",
    "karma": "^1.4.0",
    "karma-babel-preprocessor": "^6.0.1",
    "karma-browserify": "^5.0.1",
    "karma-chai": "^0.1.0",
    "karma-chrome-launcher": "^2.0.0",
    "karma-firefox-launcher": "^1.0.0",
    "karma-junit-reporter": "^2.0.0",
    "karma-mocha": "^1.3.0",
    "karma-safari-launcher": "^1.0.0",
    "karma-spec-reporter": "^0.0.26",
    "mocha-jenkins-reporter": "^0.3.5",
    "vinyl-source-stream": "^1.1.0",
    "watchify": "^3.7.0"
  },
  "scripts": {
    "doc": "jsdoc -c jsdoc.json",
    "release": "./bin/release.sh",
    "start": "gulp build:browser && node examples/server.js",
    "it": "gulp it",
    "it:node:es5": "gulp it:node:es5"
  },
  "browser": {
    "./lib/deps/fetch.js": "./lib/deps/fetch-browser.js",
    "./lib/deps/promise.js": "./lib/deps/promise-browser.js",
    "./lib/deps/form-data.js": "./lib/deps/form-data-browser.js",
    "./lib/deps/utils/buffer.js": "./lib/deps/utils/buffer-browser.js",
    "./es2015/deps/fetch.js": "./es2015/deps/fetch-browser.js",
    "./es2015/deps/promise.js": "./es2015/deps/promise-browser.js",
    "./es2015/deps/form-data.js": "./es2015/deps/form-data-browser.js",
    "./es2015/deps/utils/buffer.js": "./es2015/deps/utils/buffer-browser.js"
  },
  "react-native": {
    "./lib/deps/fetch.js": "./lib/deps/fetch-react-native.js",
    "./lib/deps/promise.js": "./lib/deps/promise.js"
  }
}

},{}]},{},[19]);
