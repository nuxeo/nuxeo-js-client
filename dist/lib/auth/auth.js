const md5 = require('md5');
const Random = require('random-js');
const extend = require('extend');

const { btoa } = require('../deps/utils/base64');
const Promise = require('../deps/promise');
const oauth2 = require('../auth/oauth2');

const DEFAULT_AUTHENTICATOR = {
  computeAuthenticationHeaders: () => {},
  authenticateURL: (url) => url,
  canRefreshAuthentication: () => false,
  refreshAuthentication: (baseURL, auth) => new Promise((resolve) => resolve(auth)),
};

const authenticators = {};

const Authentication = {
  registerAuthenticator: (method, authenticator) => {
    const auth = extend(true, {}, DEFAULT_AUTHENTICATOR, authenticator);
    authenticators[method] = auth;
  },

  computeAuthenticationHeaders: (auth) => {
    if (auth) {
      const authenticator = authenticators[auth.method];
      if (authenticator) {
        return authenticator.computeAuthenticationHeaders(auth);
      }
    }
    return {};
  },

  authenticateURL: (url, auth) => {
    if (auth) {
      const authenticator = authenticators[auth.method];
      if (authenticator) {
        return authenticator.authenticateURL(url, auth);
      }
    }
    return url;
  },

  canRefreshAuthentication: (auth) => {
    if (auth) {
      const authenticator = authenticators[auth.method];
      if (authenticator) {
        return authenticator.canRefreshAuthentication();
      }
    }
    return false;
  },

  refreshAuthentication: (baseURL, auth) => {
    if (auth) {
      const authenticator = authenticators[auth.method];
      if (authenticator) {
        return authenticator.refreshAuthentication(baseURL, auth);
      }
    }
    return new Promise((resolve) => resolve(auth));
  },
};

// default authenticators
const basicAuthenticator = {
  computeAuthenticationHeaders: (auth) => {
    const headers = {};
    if (auth.username && auth.password) {
      const base64 = btoa(`${auth.username}:${auth.password}`);
      const authorization = `Basic ${base64}`;
      headers.Authorization = authorization;
    }
    return headers;
  },

  authenticateURL: (url, auth) => {
    if (auth.username && auth.password) {
      return url.replace('://', `://${auth.username}:${auth.password}@`);
    }
    return url;
  },
};

const tokenAuthenticator = {
  computeAuthenticationHeaders: (auth) => {
    const headers = {};
    if (auth.token) {
      headers['X-Authentication-Token'] = auth.token;
    }
    return headers;
  },

  authenticateURL: (url, auth) => {
    if (auth.token) {
      return `${url}${url.indexOf('?') === -1 ? '?' : '&'}token=${auth.token}`;
    }
    return url;
  },
};

const bearerTokenAuthenticator = {
  computeAuthenticationHeaders: (auth) => {
    const headers = {};
    if (auth.token) {
      const accessToken = auth.token.access_token || auth.token;
      headers.Authorization = `Bearer ${accessToken}`;
    }
    return headers;
  },

  authenticateURL: (url, auth) => {
    if (auth.token) {
      const accessToken = auth.token.access_token || auth.token;
      return `${url}${url.indexOf('?') === -1 ? '?' : '&'}access_token=${accessToken}`;
    }
    return url;
  },

  canRefreshAuthentication: () => true,

  refreshAuthentication: (baseURL, auth) => (
    new Promise((resolve, reject) => {
      if (!auth.token.refresh_token || !auth.clientId) {
        return resolve(auth);
      }

      return oauth2.refreshAccessToken(baseURL, auth.clientId, auth.token.refresh_token)
        .then((token) => {
          const refreshedAuth = extend(true, {}, auth, { token });
          return resolve(refreshedAuth);
        })
        .catch((e) => reject(e));
    })
  ),
};

const random = Random.engines.mt19937().autoSeed();

const portalAuthenticator = {
  computeAuthenticationHeaders: (auth) => {
    const headers = {};
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
    return headers;
  },
};

Authentication.basicAuthenticator = basicAuthenticator;
Authentication.tokenAuthenticator = tokenAuthenticator;
Authentication.bearerTokenAuthenticator = bearerTokenAuthenticator;
Authentication.portalAuthenticator = portalAuthenticator;

module.exports = Authentication;
