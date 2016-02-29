'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _extend = require('extend');

var _extend2 = _interopRequireDefault(_extend);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var DEFAULT_OPTS = {
  repositoryName: 'default',
  schemas: [],
  headers: {},
  timeout: 30000
};

/**
 * This provides methods to store and use global settings when interacting with Nuxeo Platform.
 *
 * It's not meant to be used directly.
 *
 * @mixin
 */

var Base = function () {
  function Base() {
    var opts = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    _classCallCheck(this, Base);

    var options = (0, _extend2.default)(true, {}, DEFAULT_OPTS, opts);
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


  _createClass(Base, [{
    key: 'repositoryName',
    value: function repositoryName(_repositoryName) {
      this._repositoryName = _repositoryName;
      return this;
    }

    /**
     * Sets the schemas.
     * @returns {Base} The object itself.
     */

  }, {
    key: 'schemas',
    value: function schemas(_schemas) {
      this._schemas = [].concat(_toConsumableArray(_schemas));
      return this;
    }

    /**
     * Adds a header.
     * @param {string} name - the header name
     * @param {string} value - the header value
     * @returns {Base} The object itself..
     */

  }, {
    key: 'header',
    value: function header(name, value) {
      this._headers[name] = value;
      return this;
    }

    /**
     * Adds headers. The given headers are merged with the existing ones if any.
     * @param {object} headers - the headers to be merged with the existing ones.
     * @returns {Base} The object itself.
     */

  }, {
    key: 'headers',
    value: function headers(_headers) {
      this._headers = (0, _extend2.default)(true, {}, this._headers, _headers);
      return this;
    }

    /**
     * Sets a global timeout, used as HTTP timeout and transaction timeout
     * by default.
     * @returns {Base} The object itself.
     */

  }, {
    key: 'timeout',
    value: function timeout(_timeout) {
      this._timeout = _timeout;
      return this;
    }

    /**
     * Sets a transaction timeout.
     * @returns {Base} The object itself.
     */

  }, {
    key: 'transactionTimeout',
    value: function transactionTimeout(_transactionTimeout) {
      this._transactionTimeout = _transactionTimeout;
      return this;
    }

    /**
     * Sets a HTTP timeout.
     * @returns {Base} The object itself.
     */

  }, {
    key: 'httpTimeout',
    value: function httpTimeout(_httpTimeout) {
      this._httpTimeout = _httpTimeout;
      return this;
    }
  }]);

  return Base;
}();

exports.default = Base;
module.exports = exports['default'];