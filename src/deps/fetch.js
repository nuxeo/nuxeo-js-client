'use strict';

require('isomorphic-fetch');

import extend from 'extend';
import Promise from './promise';
import queryString from 'query-string';
import FormData from './form-data';
import computeAuthentication from './auth';

const DEFAULT_OPTS = {
  method: 'GET',
  headers: {},
  json: true,
  timeout: 30000,
  cache: false,
  resolveWithFullResponse: false,
};

export default function doFetch(opts) {
  let options = extend(true, {}, DEFAULT_OPTS, opts);
  options = computeAuthentication(options);

  const transactionTimeout = options.transactionTimeout || options.timeout;
  const httpTimeout = options.httpTimeout || (5 + transactionTimeout);
  options.headers['Nuxeo-Transaction-Timeout'] = transactionTimeout;
  options.timeout = httpTimeout;
  delete options.transactionTimeout;
  delete options.httpTimeout;

  if (options.json) {
    options.headers.Accept = 'application/json';
    options.headers['Content-Type'] = options.headers['Content-Type'] || 'application/json';
    // do not stringify FormData
    if (typeof options.body === 'object' && !(options.body instanceof FormData)) {
      options.body = JSON.stringify(options.body);
    }
  }

  if (options.method === 'GET') {
    delete options.headers['Content-Type'];
  }

  let url = options.url;
  if (options.queryParams) {
    url += queryString.stringify(options.queryParams);
  }

  return new Promise((resolve, reject) => {
    fetch(url, {
      method: options.method,
      headers: options.headers,
      body: options.body,
      credentials: 'include',
    }).then((res) => {
      if (!(/^2/.test('' + res.status))) {
        const error = new Error(res.statusText);
        error.response = res;
        return reject(error);
      }

      if (options.resolveWithFullResponse || res.status === 204) {
        return resolve(res);
      }

      const contentType = res.headers.get('content-type');
      if (contentType && contentType.indexOf('application/json') === 0) {
        return resolve(res.json());
      }
      return resolve(res);
    }).catch(error => reject(error));
  });
}
