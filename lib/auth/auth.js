'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.tokenAuthenticator = exports.basicAuthenticator = undefined;

var _base = require('../deps/utils/base64');

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