const extend = require('extend');
const qs = require('querystring');

const doFetch = require('../deps/fetch');
const Promise = require('../deps/promise');

const fetchAccessToken = (baseURL, body) => {
  const url = baseURL.endsWith('/') ? baseURL : `${baseURL}/`;
  return new Promise((resolve, reject) => (
    doFetch(`${url}/oauth2/token`, {
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

const oauth2 = {

  /**
   * Returns the OAuth2 authorization URL.
   * @param {string} [baseURL] - Base URL of the Nuxeo Platform.
   * @param {string} [clientId] - The OAuth2 client id.
   * @param {object} [opts] - Optional query parameters such as `state`, `redirect_uri`.
   * @returns {string}
   */
  getAuthorizationURL: (baseURL, clientId, params = {}) => {
    if (!baseURL) {
      throw new Error('Missing `baseURL` argument');
    }
    if (!clientId) {
      throw new Error('Missing `clientId` argument');
    }

    const queryParams = extend(true,
      { client_id: clientId, response_type: 'code' }, params);
    const url = baseURL.endsWith('/') ? baseURL : `${baseURL}/`;
    return `${url}oauth2/authorize?${qs.stringify(queryParams)}`;
  },

  /**
   * Fetches an OAuth2 access token.
   * @param {string} baseURL - Base URL of the Nuxeo Platform.
   * @param {string} clientId - The OAuth2 client id.
   * @param {string} [code] - An authorization code. Deprecated since 3.16.0, use other helper methods instead.
   * @param {object} [params] - Optional parameters such as `redirect_uri`.
   * @returns {string}
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
   * @param {string} baseURL - Base URL of the Nuxeo Platform.
   * @param {string} clientId - The OAuth2 client id.
   * @param {string} code - An authorization code.
   * @param {object} [params] - Optional parameters such as `redirect_uri`.
   * @returns {string}
   */
  fetchAccessTokenFromAuthorizationCode: (baseURL, clientId, code, params = {}) => {
    if (!code) {
      throw new Error('Missing `code` argument');
    }

    const finalParams = extend(true, {
      code, grant_type: 'authorization_code',
    }, params);
    return oauth2.fetchAccessToken(baseURL, clientId, finalParams);
  },

  /**
   * Fetches an OAuth2 access token from a JWT token.
   * @param {string} baseURL - Base URL of the Nuxeo Platform.
   * @param {string} clientId - The OAuth2 client id.
   * @param {string} jwtToken - A JWT token.
   * @param {object} [params] - Optional parameters such as `redirect_uri`.
   * @returns {string}
   */
  fetchAccessTokenFromJWTToken: (baseURL, clientId, jwtToken, params = {}) => {
    if (!jwtToken) {
      throw new Error('Missing `jwtToken` argument');
    }

    const finalParams = extend(true, {
      assertion: jwtToken, grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    }, params);
    return oauth2.fetchAccessToken(baseURL, clientId, finalParams);
  },

  /**
   * Refreshes an OAuth2 access token.
   * @param {string} [baseURL] - Base URL of the Nuxeo Platform.
   * @param {string} [clientId] - The OAuth2 client id.
   * @param {string} [refreshToken] - A refresh token.
   * @param {object} [params] - Optional parameters.
   * @returns {string}
   */
  refreshAccessToken: (baseURL, clientId, refreshToken, params = {}) => {
    if (!baseURL) {
      throw new Error('Missing `baseURL` argument');
    }
    if (!clientId) {
      throw new Error('Missing `clientId` argument');
    }
    if (!refreshToken) {
      throw new Error('Missing `refreshToken` argument');
    }

    const defaultParams = { refresh_token: refreshToken, grant_type: 'refresh_token', client_id: clientId };
    const body = extend(true, defaultParams, params);
    return fetchAccessToken(baseURL, body);
  },
};

module.exports = oauth2;
