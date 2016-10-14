'use strict';

import md5 from 'md5';
import Random from 'random-js';

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

export const bearerTokenAuthenticator = (auth, headers) => {
  if (auth.token) {
    headers.Authorization = 'Bearer ' + auth.token;
  }
};

const random = Random.engines.mt19937().autoSeed();

export const portalAuthenticator = (auth, headers) => {
  if (auth.secret && auth.username) {
    const date = new Date();
    const randomData = random();

    const clearToken = [date.getTime(), randomData, auth.secret, auth.username].join(':');
    const base64hashedToken = btoa(md5(clearToken, { asBytes: true }));
    headers.NX_RD = randomData;
    headers.NX_TS = date.getTime();
    headers.NX_TOKEN = base64hashedToken;
    headers.NX_USER = auth.username;
  }
};
