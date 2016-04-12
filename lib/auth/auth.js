'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
var authenticators = {};

exports.default = {
  registerAuthenticator: function registerAuthenticator(authenticator) {
    authenticators[authenticator.method] = authenticator.computeAuthentication;
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
module.exports = exports['default'];