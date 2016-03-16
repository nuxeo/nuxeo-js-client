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

export default function computeAuthentication(auth, headers) {
  if (auth) {
    switch (auth.method) {
      case 'basic':
        if (auth.username && auth.password) {
          const authorization = 'Basic ' + btoa(auth.username + ':' + auth.password);
          headers.Authorization = authorization;
        }
        break;
      default:
        // do nothing
    }
  }
  return headers;
}
