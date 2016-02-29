'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _base = require('../base');

var _base2 = _interopRequireDefault(_base);

var _user = require('./user');

var _user2 = _interopRequireDefault(_user);

var _join = require('../deps/utils/join');

var _join2 = _interopRequireDefault(_join);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var USER_PATH = 'user';

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

var Users = function (_Base) {
  _inherits(Users, _Base);

  /**
   * Creates a Users object.
   * @param {object} opts - The configuration options.
   */

  function Users() {
    var opts = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    _classCallCheck(this, Users);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(Users).call(this, opts));

    _this._nuxeo = opts.nuxeo;
    return _this;
  }

  /**
   * Fetches an user given an username.
   * @param {string} username - The username.
   * @param {object} opts - Options overriding the ones from the Request object.
   * @returns {Promise} A Promise object resolved with the {@link User}.
   */


  _createClass(Users, [{
    key: 'fetch',
    value: function fetch(username) {
      var _this2 = this;

      var opts = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      var path = (0, _join2.default)(USER_PATH, username);
      return this._nuxeo.request(path).headers(this._headers).timeout(this._timeout).httpTimeout(this._httpTimeout).transactionTimeout(this._transactionTimeout).get(opts).then(function (res) {
        return new _user2.default(res, {
          users: _this2
        });
      });
    }

    /**
     * Creates an user.
     * @param {object} user - The user to be created.
     * @param {object} opts - Options overriding the ones from the Request object.
     * @returns {Promise} A Promise object resolved with the created {@link User}.
     */

  }, {
    key: 'create',
    value: function create(user) {
      var _this3 = this;

      var opts = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      opts.body = {
        'entity-type': 'user',
        properties: user.properties
      };
      return this._nuxeo.request(USER_PATH).headers(this._headers).timeout(this._timeout).httpTimeout(this._httpTimeout).transactionTimeout(this._transactionTimeout).post(opts).then(function (res) {
        return new _user2.default(res, {
          users: _this3
        });
      });
    }

    /**
     * Updates an user. Assumes that the user object has an id field.
     * @param {object} user - The user to be updated.
     * @param {object} opts - Options overriding the ones from the Request object.
     * @returns {Promise} A Promise object resolved with the updated {@link User}.
     */

  }, {
    key: 'update',
    value: function update(user) {
      var _this4 = this;

      var opts = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      opts.body = {
        'entity-type': 'user',
        id: user.id,
        properties: user.properties
      };
      var path = (0, _join2.default)(USER_PATH, user.id);
      return this._nuxeo.request(path).headers(this._headers).timeout(this._timeout).httpTimeout(this._httpTimeout).transactionTimeout(this._transactionTimeout).put(opts).then(function (res) {
        return new _user2.default(res, {
          users: _this4
        });
      });
    }

    /**
     * Deletes an user given an username.
     * @param {string} username - The username.
     * @param {object} opts - Options overriding the ones from the Request object.
     * @returns {Promise} A Promise object resolved with the result of the DELETE request.
     */

  }, {
    key: 'delete',
    value: function _delete(username) {
      var opts = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      var path = (0, _join2.default)(USER_PATH, username);
      return this._nuxeo.request(path).headers(this._headers).timeout(this._timeout).httpTimeout(this._httpTimeout).transactionTimeout(this._transactionTimeout).delete(opts);
    }
  }]);

  return Users;
}(_base2.default);

exports.default = Users;
module.exports = exports['default'];