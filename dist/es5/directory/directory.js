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
/**
 * The `Directory` class allows to work with directories on a Nuxeo Platform instance.
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
 * nuxeo.directory('nature')
 *   .fetch('article')
 *   .then(function(res) {
 *     // res.properties.id === 'article'
 *     // res.properties.label === 'article label.directories.nature.article'
 *   })
 *   .catch(function(error) {
 *     throw new Error(error));
 *   });
 */


var Directory =
/*#__PURE__*/
function (_Base) {
  _inherits(Directory, _Base);

  /**
   * Creates a Directory.
   * @param {object} opts - The configuration options.
   * @param {string} opts.nuxeo - The {@link Nuxeo} object linked to this directory.
   * @param {string} opts.directoryName - The name of this directory.
   */
  function Directory(opts) {
    var _this;

    _classCallCheck(this, Directory);

    _this = _possibleConstructorReturn(this, _getPrototypeOf(Directory).call(this, opts));
    _this._nuxeo = opts.nuxeo;
    _this._directoryName = opts.directoryName;
    _this._path = join('directory', _this._directoryName);
    return _this;
  }
  /**
   * Fetches all directory entries.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A Promise object resolved with the entries.
   */


  _createClass(Directory, [{
    key: "fetchAll",
    value: function fetchAll() {
      var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

      var options = this._computeOptions(opts);

      var path = this._path;
      options.directory = this;
      return this._nuxeo.request(path).get(options);
    }
    /**
     * Fetches a directory entry given its id.
     * @param {string} id - The entry id.
     * @param {object} [opts] - Options overriding the ones from this object.
     * @returns {Promise} A Promise object resolved with the {@link DirectoryEntry}.
     */

  }, {
    key: "fetch",
    value: function fetch(id, opts) {
      var options = this._computeOptions(opts);

      var path = join(this._path, id);
      options.directory = this;
      return this._nuxeo.request(path).get(options);
    }
    /**
     * Creates an entry.
     * @param {object} entry - The entry to be created.
     * @param {object} [opts] - Options overriding the ones from this object.
     * @returns {Promise} A Promise object resolved with the created {@link DirectoryEntry}.
     */

  }, {
    key: "create",
    value: function create(entry) {
      var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      opts.body = {
        'entity-type': 'directoryEntry',
        directoryName: this._directoryName,
        properties: entry.properties
      };

      var options = this._computeOptions(opts);

      var path = this._path;
      options.directory = this;
      return this._nuxeo.request(path).post(options);
    }
    /**
     * Updates an entry. Assumes that the entry object has an `id` property.
     * @param {object} entry - The entry to be updated.
     * @param {object} entry.id - The string id of the entry to be updated.
     * @param {object} [opts] - Options overriding the ones from this object.
     * @returns {Promise} A Promise object resolved with the updated {@link DirectoryEntry}.
     */

  }, {
    key: "update",
    value: function update(entry) {
      var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      // compatibility code for 8.10 where the `id` field is not set by the server
      // works only if the `idField` of the directory is `id`
      var id = entry.id || entry.properties.id;
      opts.body = {
        id: id,
        'entity-type': 'directoryEntry',
        directoryName: this._directoryName,
        properties: entry.properties
      };

      var options = this._computeOptions(opts);

      var path = join(this._path, id);
      options.directory = this;
      return this._nuxeo.request(path).put(options);
    }
    /**
     * Deletes an entry given its id.
     * @param {string} id - The entry id.
     * @param {object} [opts] - Options overriding the ones from this object.
     * @returns {Promise} A Promise object resolved with the result of the DELETE request.
     */

  }, {
    key: "delete",
    value: function _delete(id, opts) {
      var options = this._computeOptions(opts);

      var path = join(this._path, id);
      return this._nuxeo.request(path).delete(options);
    }
  }]);

  return Directory;
}(Base);

module.exports = Directory;