const extend = require('extend');
const qs = require('querystring');

const doFetch = require('../deps/fetch');
const Promise = require('../deps/promise');

const fetchAccessToken = (baseURL, body) => {
  const url = baseURL.endsWith('/') ? baseURL : `${baseURL}/`;
  return new Promise((resolve, reject) => (
    doFetch(`${url}oauth2/token`, {
      method: 'POST',
      body: qs.stringify(body),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
      .then((res) => res.json())
      .then((token) => {
        if (token.error) {
          return reject(token.error);
        }
        return resolve(token);
      })
      .catch((e) => reject(e))
  ));
};

// compatibility method to extract code and params arguments if any
const extractCodeParams = (args) => {
  switch (args.length) {
    case 0:
      // no code nor params
      return { params: {} };
    case 1:
      // only params
      return { params: args[0] };
    case 2:
    default:
      // 2 or more arguments...
      return { code: args[0], params: args[1] };
  }
};

const validateOptions = (opts) => {
  if (!opts.baseURL) {
    throw new Error('Missing `baseURL` argument');
  }
  if (!opts.clientId) {
    throw new Error('Missing `clientId` argument');
  }
};

const computeClientParams = (opts) => {
  const params = { client_id: opts.clientId };
  if (opts.clientSecret) {
    params.client_secret = opts.clientSecret;
  }
  return extend(true, params, opts.params);
};

const oauth2 = {

  /**
   * Returns the OAuth2 authorization URL.
   * @param {string} opts - The configuration options.
   * @param {string} opts.baseURL - Base URL of the Nuxeo Platform.
   * @param {string} opts.clientId - The OAuth2 client id.
   * @param {string} [opts.clientSecret] - Optional OAuth2 client secret.
   * @param {object} [opts.params] - Optional query parameters such as `state`, `redirect_uri`.
   * @returns {string}
   */
  getAuthorizationURL: (...args) => {
    // handle compat with old args
    const opts = args.length === 1 ? args[0] : {
      baseURL: args[0],
      clientId: args[1],
      params: args[2],
    };

    validateOptions(opts);

    const params = computeClientParams(opts);
    const finalParams = extend(true, { response_type: 'code' }, params);
    const url = opts.baseURL.endsWith('/') ? opts.baseURL : `${opts.baseURL}/`;
    return `${url}oauth2/authorize?${qs.stringify(finalParams)}`;
  },

  /**
   * Fetches an OAuth2 access token.
   * @param {string} baseURL - Base URL of the Nuxeo Platform.
   * @param {string} clientId - The OAuth2 client id.
   * @param {string} [code] - An authorization code. Deprecated since 3.16.0, use other helper methods instead.
   * @param {object} [params] - Optional parameters such as `redirect_uri`.
   * @returns {string}
   * @deprecated since 3.16.0, use other helper methods instead.
   */
  fetchAccessToken: (baseURL, clientId, ...args) => {
    if (!baseURL) {
      throw new Error('Missing `baseURL` argument');
    }
    if (!clientId) {
      throw new Error('Missing `clientId` argument');
    }

    // for backward compatibility if `code` is still provided
    const { code, params } = extractCodeParams(args);
    const defaultParams = code ? { code, grant_type: 'authorization_code' } : {};

    const body = extend(true, { client_id: clientId }, defaultParams, params);
    return fetchAccessToken(baseURL, body);
  },

  /**
   * Fetches an OAuth2 access token from an authorization code.
   * @param {string} opts - The configuration options.
   * @param {string} opts.baseURL - Base URL of the Nuxeo Platform.
   * @param {string} opts.clientId - The OAuth2 client id.
   * @param {string} [opts.clientSecret] - Optional OAuth2 client secret.
   * @param {string} opts.code - An authorization code.
   * @param {object} [opts.params] - Optional query parameters such as `state`, `redirect_uri`.
   * @returns {string}
   */
  fetchAccessTokenFromAuthorizationCode: (...args) => {
    // handle compat with old args
    const opts = args.length === 1 ? args[0] : {
      baseURL: args[0],
      clientId: args[1],
      code: args[2],
      params: args[3],
    };

    validateOptions(opts);
    if (!opts.code) {
      throw new Error('Missing `code` argument');
    }

    const params = computeClientParams(opts);
    const finalParams = extend(true, { code: opts.code, grant_type: 'authorization_code' }, params);
    return fetchAccessToken(opts.baseURL, finalParams);
  },

  /**
   * Fetches an OAuth2 access token from a JWT token.
   * @param {string} opts - The configuration options.
   * @param {string} opts.baseURL - Base URL of the Nuxeo Platform.
   * @param {string} opts.clientId - The OAuth2 client id.
   * @param {string} [opts.clientSecret] - Optional OAuth2 client secret.
   * @param {string} opts.jwtToken - A JWT token.
   * @param {object} [opts.params] - Optional query parameters such as `state`, `redirect_uri`.
   * @returns {string}
   */
  fetchAccessTokenFromJWTToken: (...args) => {
    // handle compat with old args
    const opts = args.length === 1 ? args[0] : {
      baseURL: args[0],
      clientId: args[1],
      jwtToken: args[2],
      params: args[3],
    };

    validateOptions(opts);
    if (!opts.jwtToken) {
      throw new Error('Missing `jwtToken` argument');
    }

    const params = computeClientParams(opts);
    const finalParams = extend(true,
      { assertion: opts.jwtToken, grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer' }, params);
    return fetchAccessToken(opts.baseURL, finalParams);
  },

  /**
   * Refreshes an OAuth2 access token.
   * @param {string} opts - The configuration options.
   * @param {string} opts.baseURL - Base URL of the Nuxeo Platform.
   * @param {string} opts.clientId - The OAuth2 client id.
   * @param {string} [opts.clientSecret] - Optional OAuth2 client secret.
   * @param {string} opts.refreshToken - A refresh token.
   * @param {object} [opts.params] - Optional query parameters such as `state`, `redirect_uri`.
   * @returns {string}
   */
  refreshAccessToken: (...args) => {
    // handle compat with old args
    const opts = args.length === 1 ? args[0] : {
      baseURL: args[0],
      clientId: args[1],
      refreshToken: args[2],
      params: args[3],
    };

    validateOptions(opts);
    if (!opts.refreshToken) {
      throw new Error('Missing `refreshToken` argument');
    }

    const params = computeClientParams(opts);
    const finalParams = extend(true,
      { refresh_token: opts.refreshToken, grant_type: 'refresh_token' }, params);
    return fetchAccessToken(opts.baseURL, finalParams);
  },
};

module.exports = oauth2;
