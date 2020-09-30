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

var extend = require('extend');

var join = require('./deps/utils/join');

var encodePath = require('./deps/utils/encodePath');

var Base = require('./base');

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
 *  baseURL: 'http://localhost:8080/nuxeo',
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

var Request =
/*#__PURE__*/
function (_Base) {
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
    var _this;

    var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    _classCallCheck(this, Request);

    var options = extend(true, {}, defaultOptions, opts);
    _this = _possibleConstructorReturn(this, _getPrototypeOf(Request).call(this, options));
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
    key: "path",
    value: function path(_path) {
      this._path = join(this._path, _path);
      return this;
    }
    /**
     * Adds query params. The given query params are merged with the existing ones if any.
     * @param {object} queryParams - The query params to be merged with the existing ones.
     * @returns {Request} The request itself.
     */

  }, {
    key: "queryParams",
    value: function queryParams(_queryParams) {
      this._queryParams = extend(true, {}, this._queryParams, _queryParams);
      return this;
    }
    /**
     * Performs a GET request.
     * @param {object} opts - Options overriding the ones from the Request object.
     * @returns {Promise} A Promise object resolved with the result of the request.
     */

  }, {
    key: "get",
    value: function get() {
      var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      opts.method = 'GET';
      return this.execute(opts);
    }
    /**
     * Performs a POST request.
     * @param {object} [opts] - Options overriding the ones from this object.
     * @returns {Promise} A Promise object resolved with the result of the request.
     */

  }, {
    key: "post",
    value: function post() {
      var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      opts.method = 'POST';
      return this.execute(opts);
    }
    /**
     * Performs a PUT request.
     * @param {object} [opts] - Options overriding the ones from this object.
     * @returns {Promise} A Promise object resolved with the result of the request.
     */

  }, {
    key: "put",
    value: function put() {
      var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      opts.method = 'PUT';
      return this.execute(opts);
    }
    /**
     * Performs a DELETE request.
     * @param {object} [opts] - Options overriding the ones from this object.
     * @returns {Promise} A Promise object resolved with the result of the request.
     */

  }, {
    key: "delete",
    value: function _delete() {
      var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
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
    key: "execute",
    value: function execute() {
      var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

      var options = this._computeOptions(opts);

      var url = join(this._url, encodePath(this._path));
      var finalOptions = {
        url: url,
        queryParams: this._queryParams
      };
      finalOptions = extend(true, finalOptions, options);
      return this._nuxeo.http(finalOptions);
    }
  }]);

  return Request;
}(Base);

module.exports = Request;