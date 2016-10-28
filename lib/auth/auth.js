'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.portalAuthenticator = exports.bearerTokenAuthenticator = exports.tokenAuthenticator = exports.basicAuthenticator = undefined;

var _md = require('md5');

var _md2 = _interopRequireDefault(_md);

var _randomJs = require('random-js');

var _randomJs2 = _interopRequireDefault(_randomJs);

var _base = require('../deps/utils/base64');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var authenticators = {};

var Authentication = {
  registerAuthenticator: function registerAuthenticator(method, authenticator) {
    authenticators[method] = authenticator;
  },

  computeAuthentication: function computeAuthentication(auth, headers) {
    if (auth) {
      var authenticator = authenticators[auth.method];
      if (authenticator) {
        authenticator(auth, headers);
      }
    }
    return headers;
  }
};
exports.default = Authentication;

// default authenticators

var basicAuthenticator = exports.basicAuthenticator = function basicAuthenticator(auth, headers) {
  if (auth.username && auth.password) {
    var authorization = 'Basic ' + (0, _base.btoa)(auth.username + ':' + auth.password);
    headers.Authorization = authorization;
  }
};

var tokenAuthenticator = exports.tokenAuthenticator = function tokenAuthenticator(auth, headers) {
  if (auth.token) {
    headers['X-Authentication-Token'] = auth.token;
  }
};

var bearerTokenAuthenticator = exports.bearerTokenAuthenticator = function bearerTokenAuthenticator(auth, headers) {
  if (auth.token) {
    headers.Authorization = 'Bearer ' + auth.token;
  }
};

var random = _randomJs2.default.engines.mt19937().autoSeed();

var portalAuthenticator = exports.portalAuthenticator = function portalAuthenticator(auth, headers) {
  if (auth.secret && auth.username) {
    var date = new Date();
    var randomData = random();

    var clearToken = [date.getTime(), randomData, auth.secret, auth.username].join(':');
    var base64hashedToken = (0, _base.btoa)((0, _md2.default)(clearToken, { asBytes: true }));
    headers.NX_RD = randomData;
    headers.NX_TS = date.getTime();
    headers.NX_TOKEN = base64hashedToken;
    headers.NX_USER = auth.username;
  }
};