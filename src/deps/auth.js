'use strict';

import { btoa } from './utils/base64';

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

export default function computeAuthentication(opts) {
  switch (opts.auth.method) {
    case 'basic':
      const authorization = 'Basic ' + btoa(opts.auth.username + ':' + opts.auth.password);
      opts.headers.Authorization = authorization;
      break;
    default:
      // do nothing
  }
  return opts;
}
