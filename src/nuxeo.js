'use strict';

import extend from 'extend';
import Base from './base';
import Operation from './operation';
import Request from './request';
import Repository from './repository';
import BatchUpload from './upload/batch';
import join from './deps/utils/join';
import fetch from './deps/fetch';

const API_PATH_V1 = 'api/v1/';
const AUTOMATION = 'automation/';

const DEFAULT_OPTS = {
  baseURL: 'http://localhost:8080/nuxeo/',
  apiPath: API_PATH_V1,
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
      auth: this._auth,
    };
    finalOptions = extend(true, finalOptions, opts);
    return fetch(finalOptions)
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
      auth: this._auth,
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
      auth: this._auth,
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
      auth: this._auth,
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
      auth: this._auth,
    };
    finalOptions = extend(true, {}, finalOptions, opts);
    return new BatchUpload(finalOptions);
  }
}

export default Nuxeo;
