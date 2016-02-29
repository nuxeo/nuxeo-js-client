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
 * The `Group` class wraps a group.
 *
 * **Cannot directly be instantiated**
 */

var Group = function () {
  /**
   * Creates a Group.
   * @param {object} group - The initial group object. This Group object will be extended with group properties.
   * @param {object} opts - The configuration options.
   * @param {string} opts.groups - The {@link Groups} object linked to this group.
   */

  function Group(group, opts) {
    _classCallCheck(this, Group);

    this._groups = opts.groups;
    (0, _extend2.default)(true, this, group);
  }

  /**
   * Saves the group.
   * @param {object} opts - Options overriding the ones from the Group object.
   * @returns {Promise} A promise object resolved with the updated group.
   */


  _createClass(Group, [{
    key: 'save',
    value: function save(opts) {
      return this._groups.update({
        'entity-type': 'group',
        groupname: this.groupname,
        grouplabel: this.grouplabel,
        memberUsers: this.memberUsers,
        memberGroups: this.memberGroups
      }, opts);
    }
  }]);

  return Group;
}();

exports.default = Group;
module.exports = exports['default'];