"use strict";

var extend = require('extend');

var qs = require('querystring');

var doFetch = require('../deps/fetch');

var Promise = require('../deps/promise');

var _fetchAccessToken = function fetchAccessToken(baseURL, body) {
  var url = baseURL.endsWith('/') ? baseURL : "".concat(baseURL, "/");
  return new Promise(function (resolve, reject) {
    return doFetch("".concat(url, "/oauth2/token"), {
      method: 'POST',
      body: qs.stringify(body),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }).then(function (res) {
      return res.json();
    }).then(function (token) {
      if (token.error) {
        return reject(token.error);
      }

      return resolve(token);
    }).catch(function (e) {
      return reject(e);
    });
  });
}; // compatibility method to extract code and params arguments if any


var extractCodeParams = function extractCodeParams(args) {
  switch (args.length) {
    case 0:
      // no code nor params
      return {
        params: {}
      };

    case 1:
      // only params
      return {
        params: args[0]
      };

    case 2:
    default:
      // 2 or more arguments...
      return {
        code: args[0],
        params: args[1]
      };
  }
};

var oauth2 = {
  /**
   * Returns the OAuth2 authorization URL.
   * @param {string} [baseURL] - Base URL of the Nuxeo Platform.
   * @param {string} [clientId] - The OAuth2 client id.
   * @param {object} [opts] - Optional query parameters such as `state`, `redirect_uri`.
   * @returns {string}
   */
  getAuthorizationURL: function getAuthorizationURL(baseURL, clientId) {
    var params = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

    if (!baseURL) {
      throw new Error('Missing `baseURL` argument');
    }

    if (!clientId) {
      throw new Error('Missing `clientId` argument');
    }

    var queryParams = extend(true, {
      client_id: clientId,
      response_type: 'code'
    }, params);
    var url = baseURL.endsWith('/') ? baseURL : "".concat(baseURL, "/");
    return "".concat(url, "oauth2/authorize?").concat(qs.stringify(queryParams));
  },

  /**
   * Fetches an OAuth2 access token.
   * @param {string} baseURL - Base URL of the Nuxeo Platform.
   * @param {string} clientId - The OAuth2 client id.
   * @param {string} [code] - An authorization code. Deprecated since 3.16.0, use other helper methods instead.
   * @param {object} [params] - Optional parameters such as `redirect_uri`.
   * @returns {string}
   */
  fetchAccessToken: function fetchAccessToken(baseURL, clientId) {
    if (!baseURL) {
      throw new Error('Missing `baseURL` argument');
    }

    if (!clientId) {
      throw new Error('Missing `clientId` argument');
    } // for backward compatibility if `code` is still provided


    for (var _len = arguments.length, args = new Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
      args[_key - 2] = arguments[_key];
    }

    var _extractCodeParams = extractCodeParams(args),
        code = _extractCodeParams.code,
        params = _extractCodeParams.params;

    var defaultParams = code ? {
      code: code,
      grant_type: 'authorization_code'
    } : {};
    var body = extend(true, {
      client_id: clientId
    }, defaultParams, params);
    return _fetchAccessToken(baseURL, body);
  },

  /**
   * Fetches an OAuth2 access token from an authorization code.
   * @param {string} baseURL - Base URL of the Nuxeo Platform.
   * @param {string} clientId - The OAuth2 client id.
   * @param {string} code - An authorization code.
   * @param {object} [params] - Optional parameters such as `redirect_uri`.
   * @returns {string}
   */
  fetchAccessTokenFromAuthorizationCode: function fetchAccessTokenFromAuthorizationCode(baseURL, clientId, code) {
    var params = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};

    if (!code) {
      throw new Error('Missing `code` argument');
    }

    var finalParams = extend(true, {
      code: code,
      grant_type: 'authorization_code'
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
  fetchAccessTokenFromJWTToken: function fetchAccessTokenFromJWTToken(baseURL, clientId, jwtToken) {
    var params = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};

    if (!jwtToken) {
      throw new Error('Missing `jwtToken` argument');
    }

    var finalParams = extend(true, {
      assertion: jwtToken,
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer'
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
  refreshAccessToken: function refreshAccessToken(baseURL, clientId, refreshToken) {
    var params = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};

    if (!baseURL) {
      throw new Error('Missing `baseURL` argument');
    }

    if (!clientId) {
      throw new Error('Missing `clientId` argument');
    }

    if (!refreshToken) {
      throw new Error('Missing `refreshToken` argument');
    }

    var defaultParams = {
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
      client_id: clientId
    };
    var body = extend(true, defaultParams, params);
    return _fetchAccessToken(baseURL, body);
  }
};
module.exports = oauth2;