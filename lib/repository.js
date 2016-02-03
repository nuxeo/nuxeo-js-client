'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _base = require('./base');

var _base2 = _interopRequireDefault(_base);

var _join = require('./deps/utils/join');

var _join2 = _interopRequireDefault(_join);

var _document = require('./document');

var _document2 = _interopRequireDefault(_document);

var _promise = require('./deps/promise');

var _promise2 = _interopRequireDefault(_promise);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function computePath(ref) {
  return (0, _join2.default)(ref.indexOf('/') === 0 ? 'path' : 'id', ref);
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

var Repository = function (_Base) {
  _inherits(Repository, _Base);

  /**
   * Creates a Repository.
   * @param {object} opts - The configuration options.
   */

  function Repository() {
    var opts = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    _classCallCheck(this, Repository);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(Repository).call(this, opts));

    _this._nuxeo = opts.nuxeo;
    return _this;
  }

  /**
   * Fetches a document given a document ref.
   * @param {string} ref - The document ref. A path if starting with '/', otherwise and id.
   * @param {object} opts - Options overriding the ones from the Request object.
   * @returns {Promise} A Promise object resolved with the {@link Document}.
   */

  _createClass(Repository, [{
    key: 'fetch',
    value: function fetch(ref, opts) {
      var _this2 = this;

      return new _promise2.default(function (resolve, reject) {
        var path = computePath(ref);

        _this2._nuxeo.request(path).repositoryName(_this2._repositoryName).schemas(_this2._schemas).headers(_this2._headers).timeout(_this2._timeout).httpTimeout(_this2._httpTimeout).transactionTimeout(_this2._transactionTimeout).auth(_this2._auth).get(opts).then(function (doc) {
          return resolve(new _document2.default(doc, {
            nuxeo: _this2._nuxeo,
            repository: _this2,
            schemas: _this2._schemas,
            headers: _this2._headers,
            timeout: _this2._timeout,
            httpTimeout: _this2._httpTimeout,
            transactionTimeout: _this2._transactionTimeout,
            auth: _this2._auth
          }));
        }).catch(function (error) {
          return reject(error);
        });
      });
    }

    /**
     * Creates a document given a document ref.
     * @param {string} parentRef - The parent document ref. A path if starting with '/', otherwise and id.
     * @param {object} doc - The document to be created.
     * @param {object} opts - Options overriding the ones from the Request object.
     * @returns {Promise} A Promise object resolved with the created {@link Document}.
     */

  }, {
    key: 'create',
    value: function create(parentRef, doc) {
      var _this3 = this;

      var opts = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

      return new _promise2.default(function (resolve, reject) {
        opts.body = doc;

        var path = computePath(parentRef);

        _this3._nuxeo.request(path).repositoryName(_this3._repositoryName).schemas(_this3._schemas).headers(_this3._headers).timeout(_this3._timeout).httpTimeout(_this3._httpTimeout).transactionTimeout(_this3._transactionTimeout).auth(_this3._auth).post(opts).then(function (res) {
          return resolve(new _document2.default(res, {
            nuxeo: _this3._nuxeo,
            repository: _this3,
            schemas: _this3._schemas,
            headers: _this3._headers,
            timeout: _this3._timeout,
            httpTimeout: _this3._httpTimeout,
            transactionTimeout: _this3._transactionTimeout,
            auth: _this3._auth
          }));
        }).catch(function (error) {
          return reject(error);
        });
      });
    }

    /**
     * Updates a document. Assumes that the doc object has an uid field.
     * @param {object} doc - The document to be updated.
     * @param {object} opts - Options overriding the ones from the Request object.
     * @returns {Promise} A Promise object resolved with the updated {@link Document}.
     */

  }, {
    key: 'update',
    value: function update(doc) {
      var _this4 = this;

      var opts = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      return new _promise2.default(function (resolve, reject) {
        opts.body = doc;

        var path = (0, _join2.default)('id', doc.uid);

        _this4._nuxeo.request(path).repositoryName(_this4._repositoryName).schemas(_this4._schemas).headers(_this4._headers).timeout(_this4._timeout).httpTimeout(_this4._httpTimeout).transactionTimeout(_this4._transactionTimeout).auth(_this4._auth).put(opts).then(function (res) {
          return resolve(new _document2.default(res, {
            nuxeo: _this4._nuxeo,
            repository: _this4,
            schemas: _this4._schemas,
            headers: _this4._headers,
            timeout: _this4._timeout,
            httpTimeout: _this4._httpTimeout,
            transactionTimeout: _this4._transactionTimeout,
            auth: _this4._auth
          }));
        }).catch(function (error) {
          return reject(error);
        });
      });
    }

    /**
     * Deletes a document given a document ref.
     * @param {string} ref - The document ref. A path if starting with '/', otherwise and id.
     * @param {object} opts - Options overriding the ones from the Request object.
     * @returns {Promise} A Promise object resolved with the result of the DELETE request.
     */

  }, {
    key: 'delete',
    value: function _delete(ref, opts) {
      var path = computePath(ref);

      return this._nuxeo.request(path).repositoryName(this._repositoryName).schemas(this._schemas).headers(this._headers).timeout(this._timeout).httpTimeout(this._httpTimeout).transactionTimeout(this._transactionTimeout).auth(this._auth).delete(opts);
    }
  }]);

  return Repository;
}(_base2.default);

exports.default = Repository;
module.exports = exports['default'];