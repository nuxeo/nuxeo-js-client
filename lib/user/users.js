const Base = require('../base');
const join = require('../deps/utils/join');

const USER_PATH = 'user';

/**
 * The `Users` class allows to work with users on a Nuxeo Platform instance.
 *
 * **Cannot directly be instantiated**
 *
 * @example
 * var Nuxeo = require('nuxeo')
 * var nuxeo = new Nuxeo({
 *  baseURL: 'http://localhost:8080/nuxeo',
 *  auth: {
 *    method: 'basic',
 *    username: 'Administrator',
 *    password: 'Administrator',
 *  }
 * });
 * nuxeo.users()
 *   .fetch('Administrator')
 *   .then(function(res) => {
 *     // res.id === 'Administrator'
 *     // res.properties.username === 'Administrator'
 *   })
 *   .catch(function(error) {
 *     throw new Error(error);
 *   });
 */
class Users extends Base {
  /**
   * Creates a Users object.
   * @param {object} opts - The configuration options.
   * @param {string} opts.nuxeo - The {@link Nuxeo} object linked to this Users object.
   */
  constructor(opts) {
    super(opts);
    this._nuxeo = opts.nuxeo;
  }

  /**
   * Fetches an user given an username.
   * @param {string} username - The username.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A Promise object resolved with the {@link User}.
   */
  fetch(username, opts = {}) {
    const options = this._computeOptions(opts);
    const path = join(USER_PATH, username);
    options.users = this;
    return this._nuxeo.request(path)
      .get(options);
  }

  /**
   * Creates an user.
   * @param {object} user - The user to be created.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A Promise object resolved with the created {@link User}.
   */
  create(user, opts = {}) {
    opts.body = {
      ...user,
      'entity-type': 'user',
    };
    const options = this._computeOptions(opts);
    options.users = this;
    return this._nuxeo.request(USER_PATH)
      .post(options);
  }

  /**
   * Updates an user. Assumes that the user object has an id field.
   * @param {object} user - The user to be updated.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A Promise object resolved with the updated {@link User}.
   */
  update(user, opts = {}) {
    opts.body = {
      ...user,
      'entity-type': 'user',
    };
    const options = this._computeOptions(opts);
    const path = join(USER_PATH, user.id);
    options.users = this;
    return this._nuxeo.request(path)
      .put(options);
  }

  /**
   * Deletes an user given an username.
   * @param {string} username - The username.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A Promise object resolved with the result of the DELETE request.
   */
  delete(username, opts = {}) {
    const options = this._computeOptions(opts);
    const path = join(USER_PATH, username);
    return this._nuxeo.request(path)
      .delete(options);
  }
}

module.exports = Users;
