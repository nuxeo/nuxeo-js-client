'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _base = require('../base');

var _base2 = _interopRequireDefault(_base);

var _group = require('./group');

var _group2 = _interopRequireDefault(_group);

var _join = require('../deps/utils/join');

var _join2 = _interopRequireDefault(_join);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var GROUP_PATH = 'group';

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

var Groups = function (_Base) {
  _inherits(Groups, _Base);

  /**
   * Creates a Groups object.
   * @param {object} opts - The configuration options.
   */

  function Groups() {
    var opts = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    _classCallCheck(this, Groups);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(Groups).call(this, opts));

    _this._nuxeo = opts.nuxeo;
    return _this;
  }

  /**
   * Fetches a group given a groupname.
   * @param {string} groupname - The groupname.
   * @param {object} opts - Options overriding the ones from the Request object.
   * @returns {Promise} A Promise object resolved with the {@link Group}.
   */


  _createClass(Groups, [{
    key: 'fetch',
    value: function fetch(groupname) {
      var _this2 = this;

      var opts = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      var path = (0, _join2.default)(GROUP_PATH, groupname);
      return this._nuxeo.request(path).headers(this._headers).timeout(this._timeout).httpTimeout(this._httpTimeout).transactionTimeout(this._transactionTimeout).get(opts).then(function (res) {
        return new _group2.default(res, {
          groups: _this2
        });
      });
    }

    /**
     * Creates a group.
     * @param {object} user - The group to be created.
     * @param {object} opts - Options overriding the ones from the Request object.
     * @returns {Promise} A Promise object resolved with the created {@link Group}.
     */

  }, {
    key: 'create',
    value: function create(group) {
      var _this3 = this;

      var opts = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      opts.body = {
        'entity-type': 'group',
        groupname: group.groupname,
        grouplabel: group.grouplabel,
        memberUsers: group.memberUsers,
        memberGroups: group.memberGroups
      };
      return this._nuxeo.request(GROUP_PATH).headers(this._headers).timeout(this._timeout).httpTimeout(this._httpTimeout).transactionTimeout(this._transactionTimeout).post(opts).then(function (res) {
        return new _group2.default(res, {
          groups: _this3
        });
      });
    }

    /**
     * Updates a group. Assumes that the group object has an groupname field.
     * @param {object} group - The group to be updated.
     * @param {object} opts - Options overriding the ones from the Request object.
     * @returns {Promise} A Promise object resolved with the updated {@link Group}.
     */

  }, {
    key: 'update',
    value: function update(group) {
      var _this4 = this;

      var opts = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      opts.body = {
        'entity-type': 'group',
        groupname: group.groupname,
        grouplabel: group.grouplabel,
        memberUsers: group.memberUsers,
        memberGroups: group.memberGroups
      };
      var path = (0, _join2.default)(GROUP_PATH, group.groupname);
      return this._nuxeo.request(path).headers(this._headers).timeout(this._timeout).httpTimeout(this._httpTimeout).transactionTimeout(this._transactionTimeout).put(opts).then(function (res) {
        return new _group2.default(res, {
          groups: _this4
        });
      });
    }

    /**
     * Deletes a group given a groupname.
     * @param {string} groupname - The groupname.
     * @param {object} opts - Options overriding the ones from the Request object.
     * @returns {Promise} A Promise object resolved with the result of the DELETE request.
     */

  }, {
    key: 'delete',
    value: function _delete(groupname) {
      var opts = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      var path = (0, _join2.default)(GROUP_PATH, groupname);
      return this._nuxeo.request(path).headers(this._headers).timeout(this._timeout).httpTimeout(this._httpTimeout).transactionTimeout(this._transactionTimeout).delete(opts);
    }
  }]);

  return Groups;
}(_base2.default);

exports.default = Groups;
module.exports = exports['default'];