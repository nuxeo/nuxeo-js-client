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
 * The `DirectoryEntry` class wraps a directory entry.
 *
 * **Cannot directly be instantiated**
 */

var DirectoryEntry = function () {
  /**
   * Creates a DirectoryEntry.
   * @param {object} entry - The initial entry object.
   *                         This DirectoryEntry object will be extended with entry properties.
   * @param {object} opts - The configuration options.
   * @param {string} opts.directory - The {@link Directory} object linked to this entry.
   */

  function DirectoryEntry(entry, opts) {
    _classCallCheck(this, DirectoryEntry);

    this._nuxeo = opts.nuxeo;
    this._directory = opts.directory;
    this.properties = {};
    this._dirtyProperties = {
      id: entry.properties.id
    };
    (0, _extend2.default)(true, this, entry);
  }

  /**
   * Sets entry properties.
   * @param {object} properties - The properties to set.
   * @returns {DirectoryEntry}
   *
   * @example
   * entry.set({
   *   'label': 'new label',
   *   'ordering': 50,
   * });
   */


  _createClass(DirectoryEntry, [{
    key: 'set',
    value: function set(properties) {
      this._dirtyProperties = (0, _extend2.default)(true, {}, this._dirtyProperties, properties);
      return this;
    }

    /**
     * Gets an entry property.
     * @param {string} propertyName - The property name, such as 'label', 'ordering', ...
     * @returns {DirectoryEntry}
     */

  }, {
    key: 'get',
    value: function get(propertyName) {
      return this._dirtyProperties[propertyName] || this.properties[propertyName];
    }

    /**
     * Saves the entry. It updates only the 'dirty properties' set through the {@link DirectoryEntry#set} method.
     * @param {object} opts - Options overriding the ones from the Document object.
     * @returns {Promise} A promise object resolved with the updated entry.
     */

  }, {
    key: 'save',
    value: function save(opts) {
      return this._directory.update({
        properties: this._dirtyProperties
      }, opts);
    }
  }]);

  return DirectoryEntry;
}();

exports.default = DirectoryEntry;
module.exports = exports['default'];