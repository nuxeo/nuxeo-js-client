'use strict';

const authenticators = {};

export default {
  registerAuthenticator: (authenticator) => {
    authenticators[authenticator.method] = authenticator.computeAuthentication;
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
