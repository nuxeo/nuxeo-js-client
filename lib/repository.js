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
    return this._nuxeo.request(path)
      .get(options);
  }

  /**
   * Creates a document.
   * @param {string} parentRef - The parent document ref. A path if starting with '/', otherwise and id.
   * @param {object} doc - The document to be created.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A Promise object resolved with the created {@link Document}.
   */
  create(parentRef, doc, opts = {}) {
    opts.body = {
      'entity-type': 'document',
      type: doc.type,
      name: doc.name,
      properties: doc.properties,
    };
    const options = this._computeOptions(opts);
    const path = computePath(parentRef);
    options.repository = this;
    return this._nuxeo.request(path)
      .post(options);
  }

  /**
   * Updates a document. Assumes that the doc object has an uid field.
   * @param {object} doc - The document to be updated.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A Promise object resolved with the updated {@link Document}.
   */
  update(doc, opts = {}) {
    opts.body = {
      'entity-type': 'document',
      uid: doc.uid,
      properties: doc.properties,
    };
    const options = this._computeOptions(opts);
    const path = join('id', doc.uid);
    options.repository = this;
    return this._nuxeo.request(path)
      .put(options);
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
    return this._nuxeo.request(path)
      .delete(options);
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
    return this._nuxeo.request(path)
      .queryParams(queryOpts)
      .get(options);
  }

  _computeQueryPath(queryOpts) {
    const { serverVersion } = this._nuxeo;
    const isSearchEndPoint = serverVersion && serverVersion.gte(LTS_2016);
    const path = isSearchEndPoint
      ? join('search', queryOpts.query ? 'lang/NXQL' : `pp/${queryOpts.pageProvider}`, 'execute')
      : join('query', queryOpts.query ? 'NXQL' : queryOpts.pageProvider);
    return path;
  }
}

module.exports = Repository;
