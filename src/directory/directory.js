'use strict';

import Base from '../base';
import join from '../deps/utils/join';
import DirectoryEntry from './entry';

/**
 * The `Directory` class allows to work with directories on a Nuxeo Platform instance.
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
 * nuxeo.directory('nature')
 *   .fetch('article').then((res) => {
 *     // res.properties.id === 'article'
 *     // res.properties.label === 'article	label.directories.nature.article'
 *   }).catch(error => throw new Error(error));
 */
class Directory extends Base {
  /**
   * Creates a Directory.
   * @param {object} opts - The configuration options.
   * @param {string} opts.directoryName - The name of this directory.
   */
  constructor(opts = {}) {
    super(opts);
    this._nuxeo = opts.nuxeo;
    this._directoryName = opts.directoryName;
    this._path = join('directory', this._directoryName);
  }

  /**
   * Fetches all directory entries.
   * @param {object} opts - Options overriding the ones from the Request object.
   * @returns {Promise} A Promise object resolved with the entries.
   */
  fetchAll(opts) {
    const path = this._path;
    return this._nuxeo.request(path)
      .httpTimeout(this._httpTimeout)
      .transactionTimeout(this._transactionTimeout)
      .get(opts)
      .then((res) => {
        const entries = res.entries.map((entry) => {
          return new DirectoryEntry(entry, {
            nuxeo: this._nuxeo,
            directory: this,
          });
        });
        return entries;
      });
  }

  /**
   * Fetches a directory entry given its id.
   * @param {string} id - The entry id.
   * @param {object} opts - Options overriding the ones from the Request object.
   * @returns {Promise} A Promise object resolved with the {@link DirectoryEntry}.
   */
  fetch(id, opts) {
    const path = join(this._path, id);
    return this._nuxeo.request(path)
      .headers(this._headers)
      .timeout(this._timeout)
      .httpTimeout(this._httpTimeout)
      .transactionTimeout(this._transactionTimeout)
      .get(opts)
      .then((res) => {
        return new DirectoryEntry(res, {
          nuxeo: this._nuxeo,
          directory: this,
        });
      });
  }

  /**
   * Creates an entry.
   * @param {object} entry - The entry to be created.
   * @param {object} opts - Options overriding the ones from the Request object.
   * @returns {Promise} A Promise object resolved with the created {@link DirectoryEntry}.
   */
  create(entry, opts = {}) {
    opts.body = {
      'entity-type': 'directoryEntry',
      directoryName: this._directoryName,
      properties: entry.properties,
    };
    const path = this._path;
    return this._nuxeo.request(path)
      .headers(this._headers)
      .timeout(this._timeout)
      .httpTimeout(this._httpTimeout)
      .transactionTimeout(this._transactionTimeout)
      .post(opts)
      .then((res) => {
        return new DirectoryEntry(res, {
          nuxeo: this._nuxeo,
          directory: this,
        });
      });
  }

  /**
   * Updates an entry. Assumes that the entry object has an `id` property.
   * @param {object} entry - The entry to be updated.
   * @param {object} opts - Options overriding the ones from the Request object.
   * @returns {Promise} A Promise object resolved with the updated {@link DirectoryEntry}.
   */
  update(entry, opts = {}) {
    opts.body = {
      'entity-type': 'directoryEntry',
      directoryName: this._directoryName,
      properties: entry.properties,
    };
    const path = join(this._path, entry.properties.id);
    return this._nuxeo.request(path)
      .headers(this._headers)
      .timeout(this._timeout)
      .httpTimeout(this._httpTimeout)
      .transactionTimeout(this._transactionTimeout)
      .put(opts)
      .then((res) => {
        return new DirectoryEntry(res, {
          nuxeo: this._nuxeo,
          directory: this,
        });
      });
  }

  /**
   * Deletes an entry given its id.
   * @param {string} id - The entry id.
   * @param {object} opts - Options overriding the ones from the Request object.
   * @returns {Promise} A Promise object resolved with the result of the DELETE request.
   */
  delete(id, opts) {
    const path = join(this._path, id);
    return this._nuxeo.request(path)
      .headers(this._headers)
      .timeout(this._timeout)
      .httpTimeout(this._httpTimeout)
      .transactionTimeout(this._transactionTimeout)
      .delete(opts);
  }
}

export default Directory;
