'use strict';

import { btoa } from '../deps/utils/base64';

export default {
  method: 'basic',
  computeAuthentication: (auth, headers) => {
    if (auth.username && auth.password) {
      const authorization = 'Basic ' + btoa(auth.username + ':' + auth.password);
      headers.Authorization = authorization;
    }
  },
};
