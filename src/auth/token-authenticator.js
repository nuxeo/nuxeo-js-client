'use strict';

export default {
  method: 'token',
  computeAuthentication: (auth, headers) => {
    if (auth.token) {
      headers['X-Authentication-Token'] = auth.token;
    }
  },
};
