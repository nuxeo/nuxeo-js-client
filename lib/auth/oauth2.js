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
   * @param {string} [baseURL] - Base URL of the Nuxeo Platform.
   * @param {string} [clientId] - The OAuth2 client id.
   * @param {string} [code] - An authorization code.
   * @param {object} [params] - Optional parameters such as `redirect_uri`.
   * @returns {string}
   */
  fetchAccessToken: (baseURL, clientId, code, params = {}) => {
    if (!baseURL) {
      throw new Error('Missing `baseURL` argument');
    }
    if (!clientId) {
      throw new Error('Missing `clientId` argument');
    }
    if (!code) {
      throw new Error('Missing `code` argument');
    }

    const defaultParams = { code, grant_type: 'authorization_code', client_id: clientId };
    const body = extend(true, defaultParams, params);
    return fetchAccessToken(baseURL, body);
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
