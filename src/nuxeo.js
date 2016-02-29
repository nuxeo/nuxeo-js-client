'use strict';

import extend from 'extend';
import Base from './base';
import Operation from './operation';
import Request from './request';
import Repository from './repository';
import BatchUpload from './upload/batch';
import Users from './user/users';
import Groups from './group/groups';
import Directory from './directory/directory';
import Workflows from './workflow/workflows';
import join from './deps/utils/join';
import Promise from './deps/promise';
import queryString from 'query-string';
import FormData from './deps/form-data';
import computeAuthentication from './deps/auth';
import doFetch from './deps/fetch';

const API_PATH_V1 = 'api/v1/';
const AUTOMATION = 'automation/';

const DEFAULT_OPTS = {
  baseURL: 'http://localhost:8080/nuxeo/',
  apiPath: API_PATH_V1,
  promiseLibrary: null,
  auth: {
    method: 'basic',
    username: null,
    password: null,
  },
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
 *    username: 'Administrator',
 *    password: 'Administrator',
 *  }
 * });
 * nuxeo.request('path/').get().then((doc) => {
 *   // doc.uid !== null
 * });
 */
class Nuxeo extends Base {
  /**
   * Creates a new Nuxeo instance.
   * @param {object} opts - The configuration options.
   * @param {string} [opts.baseURL=http://localhost:8080/nuxeo/] - Base URL of the Nuxeo Platform.
   * @param {string} [opts.apiPath=api/v1] - The API path.
   */
  constructor(opts = {}) {
    const options = extend(true, {}, DEFAULT_OPTS, opts);
    super(options);
    this._baseURL = options.baseURL;
    this._restURL = join(this._baseURL, options.apiPath);
    this._automationURL = join(this._restURL, AUTOMATION);
    this.connected = false;
    this.Promise = Nuxeo.Promise || Promise;
    this._activeRequests = 0;
  }

  /**
   * Connects to the Nuxeo Platform instance using the configured authentication.
   * @param {object} opts - Options overriding the ones from the Nuxeo object.
   * @returns {Promise} A promise resolved with the logged in user.
   */
  login(opts = {}) {
    let finalOptions = {
      method: 'POST',
      url: join(this._automationURL, 'login'),
      headers: this._headers,
      timeout: this._timeout,
      transactionTimeout: this._transactionTimeout,
      httpTimeout: this._httpTimeout,
    };
    finalOptions = extend(true, finalOptions, opts);
    return this.fetch(finalOptions)
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
   * Do a fetch request.
   *
   * To be used when doing any call on Nuxeo Platform.
   */
  fetch(opts = {}) {
    let options = {
      method: 'GET',
      headers: {},
      json: true,
      timeout: 30000,
      cache: false,
      resolveWithFullResponse: false,
      auth: this._auth,
    };
    options = extend(true, {}, options, opts);
    options = computeAuthentication(options);

    const transactionTimeout = options.transactionTimeout || options.timeout;
    const httpTimeout = options.httpTimeout || (5 + transactionTimeout);
    options.headers['Nuxeo-Transaction-Timeout'] = transactionTimeout;
    options.timeout = httpTimeout;
    delete options.transactionTimeout;
    delete options.httpTimeout;

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

    let url = options.url;
    if (options.queryParams) {
      url += url.indexOf('?') === -1 ? '?' : '';
      url += queryString.stringify(options.queryParams);
    }

    return new this.Promise((resolve, reject) => {
      this._activeRequests++;
      doFetch(url, {
        method: options.method,
        headers: options.headers,
        body: options.body,
        credentials: 'include',
      }).then((res) => {
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
          // TODO add marshallers
          return resolve(res.json());
        }
        return resolve(res);
      }).catch((error) => {
        this._activeRequests--;
        return reject(error);
      });
    });
  }

  /**
   * Creates a new {@link Operation} object.
   * @param {string} id - The operation ID.
   * @param {object} opts - Options overriding the ones from the Nuxeo object.
   * @returns {Operation}
   */
  operation(id, opts = {}) {
    let finalOptions = {
      id,
      nuxeo: this,
      url: this._automationURL,
      repositoryName: this._repositoryName,
      headers: this._headers,
      timeout: this._timeout,
      httpTimeout: this._httpTimeout,
      transactionTimeout: this._transactionTimeout,
    };
    finalOptions = extend(true, {}, finalOptions, opts);
    finalOptions.schemas = opts.schemas || this._schemas;
    return new Operation(finalOptions);
  }

  /**
   * Creates a new {@link Request} object.
   * @param {string} path - The request default path.
   * @param {object} opts - Options overriding the ones from the Nuxeo object.
   * @returns {Request}
   */
  request(path, opts = {}) {
    let finalOptions = {
      path,
      nuxeo: this,
      url: this._restURL,
      repositoryName: this._repositoryName,
      headers: this._headers,
      timeout: this._timeout,
      httpTimeout: this._httpTimeout,
      transactionTimeout: this._transactionTimeout,
    };
    finalOptions = extend(true, {}, finalOptions, opts);
    finalOptions.schemas = opts.schemas || this._schemas;
    return new Request(finalOptions);
  }

  /**
   * Creates a new {@link Repository} object.
   * @param {string} name - The repository name. Default to the Nuxeo's repository name.
   * @param {object} opts - Options overriding the ones from the Nuxeo object.
   * @returns {Repository}
   */
  repository(name = this._repositoryName, opts = {}) {
    let options = opts;
    let repositoryName = name;
    if (typeof name === 'object') {
      options = name;
      repositoryName = this._repositoryName;
    }

    let finalOptions = {
      repositoryName,
      nuxeo: this,
      headers: this._headers,
      timeout: this._timeout,
      httpTimeout: this._httpTimeout,
      transactionTimeout: this._transactionTimeout,
    };
    finalOptions = extend(true, {}, finalOptions, options);
    finalOptions.schemas = options.schemas || this._schemas;
    return new Repository(finalOptions);
  }

  /**
   * Creates a new {@link BatchUpload} object.
   * @param {object} opts - Options overriding the ones from the Nuxeo object.
   * @returns {BatchUpload}
   */
  batchUpload(opts = {}) {
    let finalOptions = {
      nuxeo: this,
      url: this._restURL,
      headers: this._headers,
      timeout: this._timeout,
      transactionTimeout: this._transactionTimeout,
      httpTimeout: this._httpTimeout,
    };
    finalOptions = extend(true, {}, finalOptions, opts);
    return new BatchUpload(finalOptions);
  }

  /**
   * Creates a new {@link Users} object to manage users.
   * @param {object} opts - Options overriding the ones from the Nuxeo object.
   * @returns {Users}
   */
  users(opts = {}) {
    let finalOptions = {
      nuxeo: this,
      headers: this._headers,
      timeout: this._timeout,
      transactionTimeout: this._transactionTimeout,
      httpTimeout: this._httpTimeout,
    };
    finalOptions = extend(true, {}, finalOptions, opts);
    return new Users(finalOptions);
  }

  /**
   * Creates a new {@link Groups} object to manage groups.
   * @param {object} opts - Options overriding the ones from the Nuxeo object.
   * @returns {Groups}
   */
  groups(opts = {}) {
    let finalOptions = {
      nuxeo: this,
      headers: this._headers,
      timeout: this._timeout,
      transactionTimeout: this._transactionTimeout,
      httpTimeout: this._httpTimeout,
    };
    finalOptions = extend(true, {}, finalOptions, opts);
    return new Groups(finalOptions);
  }

  /**
   * Creates a new {@link Directory} object.
   * @param {string} name - The directory name.
   * @param {object} opts - Options overriding the ones from the Nuxeo object.
   * @returns {Directory}
   */
  directory(name, opts = {}) {
    let finalOptions = {
      directoryName: name,
      nuxeo: this,
      headers: this._headers,
      timeout: this._timeout,
      transactionTimeout: this._transactionTimeout,
      httpTimeout: this._httpTimeout,
    };
    finalOptions = extend(true, {}, finalOptions, opts);
    return new Directory(finalOptions);
  }

  /**
   * Creates a new {@link Workflows} object.
   * @param {string} name - The repository name. Default to the Nuxeo's repository name.
   * @param {object} opts - Options overriding the ones from the Nuxeo object.
   * @returns {Workflows}
   */
  workflows(repositoryName = this._repositoryName, opts = {}) {
    let finalOptions = {
      repositoryName,
      nuxeo: this,
      headers: this._headers,
      timeout: this._timeout,
      httpTimeout: this._httpTimeout,
      transactionTimeout: this._transactionTimeout,
    };
    finalOptions = extend(true, {}, finalOptions, opts);
    return new Workflows(finalOptions);
  }
}

/**
 * Sets the Promise library class to use.
 */
Nuxeo.promiseLibrary = (promiseLibrary) => {
  Nuxeo.Promise = promiseLibrary;
};

export default Nuxeo;
