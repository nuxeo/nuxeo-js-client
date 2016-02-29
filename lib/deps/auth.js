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

function computeAuthentication(opts) {
  switch (opts.auth.method) {
    case 'basic':
      if (opts.auth.username && opts.auth.password) {
        var authorization = 'Basic ' + (0, _base.btoa)(opts.auth.username + ':' + opts.auth.password);
        opts.headers.Authorization = authorization;
      }
      break;
    default:
    // do nothing
  }
  return opts;
}
module.exports = exports['default'];