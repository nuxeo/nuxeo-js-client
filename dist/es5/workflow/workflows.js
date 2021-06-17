"use strict";

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

var Base = require('../base');

var join = require('../deps/utils/join');

var WORKFLOW_PATH = 'workflow';
var TASK_PATH = 'task';
/**
 * The `Workflows` class allows to work with workflows on a Nuxeo Platform instance.
 *
 * **Cannot directly be instantiated**
 *
 * @example
 * var Nuxeo = require('nuxeo')
 * var nuxeo = new Nuxeo({
 *  baseURL: 'http://localhost:8080/nuxeo',
 *  auth: {
 *    method: 'basic',
 *    username: 'Administrator',
 *    password: 'Administrator',
 *  }
 * });
 * nuxeo.workflows()
 *   .start('SerialDocumentReview')
 *   .then(function(res) {
 *     // res['entity-type'] === 'workflow'
 *     // res.workflowModelName === 'SerialDocumentReview'
 *   })
 *   .catch(function(error) {
 *     throw new Error(error);
 *   });
 */

var Workflows =
/*#__PURE__*/
function (_Base) {
  _inherits(Workflows, _Base);

  /**
   * Creates a Workflows object.
   * @param {object} opts - The configuration options.
   * @param {string} opts.nuxeo - The {@link Nuxeo} object linked to this Workflows object.
   */
  function Workflows() {
    var _this;

    var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    _classCallCheck(this, Workflows);

    _this = _possibleConstructorReturn(this, _getPrototypeOf(Workflows).call(this, opts));
    _this._nuxeo = opts.nuxeo;
    return _this;
  }
  /**
   * Starts a workflow given a workflow model name.
   * @param {string} workflowModelName - The workflow model name.
   * @param {object} [workflowOpts] - Configuration options for the start of the workflow.
   * @param {Array} [workflowOpts.attachedDocumentIds] - The attached documents id for the workflow.
   * @param {object} [workflowOpts.variables] - The initial variables of the workflow.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A promise object resolved with the started `Workflow` object.
   */


  _createClass(Workflows, [{
    key: "start",
    value: function start(workflowModelName) {
      var workflowOpts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      var opts = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
      opts.body = {
        workflowModelName: workflowModelName,
        'entity-type': 'workflow',
        attachedDocumentIds: workflowOpts.attachedDocumentIds,
        variables: workflowOpts.variables
      };

      var options = this._computeOptions(opts);

      return this._nuxeo.request(WORKFLOW_PATH).post(options);
    }
    /**
     * Fetches a workflow given a workflow instance id.
     * @param {string} workflowInstanceId - The workflow instance id.
     * @param {object} [opts] - Options overriding the ones from this object.
     * @returns {Promise} A promise object resolved with the `Workflow` object.
     */

  }, {
    key: "fetch",
    value: function fetch(workflowInstanceId) {
      var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      var options = this._computeOptions(opts);

      var path = join(WORKFLOW_PATH, workflowInstanceId);
      return this._nuxeo.request(path).get(options);
    }
    /**
    * Deletes a workflow instance given a workflow instance id.
    * @param {string} workflowInstanceId - The workflow instance id.
    * @param {object} [opts] - Options overriding the ones from this object.
    * @returns {Promise} A Promise object resolved with the result of the DELETE request.
    */

  }, {
    key: "delete",
    value: function _delete(workflowInstanceId) {
      var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      var options = this._computeOptions(opts);

      var path = join(WORKFLOW_PATH, workflowInstanceId);
      return this._nuxeo.request(path).delete(options);
    }
    /**
     * Fetches the workflows started by the current user.
     * @param {string} workflowModelName - The workflow model name.
     * @param {object} [opts] - Options overriding the ones from this object.
     * @returns {Promise} A promise object resolved with the started workflows.
     */

  }, {
    key: "fetchStartedWorkflows",
    value: function fetchStartedWorkflows(workflowModelName) {
      var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      var options = this._computeOptions(opts);

      return this._nuxeo.request(WORKFLOW_PATH).queryParams({
        workflowModelName: workflowModelName
      }).get(options);
    }
    /**
     * Fetches the tasks for a given workflow id and/or workflow model name and/or actor id.
     * @param {object} [tasksOpts] - Configuration options for the tasks fetch.
     * @param {object} [tasksOpts.actorId] - The actor id.
     * @param {object} [tasksOpts.workflowInstanceId] - The workflow id.
     * @param {object} [tasksOpts.workflowModelName] - The workflow model name.
     * @param {object} [opts] - Options overriding the ones from this object.
     * @returns {Promise} A promise object resolved with the tasks.
     */

  }, {
    key: "fetchTasks",
    value: function fetchTasks() {
      var tasksOpts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      var options = this._computeOptions(opts);

      return this._nuxeo.request(TASK_PATH).queryParams({
        userId: tasksOpts.actorId,
        workflowInstanceId: tasksOpts.workflowInstanceId,
        workflowModelName: tasksOpts.workflowModelName
      }).get(options);
    }
  }]);

  return Workflows;
}(Base);

module.exports = Workflows;