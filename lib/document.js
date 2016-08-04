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

var _base = require('./base');

var _base2 = _interopRequireDefault(_base);

var _workflow = require('./workflow/workflow');

var _workflow2 = _interopRequireDefault(_workflow);

var _constants = require('./deps/constants');

var _constants2 = _interopRequireDefault(_constants);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * The `Document` class wraps a document.
 *
 * **Cannot directly be instantiated**
 */
var Document = function (_Base) {
  _inherits(Document, _Base);

  /**
   * Creates a Document.
   * @param {object} doc - The initial document object. This Document object will be extended with doc properties.
   * @param {object} opts - The configuration options.
   * @param {string} opts.nuxeo - The {@link Nuxeo} object linked to this `Document` object.
   * @param {object} opts.repository - The {@link Repository} object linked to this `Document` object.
   */
  function Document(doc, opts) {
    _classCallCheck(this, Document);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(Document).call(this, opts));

    _this._nuxeo = opts.nuxeo;
    _this._repository = opts.repository;
    _this.properties = {};
    _this._dirtyProperties = {};
    (0, _extend2.default)(true, _this, doc);
    return _this;
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
     * @param {object} [opts] - Options overriding the ones from this object.
     * @returns {Promise} A promise object resolved with the updated document.
     */

  }, {
    key: 'save',
    value: function save() {
      var opts = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      var options = this._computeOptions(opts);
      return this._repository.update({
        'entity-type': 'document',
        uid: this.uid,
        properties: this._dirtyProperties
      }, options);
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
     * @param {object} [opts] - Options overriding the ones from this object.
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
      options = this._computeOptions(options);
      var path = (0, _join2.default)('id', this.uid, '@blob', blobXPath);
      return this._nuxeo.request(path).get(options);
    }

    /**
     * Moves this document.
     * @param {string} dst - The destination folder.
     * @param {string} [name] - The destination name, can be null.
     * @param {object} [opts] - Options overriding the ones from this object.
     * @returns {Promise} A promise object resolved with the moved document.
     */

  }, {
    key: 'move',
    value: function move(dst) {
      var _this2 = this;

      var name = arguments.length <= 1 || arguments[1] === undefined ? null : arguments[1];
      var opts = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

      var options = this._computeOptions(opts);
      return this._nuxeo.operation('Document.Move').input(this.uid).params({
        name: name,
        target: dst
      }).execute(options).then(function (res) {
        options.nuxeo = _this2._nuxeo;
        options.repository = _this2._repository;
        return new Document(res, options);
      });
    }

    /**
     * Follows a given life cycle transition.
     * @param {string} transitionName - The life cycle transition to follow.
     * @param {object} [opts] - Options overriding the ones from this object.
     * @returns {Promise} A promise object resolved with the updated document.
     */

  }, {
    key: 'followTransition',
    value: function followTransition(transitionName) {
      var _this3 = this;

      var opts = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      var options = this._computeOptions(opts);
      return this._nuxeo.operation('Document.FollowLifecycleTransition').input(this.uid).params({
        value: transitionName
      }).execute(options).then(function (res) {
        options.nuxeo = _this3._nuxeo;
        options.repository = _this3._repository;
        return new Document(res, options);
      });
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

  }, {
    key: 'convert',
    value: function convert(convertOpts) {
      var opts = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      var options = this._computeOptions(opts);
      var xpath = convertOpts.xpath || 'blobholder:0';
      var path = (0, _join2.default)('id', this.uid, '@blob', xpath, '@convert');
      return this._nuxeo.request(path).queryParams({
        converter: convertOpts.converter,
        type: convertOpts.type,
        format: convertOpts.format
      }).get(options);
    }

    /**
     * Starts a workflow on this document given a workflow model name.
     * @param {string} workflowModelName - The workflow model name.
     * @param {object} [opts] - Options overriding the ones from this object.
     * @returns {Promise} A promise object resolved with the started `Workflow` object.
     */

  }, {
    key: 'startWorkflow',
    value: function startWorkflow(workflowModelName) {
      var _this4 = this;

      var opts = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      opts.body = {
        workflowModelName: workflowModelName,
        'entity-type': 'workflow'
      };
      var options = this._computeOptions(opts);
      var path = (0, _join2.default)('id', this.uid, '@workflow');
      return this._nuxeo.request(path).post(options).then(function (workflow) {
        options.nuxeo = _this4._nuxeo;
        options.documentId = _this4.uid;
        return new _workflow2.default(workflow, options);
      });
    }

    /**
     * Fetches the started workflows on this document.
     * @param {object} [opts] - Options overriding the ones from this object.
     * @returns {Promise} A promise object resolved with the started workflows.
     */

  }, {
    key: 'fetchWorkflows',
    value: function fetchWorkflows() {
      var _this5 = this;

      var opts = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      var options = this._computeOptions(opts);
      var path = (0, _join2.default)('id', this.uid, '@workflow');
      return this._nuxeo.request(path).get(options).then(function (_ref) {
        var entries = _ref.entries;

        options.nuxeo = _this5._nuxeo;
        options.documentId = _this5.uid;
        var workflows = entries.map(function (workflow) {
          return new _workflow2.default(workflow, options);
        });
        return workflows;
      });
    }

    /**
     * Fetches the renditions list of this document.
     * @param {object} [opts] - Options overriding the ones from this object.
     * @returns {Promise} A promise object resolved with the rendition definitions.
     */

  }, {
    key: 'fetchRenditions',
    value: function fetchRenditions() {
      var _this6 = this;

      var opts = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      var Promise = this._nuxeo.Promise;
      if (this.contextParameters && this.contextParameters.renditions) {
        return Promise.resolve(this.contextParameters.renditions);
      }

      var options = this._computeOptions(opts);
      options.enrichers = { document: ['renditions'] };
      return this._repository.fetch(this.uid, options).then(function (doc) {
        if (!_this6.contextParameters) {
          _this6.contextParameters = {};
        }
        _this6.contextParameters.renditions = doc.contextParameters.renditions;
        return _this6.contextParameters.renditions;
      });
    }

    /**
     * Fetch a rendition from this document.
     * @param {string} name - The rendition name.
     * @param {object} [opts] - Options overriding the ones from this object.
     * @returns {Promise} A promise object resolved with the response.
     */

  }, {
    key: 'fetchRendition',
    value: function fetchRendition(name) {
      var opts = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      var options = this._computeOptions(opts);
      var path = (0, _join2.default)('id', this.uid, '@rendition', name);
      return this._nuxeo.request(path).get(options);
    }

    /**
     * Fetches the ACLs list of this document.
     * @param {object} [opts] - Options overriding the ones from this object.
     * @returns {Promise} A promise object resolved with the ACLs.
     */

  }, {
    key: 'fetchACLs',
    value: function fetchACLs() {
      var _this7 = this;

      var opts = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      var Promise = this._nuxeo.Promise;
      if (this.contextParameters && this.contextParameters.acls) {
        return Promise.resolve(this.contextParameters.acls);
      }

      var options = this._computeOptions(opts);
      options.enrichers = { document: [_constants2.default.enricher.document.ACLS] };
      return this._repository.fetch(this.uid, options).then(function (doc) {
        if (!_this7.contextParameters) {
          _this7.contextParameters = {};
        }
        _this7.contextParameters.acls = doc.contextParameters.acls;
        return _this7.contextParameters.acls;
      });
    }

    /**
     * Checks if the user has a given permission. It only works for now for 'Write', 'Read' and 'Everything' permission.
     * This method may call the server to compute the available permissions (using the 'permissions' enricher)
     * if not already present.
     * @param {object} [opts] - Options overriding the ones from this object.
     * @returns {Promise} A promise object resolved with true or false.
     */

  }, {
    key: 'hasPermission',
    value: function hasPermission(name) {
      var _this8 = this;

      var opts = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      var Promise = this._nuxeo.Promise;
      if (this.contextParameters && this.contextParameters.permissions) {
        return Promise.resolve(this.contextParameters.permissions.indexOf(name) !== -1);
      }

      var options = this._computeOptions(opts);
      options.enrichers = { document: [_constants2.default.enricher.document.PERMISSIONS] };
      return this._repository.fetch(this.uid, options).then(function (doc) {
        if (!_this8.contextParameters) {
          _this8.contextParameters = {};
        }
        _this8.contextParameters.permissions = doc.contextParameters.permissions;
        return _this8.contextParameters.permissions.indexOf(name) !== -1;
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

  }, {
    key: 'addPermission',
    value: function addPermission(params) {
      var _this9 = this;

      var opts = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      var options = this._computeOptions(opts);
      return this._nuxeo.operation('Document.AddPermission').input(this.uid).params(params).execute(options).then(function (res) {
        options.nuxeo = _this9._nuxeo;
        options.repository = _this9._repository;
        return new Document(res, options);
      });
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

  }, {
    key: 'removePermission',
    value: function removePermission(params) {
      var _this10 = this;

      var opts = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      var options = this._computeOptions(opts);
      return this._nuxeo.operation('Document.RemovePermission').input(this.uid).params(params).execute(options).then(function (res) {
        options.nuxeo = _this10._nuxeo;
        options.repository = _this10._repository;
        return new Document(res, options);
      });
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

  }, {
    key: 'fetchLockStatus',
    value: function fetchLockStatus() {
      var opts = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      var options = this._computeOptions(opts);
      options.fetchProperties = { document: ['lock'] };
      return this._repository.fetch(this.uid, options).then(function (doc) {
        return {
          lockOwner: doc.lockOwner,
          lockCreated: doc.lockCreated
        };
      });
    }

    /**
     * Locks the document.
     * @param {object} [opts] - Options overriding the ones from this object.
     * @returns {Promise} A promise object resolved with the updated document.
     */

  }, {
    key: 'lock',
    value: function lock() {
      var _this11 = this;

      var opts = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      var options = this._computeOptions(opts);
      return this._nuxeo.operation('Document.Lock').input(this.uid).execute(opts).then(function (res) {
        options.nuxeo = _this11._nuxeo;
        options.repository = _this11._repository;
        return new Document(res, options);
      });
    }

    /**
     * Unlocks the document.
     * @param {object} [opts] - Options overriding the ones from this object.
     * @returns {Promise} A promise object resolved with the updated document.
     */

  }, {
    key: 'unlock',
    value: function unlock() {
      var _this12 = this;

      var opts = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      var options = this._computeOptions(opts);
      return this._nuxeo.operation('Document.Unlock').input(this.uid).execute(opts).then(function (res) {
        options.nuxeo = _this12._nuxeo;
        options.repository = _this12._repository;
        return new Document(res, options);
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
     * @param {object} [opts] - Options overriding the ones from this object.
     * @returns {Promise} A promise object resolved with audit entries.
     */

  }, {
    key: 'fetchAudit',
    value: function fetchAudit() {
      var queryOpts = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];
      var opts = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      var options = this._computeOptions(opts);
      var path = (0, _join2.default)('id', this.uid, '@audit');
      return this._nuxeo.request(path).queryParams(queryOpts).get(options);
    }
  }]);

  return Document;
}(_base2.default);

exports.default = Document;
module.exports = exports['default'];