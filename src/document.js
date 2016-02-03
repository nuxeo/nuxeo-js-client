'use strict';

import extend from 'extend';

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

class Document {
  /**
   * Creates a Document.
   * @param {object} doc - The initial document object. This Document object will be extended with doc properties.
   * @param {object} opts - Options overriding the ones from the Operation object.
   * @param {string} opts.repository - The {@link Repository} object linked to this document.
   */
  constructor(doc, opts) {
    this._nuxeo = opts.nuxeo;
    this._repository = opts.repository;
    this.properties = {};
    this._dirtyProperties = {};

    extend(true, this, doc);
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
  set(properties) {
    this._dirtyProperties = extend(true, {}, this._dirtyProperties, properties);
    return this;
  }

  /**
   * Gets a document property.
   * @param {string} propertyName - The property name, such as 'dc:title', 'file:filename', ...
   * @returns {Document}
   */
  get(propertyName) {
    return this._dirtyProperties[propertyName] || this.properties[propertyName];
  }

  /**
   * Saves the document. It updates only the 'dirty properties' set through the {@link Document#set} method.
   * @param {object} opts - Options overriding the ones from the Document object.
   * @returns {Promise} A promise object resolved with the updated document.
   */
  save(opts) {
    return this._repository.update({
      'entity-type': 'document',
      uid: this.uid,
      properties: this._dirtyProperties,
    }, opts);
  }

  /**
   * Returns weither this document is folderish or not.
   * @returns {Boolean} true if this document is folderish, false otherwise.
   */
  isFolder() {
    return this.facets.indexOf('Folderish') !== -1;
  }
}

export default Document;
