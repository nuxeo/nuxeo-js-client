const md5 = require('md5');
const Random = require('random-js');

const { btoa } = require('../deps/utils/base64');

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

// default authenticators
const basicAuthenticator = (auth, headers) => {
  if (auth.username && auth.password) {
    const base64 = btoa(`${auth.username}:${auth.password}`);
    const authorization = `Basic ${base64}`;
    headers.Authorization = authorization;
  }
};

const tokenAuthenticator = (auth, headers) => {
  if (auth.token) {
    headers['X-Authentication-Token'] = auth.token;
  }
};

const bearerTokenAuthenticator = (auth, headers) => {
  if (auth.token) {
    const accessToken = auth.token.access_token || auth.token;
    headers.Authorization = `Bearer ${accessToken}`;
  }
};

const random = Random.engines.mt19937().autoSeed();

const portalAuthenticator = (auth, headers) => {
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

Authentication.basicAuthenticator = basicAuthenticator;
Authentication.tokenAuthenticator = tokenAuthenticator;
Authentication.bearerTokenAuthenticator = bearerTokenAuthenticator;
Authentication.portalAuthenticator = portalAuthenticator;

module.exports = Authentication;
