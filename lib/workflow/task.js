'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _extend = require('extend');

var _extend2 = _interopRequireDefault(_extend);

var _join = require('../deps/utils/join');

var _join2 = _interopRequireDefault(_join);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var TASK_PATH = 'task';

/**
 * The `Task` class wraps a task.
 *
 * **Cannot directly be instantiated**
 */

var Task = function () {
  /**
   * Creates a `Task`.
   * @param {object} task - The initial task object. This Task object will be extended with task properties.
   * @param {object} opts - The configuration options.
   * @param {string} opts.nuxeo - The {@link Nuxeo} object linked to this task.
   * @param {string} [opts.documentId] - The attached document id of this workflow, if any.
   */

  function Task(task, opts) {
    _classCallCheck(this, Task);

    this._nuxeo = opts.nuxeo;
    this._documentId = opts.documentId;
    (0, _extend2.default)(true, this, task);
  }

  /**
   * Sets a task variable.
   * @param {string} name - The name of the variable.
   * @param {string} value - The value of the variable.
   * @returns {Task} The task itself.
   */


  _createClass(Task, [{
    key: 'variable',
    value: function variable(name, value) {
      this.variables[name] = value;
      return this;
    }

    /**
     * Completes a task.
     * @param {string} action - The action name to complete the task.
     * @param {object} [askOpts] - Configuration options for the task completion.
     * @param {string} [taskOpts.variables] - Optional variables to merge with the existing ones.
     * @param {string} [taskOpts.comment] - Optional comment.
     * @param {object} [opts] - Options overriding the ones from the underlying Nuxeo object.
     * @returns {Promise} A promise object resolved with the complete task.
     */

  }, {
    key: 'complete',
    value: function complete(action) {
      var taskOpts = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];
      var opts = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

      var variables = (0, _extend2.default)(true, {}, this.variables, taskOpts.variables);
      opts.body = {
        variables: variables,
        'entity-type': 'task',
        id: this.id,
        comment: taskOpts.comment
      };
      var path = (0, _join2.default)(TASK_PATH, this.id, action);
      return this._nuxeo.request(path).put(opts);
    }
  }]);

  return Task;
}();

exports.default = Task;
module.exports = exports['default'];