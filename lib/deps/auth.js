'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = computeAuthentication;

var _base = require('./utils/base64');

// const auth = {
//   proxy: {
//     DEFAULT_HEADER_NAME: 'Auth-User',
//   },
//   portal: {
//     TOKEN_SEPARATOR: ':',
//     headerNames: {
//       RANDOM: 'NX_RD',
//       TIMESTAMP: 'NX_TS',
//       TOKEN: 'NX_TOKEN',
//       USER: 'NX_USER',
//     },
//   },
// };

function computeAuthentication(auth, headers) {
  if (auth) {
    switch (auth.method) {
      case 'basic':
        if (auth.username && auth.password) {
          var authorization = 'Basic ' + (0, _base.btoa)(auth.username + ':' + auth.password);
          headers.Authorization = authorization;
        }
        break;
      default:
      // do nothing
    }
  }
  return headers;
}
module.exports = exports['default'];