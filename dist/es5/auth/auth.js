'use strict';

var md5 = require('md5');
var Random = require('random-js');

var _require = require('../deps/utils/base64'),
    btoa = _require.btoa;

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

// default authenticators
var basicAuthenticator = function basicAuthenticator(auth, headers) {
  if (auth.username && auth.password) {
    var base64 = btoa(auth.username + ':' + auth.password);
    var authorization = 'Basic ' + base64;
    headers.Authorization = authorization;
  }
};

var tokenAuthenticator = function tokenAuthenticator(auth, headers) {
  if (auth.token) {
    headers['X-Authentication-Token'] = auth.token;
  }
};

var bearerTokenAuthenticator = function bearerTokenAuthenticator(auth, headers) {
  if (auth.token) {
    headers.Authorization = 'Bearer ' + auth.token;
  }
};

var random = Random.engines.mt19937().autoSeed();

var portalAuthenticator = function portalAuthenticator(auth, headers) {
  if (auth.secret && auth.username) {
    var date = new Date();
    var randomData = random();

    var clearToken = [date.getTime(), randomData, auth.secret, auth.username].join(':');
    var base64hashedToken = btoa(md5(clearToken, { asBytes: true }));
    headers.NX_RD = randomData;
    headers.NX_TS = date.getTime();
    headers.NX_TOKEN = base64hashedToken;
    headers.NX_USER = auth.username;
  }
};

Authentication.basicAuthenticator = basicAuthenticator;
Authentication.tokenAuthenticator = tokenAuthenticator;
Authentication.bearerTokenAuthenticator = bearerTokenAuthenticator;
Authentication.portalAuthenticator = portalAuthenticator;

module.exports = Authentication;