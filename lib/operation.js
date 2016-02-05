'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extend = require('extend');

var _extend2 = _interopRequireDefault(_extend);

var _base = require('./base');

var _base2 = _interopRequireDefault(_base);

var _join = require('./deps/utils/join');

var _join2 = _interopRequireDefault(_join);

var _blob = require('./blob');

var _blob2 = _interopRequireDefault(_blob);

var _blob3 = require('./upload/blob');

var _blob4 = _interopRequireDefault(_blob3);

var _batch = require('./upload/batch');

var _batch2 = _interopRequireDefault(_batch);

var _formData = require('./deps/form-data');

var _formData2 = _interopRequireDefault(_formData);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * The `Operation` class allows to execute an operation on a Nuxeo Platform instance.
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
 * nuxeo.operation('Document.GetChild')
 *   .input('/default-domain')
 *   .params({
 *     name: 'workspaces',
 *   })
 *   .execute().then((res) => {
       // res.uid !== null
 *     // res.title === 'Workspaces'
 *   }).catch(error => throw new Error(error));
 */

var Operation = function (_Base) {
  _inherits(Operation, _Base);

  /**
   * Creates an Operation.
   * @param {string} opts - The configuration options.
   * @param {string} opts.id - The ID of the operation.
   * @param {string} opts.url - The automation URL.
   */

  function Operation() {
    var opts = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    _classCallCheck(this, Operation);

    var options = (0, _extend2.default)(true, {}, opts);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(Operation).call(this, options));

    _this._nuxeo = options.nuxeo;
    _this._id = options.id;
    _this._url = options.url;
    _this._automationParams = {
      params: {},
      context: {},
      input: undefined
    };
    return _this;
  }

  /**
   * Adds an operation param.
   * @param {string} name - The param name.
   * @param {string} value - The param value.
   * @returns {Operation} The operation itself.
   */

  _createClass(Operation, [{
    key: 'param',
    value: function param(name, value) {
      this._automationParams.params[name] = value;
      return this;
    }

    /**
     * Adds operation params. The given params are merged with the existing ones if any.
     * @param {object} params - The params to be merge with the existing ones.
     * @returns {Operation} The operation itself.
     */

  }, {
    key: 'params',
    value: function params(_params) {
      this._automationParams.params = (0, _extend2.default)(true, {}, this._automationParams.params, _params);
      return this;
    }

    /**
     * Sets this operation context.
     * @param {object} context - The operation context.
     * @returns {Operation} The operation itself.
     */

  }, {
    key: 'context',
    value: function context(_context) {
      this._automationParams.context = _context;
      return this;
    }

    /**
     * Sets this operation input.
     * @param {string|Array|Blob|BatchBlob|BatchUpload} input - The operation input.
     * @returns {Operation} The operation itself.
     */

  }, {
    key: 'input',
    value: function input(_input) {
      this._automationParams.input = _input;
      return this;
    }

    /**
     * Executes this operation.
     * @param {object} opts - Options overriding the ones from the Operation object.
     * @returns {Promise} A Promise object resolved with the result of the Operation.
     */

  }, {
    key: 'execute',
    value: function execute() {
      var opts = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      var schemas = opts.schemas || this._schemas;

      var headers = (0, _extend2.default)(true, {}, this._headers);
      if (schemas.length > 0) {
        headers['X-NXDocumentProperties'] = schemas.join(',');
      }
      var repositoryName = opts.repositoryName || this._repositoryName;
      if (repositoryName !== undefined) {
        headers['X-NXRepository'] = repositoryName;
      }
      headers['Content-Type'] = this._computeContentTypeHeader(this._automationParams.input);
      headers = (0, _extend2.default)(true, headers, opts.headers);

      var finalOptions = {
        headers: headers,
        method: 'POST',
        url: this._computeRequestURL(),
        body: this._computeRequestBody(),
        timeout: this._timeout,
        transactionTimeout: this._transactionTimeout,
        httpTimeout: this._httpTimeout,
        auth: this._auth
      };
      finalOptions = (0, _extend2.default)(true, finalOptions, opts);

      return this._nuxeo.fetch(finalOptions);
    }
  }, {
    key: '_computeContentTypeHeader',
    value: function _computeContentTypeHeader(input) {
      var contentType = 'application/json+nxrequest';
      if (this._isMultipartInput(input)) {
        contentType = 'multipart/form-data';
      } else if (this._isBatchInput(input)) {
        contentType = 'application/json';
      }
      return contentType;
    }
  }, {
    key: '_computeRequestURL',
    value: function _computeRequestURL() {
      var input = this._automationParams.input;
      if (input instanceof _blob4.default) {
        return (0, _join2.default)(this._nuxeo._restURL, 'upload', input['upload-batch'], input['upload-fileId'], 'execute', this._id);
      } else if (input instanceof _batch2.default) {
        return (0, _join2.default)(this._nuxeo._restURL, 'upload', input._batchId, 'execute', this._id);
      }
      return (0, _join2.default)(this._url, this._id);
    }
  }, {
    key: '_computeRequestBody',
    value: function _computeRequestBody() {
      var input = this._automationParams.input;
      if (this._isBatchInput(input)) {
        // no input needed
        var body = (0, _extend2.default)(true, {}, this._automationParams);
        body.input = undefined;
        return body;
      }

      if (input instanceof Array) {
        if (input.length > 0) {
          var first = input[0];
          if (typeof first === 'string') {
            // assume ref list
            this._automationParams.input = 'docs:' + input.join(',');
            return this._automationParams;
          } else if (first instanceof _blob2.default) {
            // blob list => multipart
            var automationParams = {
              params: this._automationParams.params,
              context: this._automationParams.context
            };
            var form = new _formData2.default();
            form.append('params', JSON.stringify(automationParams));

            var inputIndex = 0;
            var _iteratorNormalCompletion = true;
            var _didIteratorError = false;
            var _iteratorError = undefined;

            try {
              for (var _iterator = input[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                var blob = _step.value;

                form.append('input#' + inputIndex++, blob.content, blob.name);
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

            return form;
          }
        }
      } else if (this._automationParams.input instanceof _blob2.default) {
        var automationParams = {
          params: this._automationParams.params,
          context: this._automationParams.context
        };
        var form = new _formData2.default();
        form.append('params', JSON.stringify(automationParams));
        form.append('input', input.content, input.name);
        return form;
      }
      return this._automationParams;
    }
  }, {
    key: '_isMultipartInput',
    value: function _isMultipartInput(input) {
      if (input instanceof Array) {
        if (input.length > 0) {
          var first = input[0];
          if (first instanceof _blob2.default) {
            return true;
          }
        }
      } else if (input instanceof _blob2.default) {
        return true;
      }
      return false;
    }
  }, {
    key: '_isBatchInput',
    value: function _isBatchInput(input) {
      return input instanceof _batch2.default || input instanceof _blob4.default;
    }
  }]);

  return Operation;
}(_base2.default);

exports.default = Operation;
module.exports = exports['default'];