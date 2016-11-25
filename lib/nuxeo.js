'use strict';

const extend = require('extend');
const Base = require('./base');
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
const doFetch = require('./deps/fetch');

const API_PATH_V1 = 'api/v1/';
const AUTOMATION = 'automation/';

const DEFAULT_OPTS = {
  baseURL: 'http://localhost:8080/nuxeo/',
  apiPath: API_PATH_V1,
  promiseLibrary: null,
  auth: null,
};

/**
 * The `Nuxeo` class allows using the REST API of a Nuxeo Platform instance.
 * @extends Base
 *
 * @example
 * var Nuxeo = require('nuxeo')
 * var nuxeo = new Nuxeo({
 *  baseUrl: 'http://localhost:8080/nuxeo',
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
    this.connected = false;
    this.Promise = Nuxeo.Promise || Promise;
    this._activeRequests = 0;
  }

  /**
   * Connects to the Nuxeo Platform instance using the configured authentication.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A promise resolved with the logged in user.
   */
  login(opts = {}) {
    let finalOptions = {
      method: 'POST',
      url: join(this._automationURL, 'login'),
    };
    finalOptions = extend(true, finalOptions, opts);
    finalOptions = this._computeOptions(finalOptions);
    return this._http(finalOptions)
      .then((res) => {
        return this.request('user')
          .path(res.username)
          .get()
          .then((user) => {
            this.user = user;
            this.connected = true;
            return user;
          });
      });
  }

  /**
   * Does a http request.
   *
   * To be used when doing any call on Nuxeo Platform.
   */
  _http(opts = {}) {
    const options = this._computeFetchOptions(opts);
    return new this.Promise((resolve, reject) => {
      this._activeRequests++;

      const fetchOptions = {
        method: options.method,
        headers: options.headers,
        body: options.body,
      };
      if (!this._auth) {
        fetchOptions.credentials = 'include';
      }
      doFetch(options.url, fetchOptions)
        .then((res) => {
          this._activeRequests--;
          if (!(/^2/.test('' + res.status))) {
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
        }).catch((error) => {
          this._activeRequests--;
          return reject(error);
        });
    });
  }

  _computeFetchOptions(opts) {
    let options = {
      method: 'GET',
      headers: {},
      json: true,
      timeout: 30000,
      cache: false,
      resolveWithFullResponse: false,
    };
    options = extend(true, {}, options, opts);
    options.headers = Authentication.computeAuthentication(this._auth, options.headers);

    if (options.schemas && options.schemas.length > 0) {
      options.headers['X-NXDocumentProperties'] = options.schemas.join(',');
    }
    if (opts.repositoryName !== undefined) {
      options.headers['X-NXRepository'] = options.repositoryName;
    }

    if (opts.enrichers) {
      Object.keys(opts.enrichers).forEach((key) => {
        options.headers[`enrichers-${key}`] = options.enrichers[key].join(',');
      });
    }

    if (opts.fetchProperties) {
      Object.keys(opts.fetchProperties).forEach((key) => {
        options.headers[`fetch-${key}`] = options.fetchProperties[key].join(',');
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
      // do not stringify FormData
      if (typeof options.body === 'object' && !(options.body instanceof FormData)) {
        options.body = JSON.stringify(options.body);
      }
    }

    if (options.method === 'GET') {
      delete options.headers['Content-Type'];
    }

    if (options.queryParams) {
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
      url: this._automationURL,
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
      url: this._restURL,
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
      nuxeo: this,
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
      url: this._restURL,
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
      nuxeo: this,
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
      nuxeo: this,
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
      nuxeo: this,
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
      nuxeo: this,
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
        permission,
      },
    };
    finalOptions = extend(true, finalOptions, opts);
    finalOptions = this._computeOptions(finalOptions);
    return this._http(finalOptions)
      .then((res) => {
        return res.text();
      });
  }
}

/**
 * Sets the Promise library class to use.
 */
Nuxeo.promiseLibrary = (promiseLibrary) => {
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

module.exports = Nuxeo;
