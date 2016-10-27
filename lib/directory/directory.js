'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _base = require('../base');

var _base2 = _interopRequireDefault(_base);

var _join = require('../deps/utils/join');

var _join2 = _interopRequireDefault(_join);

var _entry = require('./entry');

var _entry2 = _interopRequireDefault(_entry);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * The `Directory` class allows to work with directories on a Nuxeo Platform instance.
 *
 * **Cannot directly be instantiated**
 *
 * @example
 * var Nuxeo = require('nuxeo')
 * var nuxeo = new Nuxeo({
 *  baseUrl: 'http://localhost:8080/nuxeo',
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
 *     // res.properties.label === 'article	label.directories.nature.article'
 *   })
 *   .catch(function(error) {
 *     throw new Error(error));
 *   });
 */
var Directory = function (_Base) {
  _inherits(Directory, _Base);

  /**
   * Creates a Directory.
   * @param {object} opts - The configuration options.
   * @param {string} opts.nuxeo - The {@link Nuxeo} object linked to this directory.
   * @param {string} opts.directoryName - The name of this directory.
   */
  function Directory(opts) {
    _classCallCheck(this, Directory);

    var _this = _possibleConstructorReturn(this, (Directory.__proto__ || Object.getPrototypeOf(Directory)).call(this, opts));

    _this._nuxeo = opts.nuxeo;
    _this._directoryName = opts.directoryName;
    _this._path = (0, _join2.default)('directory', _this._directoryName);
    return _this;
  }

  /**
   * Fetches all directory entries.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A Promise object resolved with the entries.
   */


  _createClass(Directory, [{
    key: 'fetchAll',
    value: function fetchAll() {
      var _this2 = this;

      var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

      var options = this._computeOptions(opts);
      var path = this._path;
      return this._nuxeo.request(path).get(options).then(function (res) {
        options.nuxeo = _this2._nuxeo;
        options.directory = _this2;
        var entries = res.entries.map(function (entry) {
          return new _entry2.default(entry, options);
        });
        return entries;
      });
    }

    /**
     * Fetches a directory entry given its id.
     * @param {string} id - The entry id.
     * @param {object} [opts] - Options overriding the ones from this object.
     * @returns {Promise} A Promise object resolved with the {@link DirectoryEntry}.
     */

  }, {
    key: 'fetch',
    value: function fetch(id, opts) {
      var _this3 = this;

      var options = this._computeOptions(opts);
      var path = (0, _join2.default)(this._path, id);
      return this._nuxeo.request(path).get(options).then(function (res) {
        options.nuxeo = _this3._nuxeo;
        options.directory = _this3;
        return new _entry2.default(res, options);
      });
    }

    /**
     * Creates an entry.
     * @param {object} entry - The entry to be created.
     * @param {object} [opts] - Options overriding the ones from this object.
     * @returns {Promise} A Promise object resolved with the created {@link DirectoryEntry}.
     */

  }, {
    key: 'create',
    value: function create(entry) {
      var _this4 = this;

      var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      opts.body = {
        'entity-type': 'directoryEntry',
        directoryName: this._directoryName,
        properties: entry.properties
      };
      var options = this._computeOptions(opts);
      var path = this._path;
      return this._nuxeo.request(path).post(opts).then(function (res) {
        options.nuxeo = _this4._nuxeo;
        options.directory = _this4;
        return new _entry2.default(res, options);
      });
    }

    /**
     * Updates an entry. Assumes that the entry object has an `id` property.
     * @param {object} entry - The entry to be updated.
     * @param {object} [opts] - Options overriding the ones from this object.
     * @returns {Promise} A Promise object resolved with the updated {@link DirectoryEntry}.
     */

  }, {
    key: 'update',
    value: function update(entry) {
      var _this5 = this;

      var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      opts.body = {
        'entity-type': 'directoryEntry',
        directoryName: this._directoryName,
        properties: entry.properties
      };
      var options = this._computeOptions(opts);
      var path = (0, _join2.default)(this._path, entry.properties.id);
      return this._nuxeo.request(path).put(options).then(function (res) {
        options.nuxeo = _this5._nuxeo;
        options.directory = _this5;
        return new _entry2.default(res, options);
      });
    }

    /**
     * Deletes an entry given its id.
     * @param {string} id - The entry id.
     * @param {object} [opts] - Options overriding the ones from this object.
     * @returns {Promise} A Promise object resolved with the result of the DELETE request.
     */

  }, {
    key: 'delete',
    value: function _delete(id, opts) {
      var options = this._computeOptions(opts);
      var path = (0, _join2.default)(this._path, id);
      return this._nuxeo.request(path).delete(options);
    }
  }]);

  return Directory;
}(_base2.default);

exports.default = Directory;
module.exports = exports['default'];