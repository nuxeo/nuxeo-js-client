"use strict";

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance"); }

function _iterableToArray(iter) { if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var extend = require('extend');

var DEFAULT_OPTS = {
  repositoryName: undefined,
  schemas: [],
  enrichers: {},
  fetchProperties: {},
  translateProperties: {},
  headers: {},
  httpTimeout: 30000
};
/**
 * This provides methods to store and use global settings when interacting with Nuxeo Platform.
 *
 * It's not meant to be used directly.
 *
 * @mixin
 */

var Base =
/*#__PURE__*/
function () {
  function Base() {
    var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    _classCallCheck(this, Base);

    var options = extend(true, {}, DEFAULT_OPTS, opts);
    this._baseOptions = {};
    this._baseOptions.repositoryName = options.repositoryName;
    this._baseOptions.schemas = options.schemas;
    this._baseOptions.enrichers = options.enrichers;
    this._baseOptions.fetchProperties = options.fetchProperties;
    this._baseOptions.translateProperties = options.translateProperties;
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


  _createClass(Base, [{
    key: "repositoryName",
    value: function repositoryName(_repositoryName) {
      this._baseOptions.repositoryName = _repositoryName;
      return this;
    }
    /**
     * Sets the schemas.
     * @param {Array} schemas - The schemas.
     * @returns {Base} The object itself.
     */

  }, {
    key: "schemas",
    value: function schemas(_schemas) {
      this._baseOptions.schemas = _toConsumableArray(_schemas);
      return this;
    }
    /**
     * Sets the enrichers.
     *
     * By default, the new enrichers override completely the existing ones. By setting `override` to false,
     * enrichers are merged.
     *
     * @example
     * { document: ['acls', 'permissions'] }
     * @param {object} enrichers - The new enrichers.
     * @param {boolean} override - If the new `enrichers` override the existing ones. Default to true.
     * @returns {Base} The object itself.
     */

  }, {
    key: "enrichers",
    value: function enrichers(_enrichers) {
      var override = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;
      this._baseOptions.enrichers = override ? {} : this._baseOptions.enrichers; // eslint-disable-next-line prefer-const

      for (var _i = 0, _Object$keys = Object.keys(_enrichers); _i < _Object$keys.length; _i++) {
        var key = _Object$keys[_i];

        if (override) {
          this._baseOptions.enrichers[key] = _toConsumableArray(_enrichers[key]);
        } else {
          var _this$_baseOptions$en;

          this._baseOptions.enrichers[key] = this._baseOptions.enrichers[key] || [];

          (_this$_baseOptions$en = this._baseOptions.enrichers[key]).push.apply(_this$_baseOptions$en, _toConsumableArray(_enrichers[key]));
        }
      }

      return this;
    }
    /**
     * Adds an enricher for a given entity.
     * @param {string} entity - The entity name.
     * @param {string} name - The enricher name.
     * @returns {Base} The object itself.
     */

  }, {
    key: "enricher",
    value: function enricher(entity, name) {
      var enrichers = this._baseOptions.enrichers[entity] || [];
      enrichers.push(name);
      this._baseOptions.enrichers[entity] = enrichers;
      return this;
    }
    /**
     * Sets the properties to fetch.
     *
     * By default, the new properties override completely the existing ones. By setting `override` to false,
     * the properties to fetch are merged.
     *
     * @example
     * { document: ['dc:creator'] }
     * @param {object} fetchProperties - The new properties to fetch.
     * @param {boolean} override - If the new `fetchProperties` override the existing ones. Default to true.
     * @returns {Base} The object itself.
     */

  }, {
    key: "fetchProperties",
    value: function fetchProperties(_fetchProperties) {
      var override = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;
      this._baseOptions.fetchProperties = override ? {} : this._baseOptions.fetchProperties; // eslint-disable-next-line prefer-const

      for (var _i2 = 0, _Object$keys2 = Object.keys(_fetchProperties); _i2 < _Object$keys2.length; _i2++) {
        var key = _Object$keys2[_i2];

        if (override) {
          this._baseOptions.fetchProperties[key] = _toConsumableArray(_fetchProperties[key]);
        } else {
          var _this$_baseOptions$fe;

          this._baseOptions.fetchProperties[key] = this._baseOptions.fetchProperties[key] || [];

          (_this$_baseOptions$fe = this._baseOptions.fetchProperties[key]).push.apply(_this$_baseOptions$fe, _toConsumableArray(_fetchProperties[key]));
        }
      }

      return this;
    }
    /**
    * Adds a property to fetch for a given entity.
    * @param {string} entity - The entity name.
    * @param {string} name - The property name.
    * @returns {Base} The object itself.
    */

  }, {
    key: "fetchProperty",
    value: function fetchProperty(entity, name) {
      var fetchProperties = this._baseOptions.fetchProperties[entity] || [];
      fetchProperties.push(name);
      this._baseOptions.fetchProperties[entity] = fetchProperties;
      return this;
    }
    /**
     * Sets the properties to translate.
     *
     * By default, the new properties override completely the existing ones. By setting `override` to false,
     * the properties to translate are merged.
     *
     * @example
     * { directoryEntry: ['label'] }
     * @param {object} translateProperties - The new properties to translate.
     * @param {boolean} override - If the new `translateProperties` override the existing ones. Default to true.
     * @returns {Base} The object itself.
     */

  }, {
    key: "translateProperties",
    value: function translateProperties(_translateProperties) {
      var override = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;
      this._baseOptions.translateProperties = override ? {} : this._baseOptions.translateProperties; // eslint-disable-next-line prefer-const

      for (var _i3 = 0, _Object$keys3 = Object.keys(_translateProperties); _i3 < _Object$keys3.length; _i3++) {
        var key = _Object$keys3[_i3];

        if (override) {
          this._baseOptions.translateProperties[key] = _toConsumableArray(_translateProperties[key]);
        } else {
          var _this$_baseOptions$tr;

          this._baseOptions.translateProperties[key] = this._baseOptions.translateProperties[key] || [];

          (_this$_baseOptions$tr = this._baseOptions.translateProperties[key]).push.apply(_this$_baseOptions$tr, _toConsumableArray(_translateProperties[key]));
        }
      }

      return this;
    }
    /**
    * Adds a property to translate for a given entity.
    * @param {string} entity - The entity name.
    * @param {string} name - The property name.
    * @returns {Base} The object itself.
    */

  }, {
    key: "translateProperty",
    value: function translateProperty(entity, name) {
      var translateProperties = this._baseOptions.translateProperties[entity] || [];
      translateProperties.push(name);
      this._baseOptions.translateProperties[entity] = translateProperties;
      return this;
    }
    /**
     * Sets the depth.
     * Possible values are: `root`, `children` and `max`.
     * @returns {Base} The object itself.
     */

  }, {
    key: "depth",
    value: function depth(_depth) {
      this._baseOptions.depth = _depth;
      return this;
    }
    /**
     * Sets the headers.
     * @param {object} headers - the new headers.
     * @returns {Base} The object itself.
     */

  }, {
    key: "headers",
    value: function headers(_headers) {
      this._baseOptions.headers = {}; // eslint-disable-next-line prefer-const

      for (var _i4 = 0, _Object$keys4 = Object.keys(_headers); _i4 < _Object$keys4.length; _i4++) {
        var key = _Object$keys4[_i4];
        this._baseOptions.headers[key] = _headers[key];
      }

      return this;
    }
    /**
     * Adds a header.
     * @param {string} name - the header name
     * @param {string} value - the header value
     * @returns {Base} The object itself..
     */

  }, {
    key: "header",
    value: function header(name, value) {
      this._baseOptions.headers[name] = value;
      return this;
    }
    /**
     * Sets the global timeout, used as HTTP timeout and transaction timeout
     * by default.
     * @returns {Base} The object itself.
     * @deprecated since 3.6.0, use {#httpTiemout} or {#transactionTimeout} instead.
     */

  }, {
    key: "timeout",
    value: function timeout(_timeout) {
      this._baseOptions.timeout = _timeout;
      return this;
    }
    /**
     * Sets the transaction timeout, in seconds.
     * @returns {Base} The object itself.
     */

  }, {
    key: "transactionTimeout",
    value: function transactionTimeout(_transactionTimeout) {
      this._baseOptions.transactionTimeout = _transactionTimeout;
      return this;
    }
    /**
     * Sets the HTTP timeout, in milliseconds.
     *
     * The HTTP timeout works only in a Node.js environment.
     * @returns {Base} The object itself.
     */

  }, {
    key: "httpTimeout",
    value: function httpTimeout(_httpTimeout) {
      this._baseOptions.httpTimeout = _httpTimeout;
      return this;
    }
    /**
    * Computes a full options object from an optional `opts` object and the ones from this object.
    * `schemas`, `enrichers`, `fetchProperties` and `headers` are not merged but the ones from the `opts` object
    * override the ones from this object.
    */

  }, {
    key: "_computeOptions",
    value: function _computeOptions() {
      var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      var options = extend(true, {}, this._baseOptions, opts); // force some options that we don't merge

      if (opts.schemas) {
        options.schemas = _toConsumableArray(opts.schemas);
      }

      if (opts.enrichers) {
        options.enrichers = {};
        Object.keys(opts.enrichers).forEach(function (key) {
          options.enrichers[key] = opts.enrichers[key];
        });
      }

      if (opts.fetchProperties) {
        options.fetchProperties = {};
        Object.keys(opts.fetchProperties).forEach(function (key) {
          options.fetchProperties[key] = opts.fetchProperties[key];
        });
      }

      if (opts.translateProperties) {
        options.translateProperties = {};
        Object.keys(opts.translateProperties).forEach(function (key) {
          options.translateProperties[key] = opts.translateProperties[key];
        });
      }

      if (opts.headers) {
        options.headers = {};
        Object.keys(opts.headers).forEach(function (key) {
          options.headers[key] = opts.headers[key];
        });
      }

      return options;
    }
  }]);

  return Base;
}();

module.exports = Base;