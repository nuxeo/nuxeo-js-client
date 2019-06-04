const extend = require('extend');
const qs = require('querystring');
const join = require('./deps/utils/join');
const Base = require('./base');
const constants = require('./deps/constants');

/**
 * The `Document` class wraps a document.
 *
 * **Cannot directly be instantiated**
 */
class Document extends Base {
  /**
   * Creates a Document.
   * @param {object} doc - The initial document object. This Document object will be extended with doc properties.
   * @param {object} opts - The configuration options.
   * @param {string} opts.nuxeo - The {@link Nuxeo} object linked to this `Document` object.
   * @param {object} opts.repository - The {@link Repository} object linked to this `Document` object.
   */
  constructor(doc, opts) {
    super(opts);
    this._nuxeo = opts.nuxeo;
    this._repository = opts.repository || this._nuxeo.repository(doc.repository, opts);
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
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A promise object resolved with the updated document.
   */
  save(opts = {}) {
    const options = this._computeOptions(opts);
    return this._repository.update({
      'entity-type': 'document',
      uid: this.uid,
      properties: this._dirtyProperties,
    }, options);
  }

  /**
   * Returns whether this document is folderish or not.
   * @returns {Boolean} true if this document is folderish, false otherwise.
   */
  isFolder() {
    return this.hasFacet('Folderish');
  }

  /**
   * Returns whether this document has the input facet or not.
   * @returns {Boolean} true if this document has the facet, false otherwise.
   */
  hasFacet(facet) {
    return this.facets.indexOf(facet) !== -1;
  }

  /**
   * Returns whether this document is a collection or not.
   * @returns {Boolean} true if this document is a collection, false otherwise.
   */
  isCollection() {
    return this.hasFacet('Collection');
  }

  /**
   * Returns whether this document can be added to a collection or not.
   * @returns {Boolean} true if this document can be added to a collection, false otherwise.
   */
  isCollectable() {
    return !this.hasFacet('NotCollectionMember');
  }

  /**
   * Fetch a Blob from this document.
   * @param {string} [xpath=blobholder:0] - The Blob xpath. Default to the main blob 'blobholder:0'.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A promise object resolved with the response.
   */
  fetchBlob(xpath = 'blobholder:0', opts = {}) {
    let options = opts;
    let blobXPath = xpath;
    if (typeof xpath === 'object') {
      options = xpath;
      blobXPath = 'blobholder:0';
    }
    options = this._computeOptions(options);
    const path = join('id', this.uid, '@blob', blobXPath);
    return this._nuxeo.request(path).get(options);
  }

  /**
   * Moves this document.
   * @param {string} dst - The destination folder.
   * @param {string} [name] - The destination name, can be null.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A promise object resolved with the moved document.
   */
  move(dst, name = null, opts = {}) {
    const options = this._computeOptions(opts);
    options.repository = this._repository;
    return this._nuxeo.operation('Document.Move')
      .input(this.uid)
      .params({
        name,
        target: dst,
      })
      .execute(options);
  }

  /**
   * Follows a given life cycle transition.
   * @param {string} transitionName - The life cycle transition to follow.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A promise object resolved with the updated document.
   */
  followTransition(transitionName, opts = {}) {
    const options = this._computeOptions(opts);
    options.repository = this._repository;
    return this._nuxeo.operation('Document.FollowLifecycleTransition')
      .input(this.uid)
      .params({
        value: transitionName,
      })
      .execute(options);
  }

  /**
   * Converts a Blob from this document.
   * @param {object} convertOpts - Configuration options for the conversion.
                                   At least one of the 'converter', 'type' or 'format' option must be defined.
   * @param {string} [convertOpts.xpath=blobholder:0] - The Blob xpath. Default to the main blob 'blobholder:0'.
   * @param {string} convertOpts.converter - Named converter to use.
   * @param {string} convertOpts.type - The destination mime type, such as 'application/pdf'.
   * @param {string} convertOpts.format - The destination format, such as 'pdf'.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A promise object resolved with the response.
   */
  convert(convertOpts, opts = {}) {
    const options = this._computeOptions(opts);
    const xpath = convertOpts.xpath || 'blobholder:0';
    const path = join('id', this.uid, '@blob', xpath, '@convert');
    return this._nuxeo.request(path)
      .queryParams({
        converter: convertOpts.converter,
        type: convertOpts.type,
        format: convertOpts.format,
      })
      .get(options);
  }

  /**
   * Schedule a conversion of the Blob from this document.
   * @param {object} convertOpts - Configuration options for the conversion.
                                   At least one of the 'converter', 'type' or 'format' option must be defined.
   * @param {string} [convertOpts.xpath=blobholder:0] - The Blob xpath. Default to the main blob 'blobholder:0'.
   * @param {string} convertOpts.converter - Named converter to use.
   * @param {string} convertOpts.type - The destination mime type, such as 'application/pdf'.
   * @param {string} convertOpts.format - The destination format, such as 'pdf'.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A promise object resolved with the response.
   */
  scheduleConversion(convertOpts, opts = {}) {
    const params = {
      async: true,
      converter: convertOpts.converter,
      type: convertOpts.type,
      format: convertOpts.format,
    };
    opts.body = qs.stringify(params);
    const options = this._computeOptions(opts);
    options.headers['Content-Type'] = 'multipart/form-data';
    const xpath = convertOpts.xpath || 'blobholder:0';
    const path = join('id', this.uid, '@blob', xpath, '@convert');
    return this._nuxeo.request(path)
      .post(options);
  }

  /**
   * Starts a workflow on this document given a workflow model name.
   * @param {string} workflowModelName - The workflow model name.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A promise object resolved with the started `Workflow` object.
   */
  startWorkflow(workflowModelName, opts = {}) {
    opts.body = {
      workflowModelName,
      'entity-type': 'workflow',
    };
    const options = this._computeOptions(opts);
    const path = join('id', this.uid, '@workflow');
    options.documentId = this.uid;
    return this._nuxeo.request(path)
      .post(options);
  }

  /**
   * Fetches the started workflows on this document.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A promise object resolved with the started workflows.
   */
  fetchWorkflows(opts = {}) {
    const options = this._computeOptions(opts);
    const path = join('id', this.uid, '@workflow');
    options.documentId = this.uid;
    return this._nuxeo.request(path)
      .get(options);
  }

  /**
   * Fetches the renditions list of this document.
   *
   * Only available on Nuxeo version LTS 2016 or later.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A promise object resolved with the rendition definitions.
   */
  fetchRenditions(opts = {}) {
    const { Promise } = this._nuxeo;
    if (this.contextParameters && this.contextParameters.renditions) {
      return Promise.resolve(this.contextParameters.renditions);
    }

    const options = this._computeOptions(opts);
    options.enrichers = { document: ['renditions'] };
    return this._repository
      .fetch(this.uid, options)
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
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A promise object resolved with the response.
   */
  fetchRendition(name, opts = {}) {
    const options = this._computeOptions(opts);
    const path = join('id', this.uid, '@rendition', name);
    return this._nuxeo.request(path)
      .get(options);
  }

  /**
   * Fetches the ACLs list of this document.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A promise object resolved with the ACLs.
   */
  fetchACLs(opts = {}) {
    const { Promise } = this._nuxeo;
    if (this.contextParameters && this.contextParameters.acls) {
      return Promise.resolve(this.contextParameters.acls);
    }

    const options = this._computeOptions(opts);
    options.enrichers = { document: [constants.enricher.document.ACLS] };
    return this._repository
      .fetch(this.uid, options)
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
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A promise object resolved with true or false.
   */
  hasPermission(name, opts = {}) {
    const { Promise } = this._nuxeo;
    if (this.contextParameters && this.contextParameters.permissions) {
      return Promise.resolve(this.contextParameters.permissions.indexOf(name) !== -1);
    }

    const options = this._computeOptions(opts);
    options.enrichers = { document: [constants.enricher.document.PERMISSIONS] };
    return this._repository
      .fetch(this.uid, options)
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
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A promise object resolved with the updated document.
   */
  addPermission(params, opts = {}) {
    const options = this._computeOptions(opts);
    options.repository = this._repository;
    return this._nuxeo.operation('Document.AddPermission')
      .input(this.uid)
      .params(params)
      .execute(options);
  }

  /**
   * Removes a permission given its id, or all permissions for a given user.
   * @param {object} params - The params needed to remove a permission.
   * @param {string} params.id - The permission id. `id` or `user` must be set.
   * @param {string} params.user - The user to rem. `id` or `user` must be set.
   * @param {string} [params.acl] - The ACL name where to add the new permission.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A promise object resolved with the updated document.
   */
  removePermission(params, opts = {}) {
    const options = this._computeOptions(opts);
    options.repository = this._repository;
    return this._nuxeo.operation('Document.RemovePermission')
      .input(this.uid)
      .params(params)
      .execute(options);
  }

  /**
   * Fetches the lock status of the document.
   * @example
   * // if the doc is locked
   * doc.fetchLockStatus()
   *   .then(function(status) {
   *     // status.lockOwner === 'Administrator'
   *     // status.lockCreated === '2011-10-23T12:00:00.00Z'
   *   });
   * @example
   * // if the doc is not locked
   * doc.fetchLockStatus()
   *   .then(function(status) {
   *     // status.lockOwner === undefined
   *     // status.lockCreated === undefined
   *   });
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A promise object resolved with true or false.
   */
  fetchLockStatus(opts = {}) {
    const options = this._computeOptions(opts);
    options.fetchProperties = { document: ['lock'] };
    return this._repository
      .fetch(this.uid, options)
      .then((doc) => {
        return {
          lockOwner: doc.lockOwner,
          lockCreated: doc.lockCreated,
        };
      });
  }

  /**
   * Locks the document.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A promise object resolved with the updated document.
   */
  lock(opts = {}) {
    const options = this._computeOptions(opts);
    options.repository = this._repository;
    return this._nuxeo.operation('Document.Lock')
      .input(this.uid)
      .execute(options);
  }

  /**
   * Unlocks the document.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A promise object resolved with the updated document.
   */
  unlock(opts = {}) {
    const options = this._computeOptions(opts);
    options.repository = this._repository;
    return this._nuxeo.operation('Document.Unlock')
      .input(this.uid)
      .execute(options);
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
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A promise object resolved with audit entries.
   */
  fetchAudit(queryOpts = {}, opts = {}) {
    const options = this._computeOptions(opts);
    const path = join('id', this.uid, '@audit');
    return this._nuxeo.request(path)
      .queryParams(queryOpts)
      .get(options);
  }
}

module.exports = Document;
