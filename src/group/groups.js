'use strict';

import Base from '../base';
import Group from './group';
import join from '../deps/utils/join';

const GROUP_PATH = 'group';

/**
 * The `Groups` class allows to work with groups on a Nuxeo Platform instance.
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
 * nuxeo.groups()
 *   .fetch('administrators').then((res) => {
 *     // res.groupname === 'administrators'
 *     // res.grouplabel === 'Administrators group'
 *   }).catch(error => throw new Error(error));
 */

class Groups extends Base {
  /**
   * Creates a Groups object.
   * @param {object} opts - The configuration options.
   */
  constructor(opts = {}) {
    super(opts);
    this._nuxeo = opts.nuxeo;
  }

  /**
   * Fetches a group given a groupname.
   * @param {string} groupname - The groupname.
   * @param {object} opts - Options overriding the ones from the Request object.
   * @returns {Promise} A Promise object resolved with the {@link Group}.
   */
  fetch(groupname, opts = {}) {
    const path = join(GROUP_PATH, groupname);
    return this._nuxeo.request(path)
      .headers(this._headers)
      .timeout(this._timeout)
      .httpTimeout(this._httpTimeout)
      .transactionTimeout(this._transactionTimeout)
      .get(opts)
      .then((res) => {
        return new Group(res, {
          groups: this,
        });
      });
  }

  /**
   * Creates a group.
   * @param {object} user - The group to be created.
   * @param {object} opts - Options overriding the ones from the Request object.
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
    return this._nuxeo.request(GROUP_PATH)
      .headers(this._headers)
      .timeout(this._timeout)
      .httpTimeout(this._httpTimeout)
      .transactionTimeout(this._transactionTimeout)
      .post(opts)
      .then((res) => {
        return new Group(res, {
          groups: this,
        });
      });
  }

  /**
   * Updates a group. Assumes that the group object has an groupname field.
   * @param {object} group - The group to be updated.
   * @param {object} opts - Options overriding the ones from the Request object.
   * @returns {Promise} A Promise object resolved with the updated {@link Group}.
   */
  update(group, opts = {}) {
    opts.body = {
      'entity-type': 'group',
      groupname: group.groupname,
      grouplabel: group.grouplabel,
      memberUsers: group.memberUsers,
      memberGroups: group.memberGroups,
    };
    const path = join(GROUP_PATH, group.groupname);
    return this._nuxeo.request(path)
      .headers(this._headers)
      .timeout(this._timeout)
      .httpTimeout(this._httpTimeout)
      .transactionTimeout(this._transactionTimeout)
      .put(opts)
      .then((res) => {
        return new Group(res, {
          groups: this,
        });
      });
  }

  /**
   * Deletes a group given a groupname.
   * @param {string} groupname - The groupname.
   * @param {object} opts - Options overriding the ones from the Request object.
   * @returns {Promise} A Promise object resolved with the result of the DELETE request.
   */
  delete(groupname, opts = {}) {
    const path = join(GROUP_PATH, groupname);
    return this._nuxeo.request(path)
      .headers(this._headers)
      .timeout(this._timeout)
      .httpTimeout(this._httpTimeout)
      .transactionTimeout(this._transactionTimeout)
      .delete(opts);
  }
}

export default Groups;
