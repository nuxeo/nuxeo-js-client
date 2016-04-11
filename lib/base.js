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
  enrichers: {},
  fetchProperties: {},
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
    this._baseOptions = {};
    this._baseOptions.repositoryName = options.repositoryName;
    this._baseOptions.schemas = options.schemas;
    this._baseOptions.enrichers = options.enrichers;
    this._baseOptions.fetchProperties = options.fetchProperties;
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
    key: 'repositoryName',
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
    key: 'schemas',
    value: function schemas(_schemas) {
      this._baseOptions.schemas = [].concat(_toConsumableArray(_schemas));
      return this;
    }

    /**
     * Sets the enrichers.
     * @example
     * { document: ['acls', 'permissions'] }
     * @param {object} enrichers - The new enrichers.
     * @returns {Base} The object itself.
     */

  }, {
    key: 'enrichers',
    value: function enrichers(_enrichers) {
      this._baseOptions.enrichers = {};
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = Object.keys(_enrichers)[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var key = _step.value;

          this._baseOptions.enrichers[key] = _enrichers[key];
        }
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator.return) {
            _iterator.return();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
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
    key: 'enricher',
    value: function enricher(entity, name) {
      var enrichers = this._baseOptions.enrichers[entity] || [];
      enrichers.push(name);
      this._baseOptions.enrichers[entity] = enrichers;
      return this;
    }

    /**
     * Sets the properties to fetch.
     * @example
     * { document: ['dc:creator'] }
     * @param {object} fetchProperties - The new properties to fetch.
     * @returns {Base} The object itself.
     */

  }, {
    key: 'fetchProperties',
    value: function fetchProperties(_fetchProperties) {
      this._baseOptions.fetchProperties = {};
      var _iteratorNormalCompletion2 = true;
      var _didIteratorError2 = false;
      var _iteratorError2 = undefined;

      try {
        for (var _iterator2 = Object.keys(_fetchProperties)[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
          var key = _step2.value;

          this._baseOptions.fetchProperties[key] = _fetchProperties[key];
        }
      } catch (err) {
        _didIteratorError2 = true;
        _iteratorError2 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion2 && _iterator2.return) {
            _iterator2.return();
          }
        } finally {
          if (_didIteratorError2) {
            throw _iteratorError2;
          }
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
    key: 'fetchProperty',
    value: function fetchProperty(entity, name) {
      var fetchProperties = this._baseOptions.fetchProperties[entity] || [];
      fetchProperties.push(name);
      this._baseOptions.fetchProperties[entity] = fetchProperties;
      return this;
    }

    /**
     * Sets the depth.
     * Possible values are: `root`, `children` and `max`.
     * @returns {Base} The object itself.
     */

  }, {
    key: 'depth',
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
    key: 'headers',
    value: function headers(_headers) {
      this._baseOptions.headers = {};
      var _iteratorNormalCompletion3 = true;
      var _didIteratorError3 = false;
      var _iteratorError3 = undefined;

      try {
        for (var _iterator3 = Object.keys(_headers)[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
          var key = _step3.value;

          this._baseOptions.headers[key] = _headers[key];
        }
      } catch (err) {
        _didIteratorError3 = true;
        _iteratorError3 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion3 && _iterator3.return) {
            _iterator3.return();
          }
        } finally {
          if (_didIteratorError3) {
            throw _iteratorError3;
          }
        }
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
    key: 'header',
    value: function header(name, value) {
      this._baseOptions.headers[name] = value;
      return this;
    }

    /**
     * Sets the global timeout, used as HTTP timeout and transaction timeout
     * by default.
     * @returns {Base} The object itself.
     */

  }, {
    key: 'timeout',
    value: function timeout(_timeout) {
      this._baseOptions.timeout = _timeout;
      return this;
    }

    /**
     * Sets the transaction timeout.
     * @returns {Base} The object itself.
     */

  }, {
    key: 'transactionTimeout',
    value: function transactionTimeout(_transactionTimeout) {
      this._baseOptions.transactionTimeout = _transactionTimeout;
      return this;
    }

    /**
     * Sets the HTTP timeout.
     * @returns {Base} The object itself.
     */

  }, {
    key: 'httpTimeout',
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
    key: '_computeOptions',
    value: function _computeOptions() {
      var opts = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      var options = (0, _extend2.default)(true, {}, this._baseOptions, opts);
      // force some options that we don't merge
      if (opts.schemas) {
        options.schemas = [].concat(_toConsumableArray(opts.schemas));
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

exports.default = Base;
module.exports = exports['default'];