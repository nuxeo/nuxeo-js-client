'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _extend = require('extend');

var _extend2 = _interopRequireDefault(_extend);

var _base = require('./base');

var _base2 = _interopRequireDefault(_base);

var _operation = require('./operation');

var _operation2 = _interopRequireDefault(_operation);

var _request = require('./request');

var _request2 = _interopRequireDefault(_request);

var _repository = require('./repository');

var _repository2 = _interopRequireDefault(_repository);

var _batch = require('./upload/batch');

var _batch2 = _interopRequireDefault(_batch);

var _users = require('./user/users');

var _users2 = _interopRequireDefault(_users);

var _groups = require('./group/groups');

var _groups2 = _interopRequireDefault(_groups);

var _directory = require('./directory/directory');

var _directory2 = _interopRequireDefault(_directory);

var _workflows = require('./workflow/workflows');

var _workflows2 = _interopRequireDefault(_workflows);

var _join = require('./deps/utils/join');

var _join2 = _interopRequireDefault(_join);

var _promise = require('./deps/promise');

var _promise2 = _interopRequireDefault(_promise);

var _queryString = require('query-string');

var _queryString2 = _interopRequireDefault(_queryString);

var _formData = require('./deps/form-data');

var _formData2 = _interopRequireDefault(_formData);

var _auth = require('./deps/auth');

var _auth2 = _interopRequireDefault(_auth);

var _fetch = require('./deps/fetch');

var _fetch2 = _interopRequireDefault(_fetch);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var API_PATH_V1 = 'api/v1/';
var AUTOMATION = 'automation/';

var DEFAULT_OPTS = {
  baseURL: 'http://localhost:8080/nuxeo/',
  apiPath: API_PATH_V1,
  promiseLibrary: null,
  auth: null
};

/**
 * The `Nuxeo` class allows using the REST API of a Nuxeo Platform instance.
 * @extends Base
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
 * nuxeo.request('path/')
 *   .get()
 *   .then(function(doc) {
 *     // doc.uid !== null
 *   });
 */

var Nuxeo = function (_Base) {
  _inherits(Nuxeo, _Base);

  /**
   * Creates a new Nuxeo instance.
   * @param {object} [opts] - The configuration options.
   * @param {string} [opts.baseURL=http://localhost:8080/nuxeo/] - Base URL of the Nuxeo Platform.
   * @param {string} [opts.apiPath=api/v1] - The API path.
   * @param {object} [opts.auth] - The authentication configuration.
   */

  function Nuxeo() {
    var opts = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    _classCallCheck(this, Nuxeo);

    var options = (0, _extend2.default)(true, {}, DEFAULT_OPTS, opts);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(Nuxeo).call(this, options));

    _this._baseURL = options.baseURL;
    _this._restURL = (0, _join2.default)(_this._baseURL, options.apiPath);
    _this._automationURL = (0, _join2.default)(_this._restURL, AUTOMATION);
    _this._auth = options.auth;
    _this.connected = false;
    _this.Promise = Nuxeo.Promise || _promise2.default;
    _this._activeRequests = 0;
    return _this;
  }

  /**
   * Connects to the Nuxeo Platform instance using the configured authentication.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A promise resolved with the logged in user.
   */


  _createClass(Nuxeo, [{
    key: 'login',
    value: function login() {
      var _this2 = this;

      var opts = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      var finalOptions = {
        method: 'POST',
        url: (0, _join2.default)(this._automationURL, 'login')
      };
      finalOptions = (0, _extend2.default)(true, finalOptions, opts);
      finalOptions = this._computeOptions(finalOptions);
      return this._http(finalOptions).then(function (res) {
        return _this2.request('user').path(res.username).get().then(function (user) {
          _this2.user = user;
          _this2.connected = true;
          return user;
        });
      });
    }

    /**
     * Does a http request.
     *
     * To be used when doing any call on Nuxeo Platform.
     */

  }, {
    key: '_http',
    value: function _http() {
      var _this3 = this;

      var opts = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      var options = this._computeFetchOptions(opts);
      return new this.Promise(function (resolve, reject) {
        _this3._activeRequests++;

        var fetchOptions = {
          method: options.method,
          headers: options.headers,
          body: options.body
        };
        if (!_this3._auth) {
          fetchOptions.credentials = 'include';
        }
        (0, _fetch2.default)(options.url, fetchOptions).then(function (res) {
          _this3._activeRequests--;
          if (!/^2/.test('' + res.status)) {
            var error = new Error(res.statusText);
            error.response = res;
            return reject(error);
          }

          if (options.resolveWithFullResponse || res.status === 204) {
            return resolve(res);
          }

          var contentType = res.headers.get('content-type');
          if (contentType && contentType.indexOf('application/json') === 0) {
            // TODO add marshallers
            return resolve(res.json());
          }
          return resolve(res);
        }).catch(function (error) {
          _this3._activeRequests--;
          return reject(error);
        });
      });
    }
  }, {
    key: '_computeFetchOptions',
    value: function _computeFetchOptions(opts) {
      var options = {
        method: 'GET',
        headers: {},
        json: true,
        timeout: 30000,
        cache: false,
        resolveWithFullResponse: false
      };
      options = (0, _extend2.default)(true, {}, options, opts);
      options.headers = (0, _auth2.default)(this._auth, options.headers);

      if (options.schemas.length > 0) {
        options.headers['X-NXDocumentProperties'] = options.schemas.join(',');
      }
      if (opts.repositoryName !== undefined) {
        options.headers['X-NXRepository'] = options.repositoryName;
      }

      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = Object.keys(options.enrichers)[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var key = _step.value;

          options.headers['enrichers-' + key] = options.enrichers[key].join(',');
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

      var _iteratorNormalCompletion2 = true;
      var _didIteratorError2 = false;
      var _iteratorError2 = undefined;

      try {
        for (var _iterator2 = Object.keys(options.fetchProperties)[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
          var _key = _step2.value;

          options.headers['fetch-' + _key] = options.fetchProperties[_key].join(',');
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

      if (options.depth) {
        options.headers.depth = options.depth;
      }

      var transactionTimeout = options.transactionTimeout || options.timeout;
      var httpTimeout = options.httpTimeout || 5 + transactionTimeout;
      options.headers['Nuxeo-Transaction-Timeout'] = transactionTimeout;
      options.timeout = httpTimeout;

      if (options.json) {
        options.headers.Accept = 'application/json';
        options.headers['Content-Type'] = options.headers['Content-Type'] || 'application/json';
        // do not stringify FormData
        if (_typeof(options.body) === 'object' && !(options.body instanceof _formData2.default)) {
          options.body = JSON.stringify(options.body);
        }
      }

      if (options.method === 'GET') {
        delete options.headers['Content-Type'];
      }

      if (options.queryParams) {
        options.url += options.url.indexOf('?') === -1 ? '?' : '';
        options.url += _queryString2.default.stringify(options.queryParams);
      }
      return options;
    }

    /**
     * Creates a new {@link Operation} object.
     * @param {string} id - The operation ID.
     * @param {object} [opts] - Options overriding the ones from this object.
     * @returns {Operation}
     */

  }, {
    key: 'operation',
    value: function operation(id) {
      var opts = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      var finalOptions = {
        id: id,
        nuxeo: this,
        url: this._automationURL
      };
      finalOptions = (0, _extend2.default)(true, finalOptions, opts);
      finalOptions = this._computeOptions(finalOptions);
      return new _operation2.default(finalOptions);
    }

    /**
     * Creates a new {@link Request} object.
     * @param {string} path - The request default path.
     * @param {object} [opts] - Options overriding the ones from this object.
     * @returns {Request}
     */

  }, {
    key: 'request',
    value: function request(path) {
      var opts = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      var finalOptions = {
        path: path,
        nuxeo: this,
        url: this._restURL
      };
      finalOptions = (0, _extend2.default)(true, finalOptions, opts);
      finalOptions = this._computeOptions(finalOptions);
      return new _request2.default(finalOptions);
    }

    /**
     * Creates a new {@link Repository} object.
     * @param {string} name - The repository name. Default to the Nuxeo's repository name.
     * @param {object} [opts] - Options overriding the ones from this object.
     * @returns {Repository}
     */

  }, {
    key: 'repository',
    value: function repository() {
      var name = arguments.length <= 0 || arguments[0] === undefined ? null : arguments[0];
      var opts = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      var repositoryName = name;
      var options = opts;
      if ((typeof repositoryName === 'undefined' ? 'undefined' : _typeof(repositoryName)) === 'object') {
        options = repositoryName;
        repositoryName = null;
      }

      var finalOptions = {
        nuxeo: this
      };
      if (repositoryName) {
        finalOptions.repositoryName = repositoryName;
      }
      finalOptions = (0, _extend2.default)(true, finalOptions, options);
      finalOptions = this._computeOptions(finalOptions);
      return new _repository2.default(finalOptions);
    }

    /**
     * Creates a new {@link BatchUpload} object.
     * @param {object} [opts] - Options overriding the ones from this object.
     * @returns {BatchUpload}
     */

  }, {
    key: 'batchUpload',
    value: function batchUpload() {
      var opts = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      var finalOptions = {
        nuxeo: this,
        url: this._restURL
      };
      finalOptions = (0, _extend2.default)(true, finalOptions, opts);
      finalOptions = this._computeOptions(finalOptions);
      return new _batch2.default(finalOptions);
    }

    /**
     * Creates a new {@link Users} object to manage users.
     * @param {object} [opts] - Options overriding the ones from this object.
     * @returns {Users}
     */

  }, {
    key: 'users',
    value: function users() {
      var opts = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      var finalOptions = {
        nuxeo: this
      };
      finalOptions = (0, _extend2.default)(true, finalOptions, opts);
      finalOptions = this._computeOptions(finalOptions);
      return new _users2.default(finalOptions);
    }

    /**
     * Creates a new {@link Groups} object to manage groups.
     * @param {object} [opts] - Options overriding the ones from this object.
     * @returns {Groups}
     */

  }, {
    key: 'groups',
    value: function groups() {
      var opts = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      var finalOptions = {
        nuxeo: this
      };
      finalOptions = (0, _extend2.default)(true, finalOptions, opts);
      finalOptions = this._computeOptions(finalOptions);
      return new _groups2.default(finalOptions);
    }

    /**
     * Creates a new {@link Directory} object.
     * @param {string} name - The directory name.
     * @param {object} [opts] - Options overriding the ones from this object.
     * @returns {Directory}
     */

  }, {
    key: 'directory',
    value: function directory(name) {
      var opts = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      var finalOptions = {
        directoryName: name,
        nuxeo: this
      };
      finalOptions = (0, _extend2.default)(true, finalOptions, opts);
      finalOptions = this._computeOptions(finalOptions);
      return new _directory2.default(finalOptions);
    }

    /**
     * Creates a new {@link Workflows} object.
     * @param {string} name - The repository name. Default to the Nuxeo's repository name.
     * @param {object} [opts] - Options overriding the ones from this object.
     * @returns {Workflows}
     */

  }, {
    key: 'workflows',
    value: function workflows() {
      var repositoryName = arguments.length <= 0 || arguments[0] === undefined ? this._repositoryName : arguments[0];
      var opts = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      var finalOptions = {
        repositoryName: repositoryName,
        nuxeo: this
      };
      finalOptions = (0, _extend2.default)(true, finalOptions, opts);
      finalOptions = this._computeOptions(finalOptions);
      return new _workflows2.default(finalOptions);
    }
  }]);

  return Nuxeo;
}(_base2.default);

/**
 * Sets the Promise library class to use.
 */


Nuxeo.promiseLibrary = function (promiseLibrary) {
  Nuxeo.Promise = promiseLibrary;
};

exports.default = Nuxeo;
module.exports = exports['default'];