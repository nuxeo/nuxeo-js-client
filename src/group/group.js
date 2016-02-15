'use strict';

import extend from 'extend';

/**
 * The `Group` class wraps a group.
 *
 * **Cannot directly be instantiated**
 */
class Group {
  /**
   * Creates a Group.
   * @param {object} group - The initial group object. This Group object will be extended with group properties.
   * @param {object} opts - The configuration options.
   * @param {string} opts.nuxeo - The {@link Nuxeo} object linked to this group.
   */
  constructor(group, opts) {
    this._nuxeo = opts.nuxeo;
    extend(true, this, group);
  }

  /**
   * Saves the group.
   * @param {object} opts - Options overriding the ones from the Group object.
   * @returns {Promise} A promise object resolved with the updated group.
   */
  save(opts) {
    return this._nuxeo.group.update({
      'entity-type': 'group',
      groupname: this.groupname,
      grouplabel: this.grouplabel,
      memberUsers: this.memberUsers,
      memberGroups: this.memberGroups,
    }, opts);
  }
}

export default Group;
