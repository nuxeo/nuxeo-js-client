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
    return this._nuxeo.request(path)
      .get(options);
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
    return this._nuxeo.request(path)
      .get(options);
  }

  /**
   * Creates an entry.
   * @param {object} entry - The entry to be created.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A Promise object resolved with the created {@link DirectoryEntry}.
   */
  create(entry, opts = {}) {
    opts.body = {
      'entity-type': 'directoryEntry',
      directoryName: this._directoryName,
      properties: entry.properties,
    };
    const options = this._computeOptions(opts);
    const path = this._path;
    options.directory = this;
    return this._nuxeo.request(path)
      .post(options);
  }

  /**
   * Updates an entry. Assumes that the entry object has an `id` property.
   * @param {object} entry - The entry to be updated.
   * @param {object} entry.id - The string id of the entry to be updated.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A Promise object resolved with the updated {@link DirectoryEntry}.
   */
  update(entry, opts = {}) {
    // compatibility code for 7.10 where the `id` field is not set by the server
    // works only if the `idFiel` of the directory is `id`
    const id = entry.id || entry.properties.id;
    opts.body = {
      id,
      'entity-type': 'directoryEntry',
      directoryName: this._directoryName,
      properties: entry.properties,
    };
    const options = this._computeOptions(opts);
    const path = join(this._path, id);
    options.directory = this;
    return this._nuxeo.request(path)
      .put(options);
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
    return this._nuxeo.request(path)
      .delete(options);
  }
}

module.exports = Directory;
