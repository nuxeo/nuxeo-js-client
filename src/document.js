'use strict';

import extend from 'extend';
import join from './deps/utils/join';
import Workflow from './workflow/workflow';

/**
 * The `Document` class wraps a document.
 *
 * **Cannot directly be instantiated**
 */
class Document {
  /**
   * Creates a Document.
   * @param {object} doc - The initial document object. This Document object will be extended with doc properties.
   * @param {object} opts - The configuration options.
   * @param {object} opts.repository - The {@link Repository} object linked to this document.
   */
  constructor(doc, opts) {
    this._nuxeo = opts.nuxeo;
    this._repository = opts.repository;
    this.properties = {};
    this._dirtyProperties = {};
    extend(true, this, doc);
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
   * @param {object} [opts] - Options overriding the ones from the underlying Repository object.
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

  /**
   * Fetch a Blob from this document.
   * @param {string} [xpath=blobholder:0] - The Blob xpath. Default to the main blob 'blobholder:0'.
   * @param {object} [opts] - Options overriding the ones from the underlying Nuxeo object.
   * @returns {Promise} A promise object resolved with the response.
   */
  fetchBlob(xpath = 'blobholder:0', opts = {}) {
    let options = opts;
    let blobXPath = xpath;
    if (typeof xpath === 'object') {
      options = xpath;
      blobXPath = 'blobholder:0';
    }
    const path = join('id', this.uid, '@blob', blobXPath);
    return this._nuxeo.request(path).get(options);
  }

  /**
   * Moves this document.
   * @param {string} dst - The destination folder.
   * @param {string} [name] - The destination name, can be null.
   * @param {object} [opts] - Options overriding the ones from the underlying Nuxeo object.
   * @returns {Promise} A promise object resolved with the moved document.
   */
  move(dst, name, opts = {}) {
    return this._nuxeo.operation('Document.Move')
      .input(this.uid)
      .params({
        name,
        target: dst,
      })
      .execute(opts)
      .then((res) => {
        return new Document(res, {
          nuxeo: this._nuxeo,
          repository: this._repository,
        });
      });
  }

  /**
   * Follows a given life cycle transition.
   * @param {string} transitionName - The life cycle transition to follow.
   * @param {object} [opts] - Options overriding the ones from the underlying Nuxeo object.
   * @returns {Promise} A promise object resolved with the updated document.
   */
  followTransition(transitionName, opts = {}) {
    return this._nuxeo.operation('Document.FollowLifecycleTransition')
      .input(this.uid)
      .params({
        value: transitionName,
      })
      .execute(opts)
      .then((res) => {
        return new Document(res, {
          nuxeo: this._nuxeo,
          repository: this._repository,
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
  convert(convertOpts, opts) {
    const xpath = convertOpts.xpath || 'blobholder:0';
    const path = join('id', this.uid, '@blob', xpath, '@convert');
    return this._nuxeo.request(path)
      .queryParams({
        converter: convertOpts.converter,
        type: convertOpts.type,
        format: convertOpts.format,
      })
      .get(opts);
  }

  /**
   * Starts a workflow on this document given a workflow model name.
   * @param {string} workflowModelName - The workflow model name.
   * @param {object} opts - Options overriding the ones from the underlying Nuxeo object.
   * @returns {Promise} A promise object resolved with the started `Workflow` object.
   */
  startWorkflow(workflowModelName, opts = {}) {
    opts.body = {
      workflowModelName,
      'entity-type': 'workflow',
    };
    const path = join('id', this.uid, '@workflow');
    return this._nuxeo.request(path)
      .post(opts)
      .then((workflow) => {
        return new Workflow(workflow, {
          nuxeo: this._nuxeo,
          documentId: this.uid,
        });
      });
  }

  /**
   * Fetches the started workflows on this document.
   * @param {object} opts - Options overriding the ones from the underlying Nuxeo object.
   * @returns {Promise} A promise object resolved with the started workflows.
   */
  fetchWorkflows(opts = {}) {
    const path = join('id', this.uid, '@workflow');
    return this._nuxeo.request(path)
      .get(opts)
      .then(({ entries }) => {
        const workflows = entries.map((workflow) => {
          return new Workflow(workflow, {
            nuxeo: this._nuxeo,
            documentId: this.uid,
          });
        });
        return workflows;
      });
  }
}

export default Document;
