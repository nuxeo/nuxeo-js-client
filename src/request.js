'use strict';

import extend from 'extend';
import join from './deps/utils/join';
import Base from './base';

const defaultOptions = {
  path: '',
  queryParams: {},
};

/**
 * The `Request` class allows to execute REST request on a Nuxeo Platform instance.
 *
 * **Cannot directly be instantiated**
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
 * nuxeo.request('/path/default-domain')
 *   .get().then((res) => {
 *     // res.uid !== null
 *     // res.type === 'Domain'
 *   }).catch(error => throw new Error(error));
 */
class Request extends Base {
  /**
   * Creates a Request.
   * @param {object} opts - The configuration options.
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
   * @param {object} opts - Options overriding the ones from the Request object.
   * @returns {Promise} A Promise object resolved with the result of the request.
   */
  post(opts = {}) {
    opts.method = 'POST';
    return this.execute(opts);
  }

  /**
   * Performs a PUT request.
   * @param {object} opts - Options overriding the ones from the Request object.
   * @returns {Promise} A Promise object resolved with the result of the request.
   */
  put(opts = {}) {
    opts.method = 'PUT';
    return this.execute(opts);
  }

  /**
   * Performs a DELETE request.
   * @param {object} opts - Options overriding the ones from the Request object.
   * @returns {Promise} A Promise object resolved with the result of the request.
   */
  delete(opts = {}) {
    opts.method = 'DELETE';
    return this.execute(opts);
  }

  /**
   * Performs a Request.
   * @param {object} opts - Options overriding the ones from the Request object.
   * @param {string} opts.method - The HTTP method.
   * @returns {Promise} A Promise object resolved with the result of the request.
   */
  execute(opts = {}) {
    const schemas = opts.schemas || this._schemas;

    let headers = extend(true, {}, this._headers);
    if (schemas.length > 0) {
      headers['X-NXDocumentProperties'] = schemas.join(',');
    }
    headers = extend(true, headers, opts.headers);

    let url = this._url;
    const repositoryName = opts.repositoryName || this._repositoryName;
    if (repositoryName !== undefined) {
      url = join(url, 'repo', this._repositoryName);
    }
    url = join(url, this._path);

    let finalOptions = {
      url,
      headers,
      queryParams: this._queryParams,
      timeout: this._timeout,
      transactionTimeout: this._transactionTimeout,
      httpTimeout: this._httpTimeout,
      auth: this._auth,
    };
    finalOptions = extend(true, finalOptions, opts);
    return this._nuxeo.fetch(finalOptions);
  }

}

export default Request;
