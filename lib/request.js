'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _extend = require('extend');

var _extend2 = _interopRequireDefault(_extend);

var _join = require('./deps/utils/join');

var _join2 = _interopRequireDefault(_join);

var _base = require('./base');

var _base2 = _interopRequireDefault(_base);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var defaultOptions = {
  path: '',
  queryParams: {}
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
 *    method: 'basic',
 *    username: 'Administrator',
 *    password: 'Administrator'
 *  }
 * });
 * nuxeo.request('/path/default-domain')
 *   .get()
 *   .then(function(res) {
 *     // res.uid !== null
 *     // res.type === 'Domain'
 *   })
 *   .catch(function(error) {
 *     throw new Error(error);
 *   });
 */

var Request = function (_Base) {
  _inherits(Request, _Base);

  /**
   * Creates a Request.
   * @param {object} opts - The configuration options.
   * @param {string} opts.nuxeo - The {@link Nuxeo} object linked to this groups object.
   * @param {string} opts.path - The initial path of the request.
   * @param {string} opts.queryParams - The initial query parameters of the request.
   * @param {string} opts.url - The REST API URL.
   */
  function Request() {
    var opts = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    _classCallCheck(this, Request);

    var options = (0, _extend2.default)(true, {}, defaultOptions, opts);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(Request).call(this, options));

    _this._nuxeo = options.nuxeo;
    _this._path = options.path;
    _this._queryParams = options.queryParams;
    _this._url = options.url;
    return _this;
  }

  /**
   * Adds path segment.
   * @param {string} path - The path segment.
   * @returns {Request} The request itself.
   */


  _createClass(Request, [{
    key: 'path',
    value: function path(_path) {
      this._path = (0, _join2.default)(this._path, _path);
      return this;
    }

    /**
     * Adds query params. The given query params are merged with the existing ones if any.
     * @param {object} queryParams - The query params to be merged with the existing ones.
     * @returns {Request} The request itself.
     */

  }, {
    key: 'queryParams',
    value: function queryParams(_queryParams) {
      this._queryParams = (0, _extend2.default)(true, {}, this._queryParams, _queryParams);
      return this;
    }

    /**
     * Performs a GET request.
     * @param {object} opts - Options overriding the ones from the Request object.
     * @returns {Promise} A Promise object resolved with the result of the request.
     */

  }, {
    key: 'get',
    value: function get() {
      var opts = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      opts.method = 'GET';
      return this.execute(opts);
    }

    /**
     * Performs a POST request.
     * @param {object} [opts] - Options overriding the ones from this object.
     * @returns {Promise} A Promise object resolved with the result of the request.
     */

  }, {
    key: 'post',
    value: function post() {
      var opts = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      opts.method = 'POST';
      return this.execute(opts);
    }

    /**
     * Performs a PUT request.
     * @param {object} [opts] - Options overriding the ones from this object.
     * @returns {Promise} A Promise object resolved with the result of the request.
     */

  }, {
    key: 'put',
    value: function put() {
      var opts = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      opts.method = 'PUT';
      return this.execute(opts);
    }

    /**
     * Performs a DELETE request.
     * @param {object} [opts] - Options overriding the ones from this object.
     * @returns {Promise} A Promise object resolved with the result of the request.
     */

  }, {
    key: 'delete',
    value: function _delete() {
      var opts = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      opts.method = 'DELETE';
      return this.execute(opts);
    }

    /**
     * Performs a Request.
     * @param {object} opts - Options overriding the ones from this object.
     * @param {string} opts.method - The HTTP method.
     * @returns {Promise} A Promise object resolved with the result of the request.
     */

  }, {
    key: 'execute',
    value: function execute() {
      var opts = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      var options = this._computeOptions(opts);
      var url = this._url;
      var repositoryName = options.repositoryName;
      if (repositoryName !== undefined) {
        url = (0, _join2.default)(url, 'repo', repositoryName);
      }
      url = (0, _join2.default)(url, this._path);

      var finalOptions = {
        url: url,
        queryParams: this._queryParams
      };
      finalOptions = (0, _extend2.default)(true, finalOptions, options);
      return this._nuxeo._http(finalOptions);
    }
  }]);

  return Request;
}(_base2.default);

exports.default = Request;
module.exports = exports['default'];