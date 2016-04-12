'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _base = require('../deps/utils/base64');

exports.default = {
  method: 'basic',
  computeAuthentication: function computeAuthentication(auth, headers) {
    if (auth.username && auth.password) {
      var authorization = 'Basic ' + (0, _base.btoa)(auth.username + ':' + auth.password);
      headers.Authorization = authorization;
    }
  }
};
module.exports = exports['default'];