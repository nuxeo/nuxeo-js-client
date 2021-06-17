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

var join = require('../deps/utils/join');

var WORKFLOW_PATH = 'workflow';
/**
 * The `Workflow` class wraps a workflow.
 *
 * **Cannot directly be instantiated**
 */

var Workflow =
/*#__PURE__*/
function (_Base) {
  _inherits(Workflow, _Base);

  /**
   * Creates a `Workflow`.
   * @param {object} workflow - The initial workflow object. This User object will be extended with workflow properties.
   * @param {object} opts - The configuration options.
   * @param {string} opts.nuxeo - The {@link Nuxeo} object linked to this workflow.
   * @param {string} [opts.documentId] - The attached document id of this workflow, if any.
   */
  function Workflow(workflow, opts) {
    var _this;

    _classCallCheck(this, Workflow);

    _this = _possibleConstructorReturn(this, _getPrototypeOf(Workflow).call(this, opts));
    _this._nuxeo = opts.nuxeo;
    _this._documentId = opts.documentId;
    extend(true, _assertThisInitialized(_this), workflow);
    return _this;
  }
  /**
   * Fetches the tasks of this workflow.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A promise object resolved with the tasks.
   */


  _createClass(Workflow, [{
    key: "fetchTasks",
    value: function fetchTasks() {
      var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

      var options = this._computeOptions(opts);

      options.documentId = this.uid;
      return this._buildTasksRequest().get(options);
    }
    /**
     * Fetches this workflow graph.
     * @param {object} [opts] - Options overriding the ones from this object.
     * @returns {Promise} A promise object resolved with the workflow graph.
     */

  }, {
    key: "fetchGraph",
    value: function fetchGraph() {
      var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

      var options = this._computeOptions(opts);

      var path = join(WORKFLOW_PATH, this.id, 'graph');
      return this._nuxeo.request(path).get(options);
    }
    /**
     * Builds the correct `Request` object depending of whether this workflow is attached to a document or not.
     * @returns {Request} A request object.
     */

  }, {
    key: "_buildTasksRequest",
    value: function _buildTasksRequest() {
      if (this._documentId) {
        var path = join('id', this._documentId, '@workflow', this.id, 'task');
        return this._nuxeo.request(path);
      }

      return this._nuxeo.request('task').queryParams({
        workflowInstanceId: this.id
      });
    }
  }]);

  return Workflow;
}(Base);

module.exports = Workflow;