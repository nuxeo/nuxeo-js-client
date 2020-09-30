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

var USER_PATH = 'user';
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

var Users =
/*#__PURE__*/
function (_Base) {
  _inherits(Users, _Base);

  /**
   * Creates a Users object.
   * @param {object} opts - The configuration options.
   * @param {string} opts.nuxeo - The {@link Nuxeo} object linked to this Users object.
   */
  function Users(opts) {
    var _this;

    _classCallCheck(this, Users);

    _this = _possibleConstructorReturn(this, _getPrototypeOf(Users).call(this, opts));
    _this._nuxeo = opts.nuxeo;
    return _this;
  }
  /**
   * Fetches an user given an username.
   * @param {string} username - The username.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A Promise object resolved with the {@link User}.
   */


  _createClass(Users, [{
    key: "fetch",
    value: function fetch(username) {
      var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      var options = this._computeOptions(opts);

      var path = join(USER_PATH, username);
      options.users = this;
      return this._nuxeo.request(path).get(options);
    }
    /**
     * Creates an user.
     * @param {object} user - The user to be created.
     * @param {object} [opts] - Options overriding the ones from this object.
     * @returns {Promise} A Promise object resolved with the created {@link User}.
     */

  }, {
    key: "create",
    value: function create(user) {
      var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      opts.body = {
        'entity-type': 'user',
        properties: user.properties
      };

      var options = this._computeOptions(opts);

      options.users = this;
      return this._nuxeo.request(USER_PATH).post(options);
    }
    /**
     * Updates an user. Assumes that the user object has an id field.
     * @param {object} user - The user to be updated.
     * @param {object} [opts] - Options overriding the ones from this object.
     * @returns {Promise} A Promise object resolved with the updated {@link User}.
     */

  }, {
    key: "update",
    value: function update(user) {
      var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      opts.body = {
        'entity-type': 'user',
        id: user.id,
        properties: user.properties
      };

      var options = this._computeOptions(opts);

      var path = join(USER_PATH, user.id);
      options.users = this;
      return this._nuxeo.request(path).put(options);
    }
    /**
     * Deletes an user given an username.
     * @param {string} username - The username.
     * @param {object} [opts] - Options overriding the ones from this object.
     * @returns {Promise} A Promise object resolved with the result of the DELETE request.
     */

  }, {
    key: "delete",
    value: function _delete(username) {
      var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      var options = this._computeOptions(opts);

      var path = join(USER_PATH, username);
      return this._nuxeo.request(path).delete(options);
    }
  }]);

  return Users;
}(Base);

module.exports = Users;