'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _extend = require('extend');

var _extend2 = _interopRequireDefault(_extend);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * The `User` class wraps an user.
 *
 * **Cannot directly be instantiated**
 */

var User = function () {
  /**
   * Creates a User.
   * @param {object} user - The initial user object. This User object will be extended with user properties.
   * @param {object} opts - The configuration options.
   * @param {string} opts.users - The {@link Users} object linked to this user.
   */

  function User(user, opts) {
    _classCallCheck(this, User);

    this._users = opts.users;
    this.properties = {};
    this._dirtyProperties = {};
    (0, _extend2.default)(true, this, user);
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


  _createClass(User, [{
    key: 'set',
    value: function set(properties) {
      this._dirtyProperties = (0, _extend2.default)(true, {}, this._dirtyProperties, properties);
      return this;
    }

    /**
     * Gets a user property.
     * @param {string} propertyName - The property name, such as 'fistName', 'email', ...
     * @returns {User}
     */

  }, {
    key: 'get',
    value: function get(propertyName) {
      return this._dirtyProperties[propertyName] || this.properties[propertyName];
    }

    /**
     * Saves the user. It updates only the 'dirty properties' set through the {@link User#set} method.
     * @param {object} opts - Options overriding the ones from the User object.
     * @returns {Promise} A promise object resolved with the updated user.
     */

  }, {
    key: 'save',
    value: function save(opts) {
      return this._users.update({
        id: this.id,
        properties: this._dirtyProperties
      }, opts);
    }
  }]);

  return User;
}();

exports.default = User;
module.exports = exports['default'];