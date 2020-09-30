"use strict";

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

var Base = require('./base');

var join = require('./deps/utils/join');

function computePath(ref, options) {
  var path = join(ref.indexOf('/') === 0 ? 'path' : 'id', ref);
  var repositoryName = options.repositoryName;

  if (repositoryName !== undefined) {
    path = join('repo', repositoryName, path);
  }

  return path;
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


var Repository =
/*#__PURE__*/
function (_Base) {
  _inherits(Repository, _Base);

  /**
   * Creates a Repository.
   * @param {object} opts - The configuration options.
   * @param {string} opts.nuxeo - The {@link Nuxeo} object linked to this repository.
   */
  function Repository() {
    var _this;

    var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    _classCallCheck(this, Repository);

    _this = _possibleConstructorReturn(this, _getPrototypeOf(Repository).call(this, opts));
    _this._nuxeo = opts.nuxeo;
    return _this;
  }
  /**
   * Fetches a document given a document ref.
   * @param {string} ref - The document ref. A path if starting with '/', otherwise and id.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A Promise object resolved with the {@link Document}.
   */


  _createClass(Repository, [{
    key: "fetch",
    value: function fetch(ref) {
      var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      var options = this._computeOptions(opts);

      var path = computePath(ref, options);
      options.repository = this;
      return this._nuxeo.request(path).get(options);
    }
    /**
     * Creates a document.
     * @param {string} parentRef - The parent document ref. A path if starting with '/', otherwise and id.
     * @param {object} doc - The document to be created.
     * @param {object} [opts] - Options overriding the ones from this object.
     * @returns {Promise} A Promise object resolved with the created {@link Document}.
     */

  }, {
    key: "create",
    value: function create(parentRef, doc) {
      var opts = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
      opts.body = {
        'entity-type': 'document',
        type: doc.type,
        name: doc.name,
        properties: doc.properties
      };

      var options = this._computeOptions(opts);

      var path = computePath(parentRef, options);
      options.repository = this;
      return this._nuxeo.request(path).post(options);
    }
    /**
     * Updates a document. Assumes that the doc object has an uid field.
     * @param {object} doc - The document to be updated.
     * @param {object} [opts] - Options overriding the ones from this object.
     * @returns {Promise} A Promise object resolved with the updated {@link Document}.
     */

  }, {
    key: "update",
    value: function update(doc) {
      var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      opts.body = {
        'entity-type': 'document',
        uid: doc.uid,
        properties: doc.properties
      };

      var options = this._computeOptions(opts);

      var path = computePath(doc.uid, options);
      options.repository = this;
      return this._nuxeo.request(path).put(options);
    }
    /**
     * Deletes a document given a document ref.
     * @param {string} ref - The document ref. A path if starting with '/', otherwise and id.
     * @param {object} [opts] - Options overriding the ones from this object.
     * @returns {Promise} A Promise object resolved with the result of the DELETE request.
     */

  }, {
    key: "delete",
    value: function _delete(ref) {
      var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      var options = this._computeOptions(opts);

      var path = computePath(ref, options);
      return this._nuxeo.request(path).delete(options);
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

  }, {
    key: "query",
    value: function query(queryOpts) {
      var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      var options = this._computeOptions(opts);

      var path = this._computeQueryPath(queryOpts);

      options.repository = this;
      return this._nuxeo.request(path).queryParams(queryOpts).get(options);
    }
  }, {
    key: "_computeQueryPath",
    value: function _computeQueryPath(queryOpts) {
      return join('search', queryOpts.query ? 'lang/NXQL' : "pp/".concat(queryOpts.pageProvider), 'execute');
    }
  }]);

  return Repository;
}(Base);

module.exports = Repository;