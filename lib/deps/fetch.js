'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = doFetch;

var _extend = require('extend');

var _extend2 = _interopRequireDefault(_extend);

var _queryString = require('query-string');

var _queryString2 = _interopRequireDefault(_queryString);

var _formData = require('./form-data');

var _formData2 = _interopRequireDefault(_formData);

var _auth = require('./auth');

var _auth2 = _interopRequireDefault(_auth);

var _promiseNuxeo = require('./promise-nuxeo');

var _promiseNuxeo2 = _interopRequireDefault(_promiseNuxeo);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

require('isomorphic-fetch');

var DEFAULT_OPTS = {
  method: 'GET',
  headers: {},
  json: true,
  timeout: 30000,
  cache: false,
  resolveWithFullResponse: false
};

function doFetch(opts) {
  var options = (0, _extend2.default)(true, {}, DEFAULT_OPTS, opts);
  options = (0, _auth2.default)(options);

  var transactionTimeout = options.transactionTimeout || options.timeout;
  var httpTimeout = options.httpTimeout || 5 + transactionTimeout;
  options.headers['Nuxeo-Transaction-Timeout'] = transactionTimeout;
  options.timeout = httpTimeout;
  delete options.transactionTimeout;
  delete options.httpTimeout;

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

  var url = options.url;
  if (options.queryParams) {
    url += _queryString2.default.stringify(options.queryParams);
  }

  return (0, _promiseNuxeo2.default)(function (resolve, reject) {
    fetch(url, {
      method: options.method,
      headers: options.headers,
      body: options.body,
      credentials: 'include'
    }).then(function (res) {
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
        return resolve(res.json());
      }
      return resolve(res);
    }).catch(function (error) {
      return reject(error);
    });
  });
}
module.exports = exports['default'];