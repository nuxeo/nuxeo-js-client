'use strict';

import extend from 'extend';
import Base from '../base';
import Task from './task';
import join from '../deps/utils/join';

const WORKFLOW_PATH = 'workflow';

/**
 * The `Workflow` class wraps a workflow.
 *
 * **Cannot directly be instantiated**
 */
class Workflow extends Base {
  /**
   * Creates a `Workflow`.
   * @param {object} workflow - The initial workflow object. This User object will be extended with workflow properties.
   * @param {object} opts - The configuration options.
   * @param {string} opts.nuxeo - The {@link Nuxeo} object linked to this task.
   * @param {string} [opts.documentId] - The attached document id of this workflow, if any.
   */
  constructor(workflow, opts) {
    super(opts);
    this._nuxeo = opts.nuxeo;
    this._documentId = opts.documentId;
    extend(true, this, workflow);
  }

  /**
   * Fetches the tasks of this workflow.
   * @param {object} opts - Options overriding the ones from the underlying Nuxeo object.
   * @returns {Promise} A promise object resolved with the tasks.
   */
  fetchTasks(opts) {
    const options = this._computeOptions(opts);
    return this._buildTasksRequest()
      .get(options)
      .then(({ entries }) => {
        options.nuxeo = this._nuxeo;
        options.documentId = this.uid;
        const tasks = entries.map((task) => {
          return new Task(task, options);
        });
        return tasks;
      });
  }

  /**
   * Fetches this workflow graph.
   * @param {object} [opts] - Options overriding the ones from the underlying Nuxeo object.
   * @returns {Promise} A promise object resolved with the workflow graph.
   */
  fetchGraph(opts) {
    const options = this._computeOptions(opts);
    const path = join(WORKFLOW_PATH, this.id, 'graph');
    return this._nuxeo.request(path)
      .get(options);
  }

  /**
   * Builds the correct `Request` object depending of wether this workflow is attached to a document or not.
   * @returns {Request} A request object.
   */
  _buildTasksRequest() {
    if (this._documentId) {
      const path = join('id', this._documentId, '@workflow', this.id, 'task');
      return this._nuxeo.request(path);
    }
    return this._nuxeo.request('task')
      .queryParams({
        workflowInstanceId: this.id,
      });
  }
}

export default Workflow;
