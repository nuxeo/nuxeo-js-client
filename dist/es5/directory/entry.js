"use strict";

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

var extend = require('extend');

var Base = require('../base');

var _require = require('../server-version'),
    LTS_2017 = _require.LTS_2017;
/**
 * The `DirectoryEntry` class wraps a directory entry.
 *
 * **Cannot directly be instantiated**
 */


var DirectoryEntry =
/*#__PURE__*/
function (_Base) {
  _inherits(DirectoryEntry, _Base);

  /**
   * Creates a DirectoryEntry.
   * @param {object} entry - The initial entry object.
   *                         This DirectoryEntry object will be extended with entry properties.
   * @param {object} opts - The configuration options.
   * @param {string} opts.directory - The {@link Directory} object linked to this entry.
   */
  function DirectoryEntry(entry, opts) {
    var _this;

    _classCallCheck(this, DirectoryEntry);

    _this = _possibleConstructorReturn(this, _getPrototypeOf(DirectoryEntry).call(this, opts));
    _this._directory = opts.directory;
    _this.properties = {};
    _this._dirtyProperties = {};
    var serverVersion = _this._directory._nuxeo.serverVersion; // compatibility code for 8.10 (or unknown version) - make all properties dirty so that
    // the `idField` will be passed when updating

    if (!serverVersion || serverVersion.lt(LTS_2017)) {
      _this._dirtyProperties = extend({}, entry.properties);
    }

    extend(true, _assertThisInitialized(_this), entry);
    return _this;
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
    key: "set",
    value: function set(properties) {
      this._dirtyProperties = extend(true, {}, this._dirtyProperties, properties);
      return this;
    }
    /**
     * Gets an entry property.
     * @param {string} propertyName - The property name, such as 'label', 'ordering', ...
     * @returns {DirectoryEntry}
     */

  }, {
    key: "get",
    value: function get(propertyName) {
      return this._dirtyProperties[propertyName] || this.properties[propertyName];
    }
    /**
     * Saves the entry. It updates only the 'dirty properties' set through the {@link DirectoryEntry#set} method.
     * @param {object} [opts] - Options overriding the ones from this object.
     * @returns {Promise} A promise object resolved with the updated entry.
     */

  }, {
    key: "save",
    value: function save() {
      var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

      var options = this._computeOptions(opts);

      return this._directory.update({
        id: this.id,
        properties: this._dirtyProperties
      }, options);
    }
  }]);

  return DirectoryEntry;
}(Base);

module.exports = DirectoryEntry;