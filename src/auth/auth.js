'use strict';

import { btoa } from '../deps/utils/base64';

const authenticators = {};

const Authentication = {
  registerAuthenticator: (method, authenticator) => {
    authenticators[method] = authenticator;
  },

  computeAuthentication: (auth, headers) => {
    if (auth) {
      const authenticator = authenticators[auth.method];
      if (authenticator) {
        authenticator(auth, headers);
      }
    }
    return headers;
  },
};
export default Authentication;

// default authenticators
export const basicAuthenticator = (auth, headers) => {
  if (auth.username && auth.password) {
    const authorization = 'Basic ' + btoa(auth.username + ':' + auth.password);
    headers.Authorization = authorization;
  }
};

export const tokenAuthenticator = (auth, headers) => {
  if (auth.token) {
    headers['X-Authentication-Token'] = auth.token;
  }
};
