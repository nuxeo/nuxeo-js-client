'use strict';

import Base from './base';
import join from './deps/utils/join';
import Document from './document';
import Promise from './deps/promise';

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
 *  baseUrl: 'http://localhost:8080/nuxeo',
 *  auth: {
 *    username: 'Administrator',
 *    password: 'Administrator',
 *  }
 * });
 * nuxeo.repository('default')
 *   .fetch('/default-domain').then((res) => {
 *     // res.uid !== null
 *     // res.type === 'Domain'
 *   }).catch(error => throw new Error(error));
 */
class Repository extends Base {
  /**
   * Creates a Repository.
   * @param {object} opts - The configuration options.
   */
  constructor(opts = {}) {
    super(opts);
    this._nuxeo = opts.nuxeo;
  }

  /**
   * Fetches a document given a document ref.
   * @param {string} ref - The document ref. A path if starting with '/', otherwise and id.
   * @param {object} opts - Options overriding the ones from the Request object.
   * @returns {Promise} A Promise object resolved with the {@link Document}.
   */
  fetch(ref, opts) {
    return new Promise((resolve, reject) => {
      const path = computePath(ref);

      this._nuxeo.request(path)
        .repositoryName(this._repositoryName)
        .schemas(this._schemas)
        .headers(this._headers)
        .timeout(this._timeout)
        .httpTimeout(this._httpTimeout)
        .transactionTimeout(this._transactionTimeout)
        .get(opts)
        .then((doc) => {
          return resolve(new Document(doc, {
            nuxeo: this._nuxeo,
            repository: this,
            schemas: this._schemas,
            headers: this._headers,
            timeout: this._timeout,
            httpTimeout: this._httpTimeout,
            transactionTimeout: this._transactionTimeout,
          }));
        }).catch(error => reject(error));
    });
  }

  /**
   * Creates a document given a document ref.
   * @param {string} parentRef - The parent document ref. A path if starting with '/', otherwise and id.
   * @param {object} doc - The document to be created.
   * @param {object} opts - Options overriding the ones from the Request object.
   * @returns {Promise} A Promise object resolved with the created {@link Document}.
   */
  create(parentRef, doc, opts = {}) {
    return new Promise((resolve, reject) => {
      opts.body = doc;

      const path = computePath(parentRef);

      this._nuxeo.request(path)
        .repositoryName(this._repositoryName)
        .schemas(this._schemas)
        .headers(this._headers)
        .timeout(this._timeout)
        .httpTimeout(this._httpTimeout)
        .transactionTimeout(this._transactionTimeout)
        .post(opts)
        .then((res) => {
          return resolve(new Document(res, {
            nuxeo: this._nuxeo,
            repository: this,
            schemas: this._schemas,
            headers: this._headers,
            timeout: this._timeout,
            httpTimeout: this._httpTimeout,
            transactionTimeout: this._transactionTimeout,
          }));
        }).catch(error => reject(error));
    });
  }

  /**
   * Updates a document. Assumes that the doc object has an uid field.
   * @param {object} doc - The document to be updated.
   * @param {object} opts - Options overriding the ones from the Request object.
   * @returns {Promise} A Promise object resolved with the updated {@link Document}.
   */
  update(doc, opts = {}) {
    return new Promise((resolve, reject) => {
      opts.body = doc;

      const path = join('id', doc.uid);

      this._nuxeo.request(path)
        .repositoryName(this._repositoryName)
        .schemas(this._schemas)
        .headers(this._headers)
        .timeout(this._timeout)
        .httpTimeout(this._httpTimeout)
        .transactionTimeout(this._transactionTimeout)
        .put(opts)
        .then((res) => {
          return resolve(new Document(res, {
            nuxeo: this._nuxeo,
            repository: this,
            schemas: this._schemas,
            headers: this._headers,
            timeout: this._timeout,
            httpTimeout: this._httpTimeout,
            transactionTimeout: this._transactionTimeout,
          }));
        }).catch(error => reject(error));
    });
  }

  /**
   * Deletes a document given a document ref.
   * @param {string} ref - The document ref. A path if starting with '/', otherwise and id.
   * @param {object} opts - Options overriding the ones from the Request object.
   * @returns {Promise} A Promise object resolved with the result of the DELETE request.
   */
  delete(ref, opts) {
    const path = computePath(ref);

    return this._nuxeo.request(path)
      .repositoryName(this._repositoryName)
      .schemas(this._schemas)
      .headers(this._headers)
      .timeout(this._timeout)
      .httpTimeout(this._httpTimeout)
      .transactionTimeout(this._transactionTimeout)
      .delete(opts);
  }
}

export default Repository;
