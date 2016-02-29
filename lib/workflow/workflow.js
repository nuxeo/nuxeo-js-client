'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _extend = require('extend');

var _extend2 = _interopRequireDefault(_extend);

var _task = require('./task');

var _task2 = _interopRequireDefault(_task);

var _join = require('../deps/utils/join');

var _join2 = _interopRequireDefault(_join);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * The `Workflow` class wraps a workflow.
 *
 * **Cannot directly be instantiated**
 */

var Workflow = function () {
  /**
   * Creates a `Workflow`.
   * @param {object} workflow - The initial workflow object. This User object will be extended with workflow properties.
   * @param {object} opts - The configuration options.
   * @param {string} opts.nuxeo - The {@link Nuxeo} object linked to this task.
   * @param {string} [opts.documentId] - The attached document id of this workflow, if any.
   */

  function Workflow(workflow, opts) {
    _classCallCheck(this, Workflow);

    this._nuxeo = opts.nuxeo;
    this._documentId = opts.documentId;
    (0, _extend2.default)(true, this, workflow);
  }

  /**
   * Fetches the tasks of this workflow.
   * @param {object} opts - Options overriding the ones from the underlying Nuxeo object.
   * @returns {Promise} A promise object resolved with the tasks.
   */


  _createClass(Workflow, [{
    key: 'fetchTasks',
    value: function fetchTasks(opts) {
      var _this = this;

      return this._buildRequest().get(opts).then(function (_ref) {
        var entries = _ref.entries;

        var tasks = entries.map(function (task) {
          return new _task2.default(task, {
            nuxeo: _this._nuxeo,
            documentId: _this.uid
          });
        });
        return tasks;
      });
    }

    /**
     * Builds the correct `Request` object depending of wether this workflow is attached to a document or not.
     * @returns {Request} A request object.
     */

  }, {
    key: '_buildRequest',
    value: function _buildRequest() {
      if (this._documentId) {
        var path = (0, _join2.default)('id', this._documentId, '@workflow', this.id, 'task');
        return this._nuxeo.request(path);
      }
      return this._nuxeo.request('task').queryParams({
        workflowInstanceId: this.id
      });
    }
  }]);

  return Workflow;
}();

exports.default = Workflow;
module.exports = exports['default'];