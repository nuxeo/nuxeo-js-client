"use strict";

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

var Base = require('../base');

var join = require('../deps/utils/join');

var GROUP_PATH = 'group';
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

var Groups =
/*#__PURE__*/
function (_Base) {
  _inherits(Groups, _Base);

  /**
   * Creates a Groups object.
   * @param {object} opts - The configuration options.
   * @param {string} opts.nuxeo - The {@link Nuxeo} object linked to this Groups object.
   */
  function Groups(opts) {
    var _this;

    _classCallCheck(this, Groups);

    _this = _possibleConstructorReturn(this, _getPrototypeOf(Groups).call(this, opts));
    _this._nuxeo = opts.nuxeo;
    return _this;
  }
  /**
   * Fetches a group given a groupname.
   * @param {string} groupname - The groupname.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A Promise object resolved with the {@link Group}.
   */


  _createClass(Groups, [{
    key: "fetch",
    value: function fetch(groupname) {
      var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      var options = this._computeOptions(opts);

      var path = join(GROUP_PATH, groupname);
      options.groups = this;
      return this._nuxeo.request(path).get(options);
    }
    /**
     * Creates a group.
     * @param {object} user - The group to be created.
     * @param {object} [opts] - Options overriding the ones from this object.
     * @returns {Promise} A Promise object resolved with the created {@link Group}.
     */

  }, {
    key: "create",
    value: function create(group) {
      var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      opts.body = {
        'entity-type': 'group',
        groupname: group.groupname,
        grouplabel: group.grouplabel,
        memberUsers: group.memberUsers,
        memberGroups: group.memberGroups
      };

      var options = this._computeOptions(opts);

      options.groups = this;
      return this._nuxeo.request(GROUP_PATH).post(options);
    }
    /**
     * Updates a group. Assumes that the group object has an groupname field.
     * @param {object} group - The group to be updated.
     * @param {object} [opts] - Options overriding the ones from this object.
     * @returns {Promise} A Promise object resolved with the updated {@link Group}.
     */

  }, {
    key: "update",
    value: function update(group) {
      var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      var id = group.id || group.groupname;
      opts.body = {
        id: id,
        'entity-type': 'group',
        groupname: group.groupname,
        grouplabel: group.grouplabel,
        memberUsers: group.memberUsers,
        memberGroups: group.memberGroups
      };

      var options = this._computeOptions(opts);

      var path = join(GROUP_PATH, group.groupname);
      options.groups = this;
      return this._nuxeo.request(path).put(options);
    }
    /**
     * Deletes a group given a groupname.
     * @param {string} groupname - The groupname.
     * @param {object} [opts] - Options overriding the ones from this object.
     * @returns {Promise} A Promise object resolved with the result of the DELETE request.
     */

  }, {
    key: "delete",
    value: function _delete(groupname) {
      var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      var options = this._computeOptions(opts);

      var path = join(GROUP_PATH, groupname);
      return this._nuxeo.request(path).delete(options);
    }
  }]);

  return Groups;
}(Base);

module.exports = Groups;