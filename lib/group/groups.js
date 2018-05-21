const Base = require('../base');
const join = require('../deps/utils/join');

const GROUP_PATH = 'group';

/**
 * The `Groups` class allows to work with groups on a Nuxeo Platform instance.
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
 *    password: 'Administrator'
 *  }
 * });
 * nuxeo.groups()
 *   .fetch('administrators')
 *   .then(function(res) {
 *     // res.groupname === 'administrators'
 *     // res.grouplabel === 'Administrators group'
 *   })
 *   .catch(function(error) {
 *     throw new Error(error));
 *   });
 */

class Groups extends Base {
  /**
   * Creates a Groups object.
   * @param {object} opts - The configuration options.
   * @param {string} opts.nuxeo - The {@link Nuxeo} object linked to this Groups object.
   */
  constructor(opts) {
    super(opts);
    this._nuxeo = opts.nuxeo;
  }

  /**
   * Fetches a group given a groupname.
   * @param {string} groupname - The groupname.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A Promise object resolved with the {@link Group}.
   */
  fetch(groupname, opts = {}) {
    const options = this._computeOptions(opts);
    const path = join(GROUP_PATH, groupname);
    options.groups = this;
    return this._nuxeo.request(path)
      .get(options);
  }

  /**
   * Creates a group.
   * @param {object} user - The group to be created.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A Promise object resolved with the created {@link Group}.
   */
  create(group, opts = {}) {
    opts.body = {
      'entity-type': 'group',
      groupname: group.groupname,
      grouplabel: group.grouplabel,
      memberUsers: group.memberUsers,
      memberGroups: group.memberGroups,
    };
    const options = this._computeOptions(opts);
    options.groups = this;
    return this._nuxeo.request(GROUP_PATH)
      .post(options);
  }

  /**
   * Updates a group. Assumes that the group object has an groupname field.
   * @param {object} group - The group to be updated.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A Promise object resolved with the updated {@link Group}.
   */
  update(group, opts = {}) {
    const id = group.id || group.groupname;
    opts.body = {
      id,
      'entity-type': 'group',
      groupname: group.groupname,
      grouplabel: group.grouplabel,
      memberUsers: group.memberUsers,
      memberGroups: group.memberGroups,
    };
    const options = this._computeOptions(opts);
    const path = join(GROUP_PATH, group.groupname);
    options.groups = this;
    return this._nuxeo.request(path)
      .put(options);
  }

  /**
   * Deletes a group given a groupname.
   * @param {string} groupname - The groupname.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A Promise object resolved with the result of the DELETE request.
   */
  delete(groupname, opts = {}) {
    const options = this._computeOptions(opts);
    const path = join(GROUP_PATH, groupname);
    return this._nuxeo.request(path)
      .delete(options);
  }
}

module.exports = Groups;
