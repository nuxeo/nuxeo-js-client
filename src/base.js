'use strict';

import extend from 'extend';

const DEFAULT_OPTS = {
  repositoryName: 'default',
  schemas: [],
  headers: {},
  timeout: 30000,
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
    this._repositoryName = options.repositoryName;
    this._schemas = options.schemas;
    this._auth = options.auth;
    this._headers = options.headers;
    this._timeout = options.timeout;
    this._transactionTimeout = options.transationTimeout;
    this._httpTimeout = options.httpTimeout;
  }

  /**
   * Sets the repository name.
   * @returns {Base} The object itself.
   */
  repositoryName(repositoryName) {
    this._repositoryName = repositoryName;
    return this;
  }

  /**
   * Sets the schemas.
   * @returns {Base} The object itself.
   */
  schemas(schemas) {
    this._schemas = [...schemas];
    return this;
  }

  /**
   * Adds a header.
   * @param {string} name - the header name
   * @param {string} value - the header value
   * @returns {Base} The object itself..
   */
  header(name, value) {
    this._headers[name] = value;
    return this;
  }

  /**
   * Adds headers. The given headers are merged with the existing ones if any.
   * @param {object} headers - the headers to be merged with the existing ones.
   * @returns {Base} The object itself.
   */
  headers(headers) {
    this._headers = extend(true, {}, this._headers, headers);
    return this;
  }

  /**
   * Sets a global timeout, used as HTTP timeout and transaction timeout
   * by default.
   * @returns {Base} The object itself.
   */
  timeout(timeout) {
    this._timeout = timeout;
    return this;
  }

  /**
   * Sets a transaction timeout.
   * @returns {Base} The object itself.
   */
  transactionTimeout(transactionTimeout) {
    this._transactionTimeout = transactionTimeout;
    return this;
  }

  /**
   * Sets a HTTP timeout.
   * @returns {Base} The object itself.
   */
  httpTimeout(httpTimeout) {
    this._httpTimeout = httpTimeout;
    return this;
  }
}

export default Base;
