'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _extend = require('extend');

var _extend2 = _interopRequireDefault(_extend);

var _join = require('./deps/utils/join');

var _join2 = _interopRequireDefault(_join);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * The `Document` class wraps a document.
 *
 * **Cannot directly be instantiated**
 */

var Document = function () {
  /**
   * Creates a Document.
   * @param {object} doc - The initial document object. This Document object will be extended with doc properties.
   * @param {object} opts - The configuration options.
   * @param {string} opts.repository - The {@link Repository} object linked to this document.
   */

  function Document(doc, opts) {
    _classCallCheck(this, Document);

    this._nuxeo = opts.nuxeo;
    this._repository = opts.repository;
    this.properties = {};
    this._dirtyProperties = {};
    (0, _extend2.default)(true, this, doc);
  }

  /**
   * Sets document properties.
   * @param {object} properties - The properties to set.
   * @returns {Document}
   *
   * @example
   * doc.set({
   *   'dc:title': 'new title',
   *   'dc:description': 'new description',
   * });
   */


  _createClass(Document, [{
    key: 'set',
    value: function set(properties) {
      this._dirtyProperties = (0, _extend2.default)(true, {}, this._dirtyProperties, properties);
      return this;
    }

    /**
     * Gets a document property.
     * @param {string} propertyName - The property name, such as 'dc:title', 'file:filename', ...
     * @returns {Document}
     */

  }, {
    key: 'get',
    value: function get(propertyName) {
      return this._dirtyProperties[propertyName] || this.properties[propertyName];
    }

    /**
     * Saves the document. It updates only the 'dirty properties' set through the {@link Document#set} method.
     * @param {object} [opts] - Options overriding the ones from the underlying Repository object.
     * @returns {Promise} A promise object resolved with the updated document.
     */

  }, {
    key: 'save',
    value: function save(opts) {
      return this._repository.update({
        'entity-type': 'document',
        uid: this.uid,
        properties: this._dirtyProperties
      }, opts);
    }

    /**
     * Returns weither this document is folderish or not.
     * @returns {Boolean} true if this document is folderish, false otherwise.
     */

  }, {
    key: 'isFolder',
    value: function isFolder() {
      return this.facets.indexOf('Folderish') !== -1;
    }

    /**
     * Fetch a Blob from this document.
     * @param {string} [xpath=blobholder:0] - The Blob xpath. Default to the main blob 'blobholder:0'.
     * @param {object} [opts] - Options overriding the ones from the underlying Nuxeo object.
     * @returns {Promise} A promise object resolved with the response.
     */

  }, {
    key: 'fetchBlob',
    value: function fetchBlob() {
      var xpath = arguments.length <= 0 || arguments[0] === undefined ? 'blobholder:0' : arguments[0];
      var opts = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      var options = opts;
      var blobXPath = xpath;
      if ((typeof xpath === 'undefined' ? 'undefined' : _typeof(xpath)) === 'object') {
        options = xpath;
        blobXPath = 'blobholder:0';
      }
      var path = (0, _join2.default)('id', this.uid, '@blob', blobXPath);
      return this._nuxeo.request(path).get(options);
    }

    /**
     * Moves this document.
     * @param {string} dst - The destination folder.
     * @param {string} [name] - The destination name, can be null.
     * @param {object} [opts] - Options overriding the ones from the underlying Nuxeo object.
     * @returns {Promise} A promise object resolved with the moved document.
     */

  }, {
    key: 'move',
    value: function move(dst, name) {
      var _this = this;

      var opts = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

      return this._nuxeo.operation('Document.Move').input(this.uid).params({
        name: name,
        target: dst
      }).execute(opts).then(function (res) {
        return new Document(res, {
          nuxeo: _this._nuxeo,
          repository: _this._repository
        });
      });
    }

    /**
     * Follows a given life cycle transition.
     * @param {string} transitionName - The life cycle transition to follow.
     * @param {object} [opts] - Options overriding the ones from the underlying Nuxeo object.
     * @returns {Promise} A promise object resolved with the updated document.
     */

  }, {
    key: 'followTransition',
    value: function followTransition(transitionName) {
      var _this2 = this;

      var opts = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      return this._nuxeo.operation('Document.FollowLifecycleTransition').input(this.uid).params({
        value: transitionName
      }).execute(opts).then(function (res) {
        return new Document(res, {
          nuxeo: _this2._nuxeo,
          repository: _this2._repository
        });
      });
    }

    /**
     * Converts a Blob from this document.
     * @param {object} convertOpts - Configuration options for the conversion.
                                     At least one of the options must be defined.
     * @param {string} [convertOpts.xpath=blobholder:0] - The Blob xpath. Default to the main blob 'blobholder:0'.
     * @param {string} convertOpts.converter - Named converter to use.
     * @param {string} convertOpts.type - The destination mime type, such as 'application/pdf'.
     * @param {string} convertOpts.format - The destination format, such as 'pdf'.
     * @param {object} [opts] - Options overriding the ones from the underlying Nuxeo object.
     * @returns {Promise} A promise object resolved with the response.
     */

  }, {
    key: 'convert',
    value: function convert(convertOpts, opts) {
      var xpath = convertOpts.xpath || 'blobholder:0';
      var path = (0, _join2.default)('id', this.uid, '@blob', xpath, '@convert');
      return this._nuxeo.request(path).queryParams({
        converter: convertOpts.converter,
        type: convertOpts.type,
        format: convertOpts.format
      }).get(opts);
    }
  }]);

  return Document;
}();

exports.default = Document;
module.exports = exports['default'];