'use strict';

import extend from 'extend';

const DEFAULT_OPTS = {
  repositoryName: 'default',
  schemas: [],
  enrichers: {},
  fetchProperties: {},
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
    this._baseOptions = {};
    this._baseOptions.repositoryName = options.repositoryName;
    this._baseOptions.schemas = options.schemas;
    this._baseOptions.enrichers = options.enrichers;
    this._baseOptions.fetchProperties = options.fetchProperties;
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
   * @example
   * { document: ['acls', 'permissions'] }
   * @param {object} enrichers - The new enrichers.
   * @returns {Base} The object itself.
   */
  enrichers(enrichers) {
    this._baseOptions.enrichers = {};
    for (const key of Object.keys(enrichers)) {
      this._baseOptions.enrichers[key] = enrichers[key];
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
   * @example
   * { document: ['dc:creator'] }
   * @param {object} fetchProperties - The new properties to fetch.
   * @returns {Base} The object itself.
   */
   fetchProperties(fetchProperties) {
     this._baseOptions.fetchProperties = {};
     for (const key of Object.keys(fetchProperties)) {
       this._baseOptions.fetchProperties[key] = fetchProperties[key];
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
    for (const key of Object.keys(headers)) {
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
   */
  timeout(timeout) {
    this._baseOptions.timeout = timeout;
    return this;
  }

  /**
   * Sets the transaction timeout.
   * @returns {Base} The object itself.
   */
  transactionTimeout(transactionTimeout) {
    this._baseOptions.transactionTimeout = transactionTimeout;
    return this;
  }

  /**
   * Sets the HTTP timeout.
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
      for (const key of Object.keys(opts.enrichers)) {
        options.enrichers[key] = opts.enrichers[key];
      }
    }
    if (opts.fetchProperties) {
      options.fetchProperties = {};
      for (const key of Object.keys(opts.fetchProperties)) {
        options.fetchProperties[key] = opts.fetchProperties[key];
      }
    }
    if (opts.headers) {
      options.headers = {};
      for (const key of Object.keys(opts.headers)) {
        options.headers[key] = opts.headers[key];
      }
    }
    return options;
  }
}

export default Base;
