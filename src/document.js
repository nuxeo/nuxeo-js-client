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
   * @param {object} [opts] - Options overriding the ones from the underlying Nuxeo object.
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

  /**
   * Fetches the renditions list of this document.
   * @param {object} [opts] - Options overriding the ones from the underlying Nuxeo object.
   * @returns {Promise} A promise object resolved with the rendition definitions.
   */
  fetchRenditions(opts = {}) {
    const Promise = this._nuxeo.Promise;
    if (this.contextParameters && this.contextParameters.renditions) {
      return Promise.resolve(this.contextParameters.renditions);
    }

    const finalOptions = extend(true, { headers: { 'enrichers-document': 'renditions' } }, opts);
    return this._repository
      .fetch(this.uid, finalOptions)
      .then((doc) => {
        if (!this.contextParameters) {
          this.contextParameters = {};
        }
        this.contextParameters.renditions = doc.contextParameters.renditions;
        return this.contextParameters.renditions;
      });
  }

  /**
   * Fetch a rendition from this document.
   * @param {string} name - The rendition name.
   * @param {object} [opts] - Options overriding the ones from the underlying Nuxeo object.
   * @returns {Promise} A promise object resolved with the response.
   */
  fetchRendition(name, opts = {}) {
    const path = join('id', this.uid, '@rendition', name);
    return this._nuxeo.request(path)
      .get(opts);
  }

  /**
   * Fetches the ACLs list of this document.
   * @param {object} [opts] - Options overriding the ones from the underlying Nuxeo object.
   * @returns {Promise} A promise object resolved with the ACLs.
   */
  fetchACLs(opts = {}) {
    const Promise = this._nuxeo.Promise;
    if (this.contextParameters && this.contextParameters.acls) {
      return Promise.resolve(this.contextParameters.acls);
    }

    const finalOptions = extend(true, { headers: { 'enrichers-document': 'acls' } }, opts);
    return this._repository
      .fetch(this.uid, finalOptions)
      .then((doc) => {
        if (!this.contextParameters) {
          this.contextParameters = {};
        }
        this.contextParameters.acls = doc.contextParameters.acls;
        return this.contextParameters.acls;
      });
  }

  /**
   * Checks if the user has a given permission. It only works for now for 'Write', 'Read' and 'Everything' permission.
   * This method may call the server to compute the available permissions (using the 'permissions' enricher)
   * if not already present.
   * @param {object} [opts] - Options overriding the ones from the underlying Nuxeo object.
   * @returns {Promise} A promise object resolved with true or false.
   */
  hasPermission(name, opts = {}) {
    const Promise = this._nuxeo.Promise;
    if (this.contextParameters && this.contextParameters.permissions) {
      return Promise.resolve(this.contextParameters.permissions.indexOf(name) !== -1);
    }

    const finalOptions = extend(true, { headers: { 'enrichers-document': 'permissions' } }, opts);
    return this._repository
      .fetch(this.uid, finalOptions)
      .then((doc) => {
        if (!this.contextParameters) {
          this.contextParameters = {};
        }
        this.contextParameters.permissions = doc.contextParameters.permissions;
        return this.contextParameters.permissions.indexOf(name) !== -1;
      });
  }

  /**
   * Adds a new permission.
   * @param {object} params - The params needed to add a new permission.
   * @param {string} params.permission - The permission string to set, such as 'Write', 'Read', ...
   * @param {string} params.username - The target username. `username` or `email` must be set.
   * @param {string} params.email - The target email. `username` or `email` must be set.
   * @param {string} [params.acl] - The ACL name where to add the new permission.
   * @param {string} [params.begin] - Optional begin date.
   * @param {string} [params.end] - Optional end date.
   * @param {string} [params.blockInheritance] - Whether to block the permissions inheritance or not
   *                                             before adding the new permission.
   * @param {string} [params.notify] - Optional flag to notify the user of the new permission.
   * @param {string} [params.comment] - Optional comment used for the user notification.
   * @param {object} [opts] - Options overriding the ones from the underlying Nuxeo object.
   * @returns {Promise} A promise object resolved with the updated document.
   */
  addPermission(params, opts = {}) {
    return this._nuxeo.operation('Document.AddPermission')
      .input(this.uid)
      .params(params)
      .execute(opts)
      .then((res) => {
        return new Document(res, {
          nuxeo: this._nuxeo,
          repository: this._repository,
        });
      });
  }

  /**
   * Removes a permission given its id, or all permissions for a given user.
   * @param {object} params - The params needed to remove a permission.
   * @param {string} params.id - The permission id. `id` or `user` must be set.
   * @param {string} params.user - The user to rem. `id` or `user` must be set.
   * @param {string} [params.acl] - The ACL name where to add the new permission.
   * @param {object} [opts] - Options overriding the ones from the underlying Nuxeo object.
   * @returns {Promise} A promise object resolved with the updated document.
   */
  removePermission(params, opts = {}) {
    return this._nuxeo.operation('Document.RemovePermission')
      .input(this.uid)
      .params(params)
      .execute(opts)
      .then((res) => {
        return new Document(res, {
          nuxeo: this._nuxeo,
          repository: this._repository,
        });
      });
  }

  /**
   * Fetches the lock status of the document.
   * @example
   * // if the doc is locked
   * doc.fetchLockStatus().then((status) => {
   *   // status.lockOwner === 'Administrator'
   *   // status.lockCreated === '2011-10-23T12:00:00.00Z'
   * })
   * @example
   * // if the doc is not locked
   * doc.fetchLockStatus().then((status) => {
   *   // status.lockOwner === undefined
   *   // status.lockCreated === undefined
   * })
   * @param {object} [opts] - Options overriding the ones from the underlying Nuxeo object.
   * @returns {Promise} A promise object resolved with true or false.
   */
  fetchLockStatus(opts = {}) {
    const finalOptions = extend(true, { headers: { 'fetch-document': 'lock' } }, opts);
    return this._repository
      .fetch(this.uid, finalOptions)
      .then((doc) => {
        return {
          lockOwner: doc.lockOwner,
          lockCreated: doc.lockCreated,
        };
      });
  }

  /**
   * Locks the document.
   * @param {object} [opts] - Options overriding the ones from the underlying Nuxeo object.
   * @returns {Promise} A promise object resolved with the updated document.
   */
  lock(opts = {}) {
    return this._nuxeo.operation('Document.Lock')
      .input(this.uid)
      .execute(opts)
      .then((res) => {
        return new Document(res, {
          nuxeo: this._nuxeo,
          repository: this._repository,
        });
      });
  }

  /**
   * Unlocks the document.
   * @param {object} [opts] - Options overriding the ones from the underlying Nuxeo object.
   * @returns {Promise} A promise object resolved with the updated document.
   */
  unlock(opts = {}) {
    return this._nuxeo.operation('Document.Unlock')
      .input(this.uid)
      .execute(opts)
      .then((res) => {
        return new Document(res, {
          nuxeo: this._nuxeo,
          repository: this._repository,
        });
      });
  }

  /**
   * Fetches the audit of the document.
   * @param {object} [queryOpts] - Parameters for the audit query.
   * @param {Array} [queryOpts.eventId] - List of event ids to filter.
   * @param {Array} [queryOpts.category] - List of categories to filter
   * @param {Array} [queryOpts.principalName] - List of principal names to filter.
   * @param {object} [queryOpts.startEventDate] - Start date.
   * @param {object} [queryParams.endEventDate] - End date
   * @param {number} [queryOpts.pageSize=0] - The number of results per page.
   * @param {number} [queryOpts.currentPageIndex=0] - The current page index.
   * @param {number} [queryOpts.maxResults] - The expected max results.
   * @param {string} [queryOpts.sortBy] - The sort by info.
   * @param {string} [queryOpts.sortOrder] - The sort order info.
   * @param {object} [opts] - Options overriding the ones from the underlying Nuxeo object.
   * @returns {Promise} A promise object resolved with audit entries.
   */
  fetchAudit(queryOpts = {}, opts = {}) {
    const path = join('id', this.uid, '@audit');
    return this._nuxeo.request(path)
      .queryParams(queryOpts)
      .get(opts);
  }
}

export default Document;