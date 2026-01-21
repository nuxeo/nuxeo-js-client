const extend = require('extend');
const Base = require('../base');
const join = require('../deps/utils/join');

const TASK_PATH = 'task';

/**
 * The `Task` class wraps a task.
 *
 * **Cannot directly be instantiated**
 */
class Task extends Base {
  /**
   * Creates a `Task`.
   * @param {object} task - The initial task object. This Task object will be extended with task properties.
   * @param {object} opts - The configuration options.
   * @param {string} opts.nuxeo - The {@link Nuxeo} object linked to this task.
   * @param {string} [opts.documentId] - The attached document id of this workflow, if any.
   */
  constructor(task, opts) {
    super(opts);
    this._nuxeo = opts.nuxeo;
    this._documentId = opts.documentId;
    extend(true, this, task);
  }

  /**
   * Sets a task variable.
   * @param {string} name - The name of the variable.
   * @param {string} value - The value of the variable.
   * @returns {Task} The task itself.
   */
  variable(name, value) {
    this.variables[name] = value;
    return this;
  }

  /**
   * Completes the task.
   * @param {string} action - The action name to complete the task.
   * @param {object} [taskOpts] - Configuration options for the task completion.
   * @param {string} [taskOpts.variables] - Optional variables to override the existing ones.
   * @param {string} [taskOpts.comment] - Optional comment.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A promise object resolved with the completed task.
   */
  complete(action, taskOpts = {}, opts = {}) {
    const variables = taskOpts.variables || this.variables;
    opts.body = {
      variables,
      'entity-type': 'task',
      id: this.id,
      comment: taskOpts.comment,
    };
    const options = this._computeOptions(opts);
    const path = join(TASK_PATH, this.id, action);
    return this._nuxeo.request(path)
      .put(options);
  }

  /**
   * Reassigns the task to the given actors.
   * @param {string} actors - Actors to reassign the task.
   * @param {object} [taskOpts] - Configuration options for the task reassignment.
   * @param {string} [taskOpts.comment] - Optional comment.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A promise object resolved with nothing.
   */
  reassign(actors, taskOpts = {}, opts = {}) {
    const options = this._computeOptions(opts);
    const path = join(TASK_PATH, this.id, 'reassign');
    return this._nuxeo.request(path)
      .queryParams({
        actors,
        comment: taskOpts.comment,
      })
      .put(options);
  }

  /**
   * Delegates the task to the given actors.
   * @param {string} actors - Actors to delegate the task.
   * @param {object} [taskOpts] - Configuration options for the task delegation.
   * @param {string} [taskOpts.comment] - Optional comment.
   * @param {object} [opts] - Options overriding the ones from this object.
   * @returns {Promise} A promise object resolved with nothing.
   */
  delegate(actors, taskOpts = {}, opts = {}) {
    const options = this._computeOptions(opts);
    const path = join(TASK_PATH, this.id, 'delegate');
    return this._nuxeo.request(path)
      .queryParams({
        delegatedActors: actors,
        comment: taskOpts.comment,
      })
      .put(options);
  }
}

module.exports = Task;
