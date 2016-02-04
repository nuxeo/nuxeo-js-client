'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extend = require('extend');

var _extend2 = _interopRequireDefault(_extend);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * The `Document` class wraps a document.
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
 * nuxeo.operation('Document.GetChild')
 *   .input('/default-domain')
 *   .params({
 *     name: 'workspaces',
 *   })
 *   .execute().then((res) => {
       // res.uid !== null
 *     // res.title === 'Workspaces'
 *   }).catch(error => throw new Error(error));
 */

var Document = function () {
  /**
   * Creates a Document.
   * @param {object} doc - The initial document object. This Document object will be extended with doc properties.
   * @param {object} opts - Options overriding the ones from the Operation object.
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
   * Sets document peroperties.
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
     * @param {object} opts - Options overriding the ones from the Document object.
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
  }]);

  return Document;
}();

exports.default = Document;
module.exports = exports['default'];