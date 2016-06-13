'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = {
  method: 'token',
  computeAuthentication: function computeAuthentication(auth, headers) {
    if (auth.token) {
      headers['X-Authentication-Token'] = auth.token;
    }
  }
};
module.exports = exports['default'];