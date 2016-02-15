'use strict';

import Base from '../base';
import User from './user';
import join from '../deps/utils/join';

const USER_PATH = 'user';

/**
 * The `Users` class allows to work with users on a Nuxeo Platform instance.
 *
 * **Cannot directly be instantiated**
 *
 * @example
 * var Nuxeo = require('nuxeo')
 * var nuxeo = new Nuxeo({
 *  baseUrl: 'http://localhost:8080/nuxeo',
 *  auth: {
 *    username: 'Administrator',
 *    password: 'Administrator',
 *  }
 * });
 * nuxeo.users()
 *   .fetch('Administrator').then((res) => {
 *     // res.id === 'Administrator'
 *     // res.properties.username === 'Administrator'
 *   }).catch(error => throw new Error(error));
 */
class Users extends Base {
  /**
   * Creates a Users object.
   * @param {object} opts - The configuration options.
   */
  constructor(opts = {}) {
    super(opts);
    this._nuxeo = opts.nuxeo;
  }

  /**
   * Fetches an user given an username.
   * @param {string} username - The username.
   * @param {object} opts - Options overriding the ones from the Request object.
   * @returns {Promise} A Promise object resolved with the {@link User}.
   */
  fetch(username, opts = {}) {
    const path = join(USER_PATH, username);
    return this._nuxeo.request(path)
      .headers(this._headers)
      .timeout(this._timeout)
      .httpTimeout(this._httpTimeout)
      .transactionTimeout(this._transactionTimeout)
      .get(opts)
      .then((res) => {
        return new User(res, {
          nuxeo: this._nuxeo,
        });
      });
  }

  /**
   * Creates an user.
   * @param {object} user - The user to be created.
   * @param {object} opts - Options overriding the ones from the Request object.
   * @returns {Promise} A Promise object resolved with the created {@link User}.
   */
  create(user, opts = {}) {
    opts.body = {
      'entity-type': 'user',
      properties: user.properties,
    };
    return this._nuxeo.request(USER_PATH)
      .headers(this._headers)
      .timeout(this._timeout)
      .httpTimeout(this._httpTimeout)
      .transactionTimeout(this._transactionTimeout)
      .post(opts)
      .then((res) => {
        return new User(res, {
          nuxeo: this._nuxeo,
        });
      });
  }

  /**
   * Updates an user. Assumes that the user object has an id field.
   * @param {object} user - The user to be updated.
   * @param {object} opts - Options overriding the ones from the Request object.
   * @returns {Promise} A Promise object resolved with the updated {@link User}.
   */
  update(user, opts = {}) {
    opts.body = {
      'entity-type': 'user',
      id: user.id,
      properties: user.properties,
    };
    const path = join(USER_PATH, user.id);
    return this._nuxeo.request(path)
      .headers(this._headers)
      .timeout(this._timeout)
      .httpTimeout(this._httpTimeout)
      .transactionTimeout(this._transactionTimeout)
      .put(opts)
      .then((res) => {
        return new User(res, {
          nuxeo: this._nuxeo,
        });
      });
  }

  /**
   * Deletes an user given an username.
   * @param {string} username - The username.
   * @param {object} opts - Options overriding the ones from the Request object.
   * @returns {Promise} A Promise object resolved with the result of the DELETE request.
   */
  delete(username, opts = {}) {
    const path = join(USER_PATH, username);
    return this._nuxeo.request(path)
      .headers(this._headers)
      .timeout(this._timeout)
      .httpTimeout(this._httpTimeout)
      .transactionTimeout(this._transactionTimeout)
      .delete(opts);
  }
}

export default Users;
