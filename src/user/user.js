'use strict';

import extend from 'extend';

/**
 * The `User` class wraps an user.
 *
 * **Cannot directly be instantiated**
 */
class User {
  /**
   * Creates a User.
   * @param {object} user - The initial user object. This User object will be extended with user properties.
   * @param {object} opts - The configuration options.
   * @param {string} opts.users - The {@link Users} object linked to this user.
   */
  constructor(user, opts) {
    this._users = opts.users;
    this.properties = {};
    this._dirtyProperties = {};
    extend(true, this, user);
  }

  /**
   * Sets user properties.
   * @param {object} properties - The properties to set.
   * @returns {User}
   *
   * @example
   * user.set({
   *   'firstName': 'new first name',
   *   'company': 'new company',
   * });
   */
  set(properties) {
    this._dirtyProperties = extend(true, {}, this._dirtyProperties, properties);
    return this;
  }

  /**
   * Gets a user property.
   * @param {string} propertyName - The property name, such as 'fistName', 'email', ...
   * @returns {User}
   */
  get(propertyName) {
    return this._dirtyProperties[propertyName] || this.properties[propertyName];
  }

  /**
   * Saves the user. It updates only the 'dirty properties' set through the {@link User#set} method.
   * @param {object} opts - Options overriding the ones from the User object.
   * @returns {Promise} A promise object resolved with the updated user.
   */
  save(opts) {
    return this._users.update({
      id: this.id,
      properties: this._dirtyProperties,
    }, opts);
  }
}

export default User;
