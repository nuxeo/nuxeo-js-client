'use strict';

import Base from '../base';
import Workflow from './workflow';
import Task from './task';
import join from '../deps/utils/join';

const WORKFLOW_PATH = 'workflow';
const TASK_PATH = 'task';

/**
 * The `Workflows` class allows to work with workflows on a Nuxeo Platform instance.
 *
 * **Cannot directly be instantiated**
 *
 * @example
 * var Nuxeo = require('nuxeo')
 * var nuxeo = new Nuxeo({
 *  baseUrl: 'http://localhost:8080/nuxeo',
 *  auth: {
 *    username: 'Administrator',
 *    password: 'Administrator',
 *  }
 * });
 * nuxeo.workflows()
 *   .start('SerialDocumentReview').then((res) => {
 *     // res['entity-type'] === 'workflow'
 *     // res.workflowModelName === 'SerialDocumentReview'
 *   }).catch(error => throw new Error(error));
 */
class Workflows extends Base {
  /**
   * Creates a Workflows object.
   * @param {object} opts - The configuration options.
   */
  constructor(opts = {}) {
    super(opts);
    this._nuxeo = opts.nuxeo;
  }

  /**
   * Starts a workflow given a workflow model name.
   * @param {string} workflowModelName - The workflow model name.
   * @param {object} [workflowOpts] - Configuration options for the start of the workflow.
   * @param {Array} [workflowOpts.attachedDocumentIds] - The attached documents id for the workflow.
   * @param {object} [workflowOpts.variables] - The initial variables of the workflow.
   * @param {object} [opts] - Options overriding the ones from the underlying Nuxeo object.
   * @returns {Promise} A promise object resolved with the started `Workflow` object.
   */
  start(workflowModelName, workflowOpts = {}, opts = {}) {
    opts.body = {
      workflowModelName,
      'entity-type': 'workflow',
      attachedDocumentIds: workflowOpts.attachedDocumentIds,
      variables: workflowOpts.variables,
    };
    const options = this._computeOptions(opts);
    return this._nuxeo.request(WORKFLOW_PATH)
      .post(options)
      .then((res) => {
        options.nuxeo = this._nuxeo;
        return new Workflow(res, options);
      });
  }

  /**
   * Fetches a workflow given a workflow instance id.
   * @param {string} workflowInstanceId - The workflow instance id.
   * @param {object} [opts] - Options overriding the ones from the underlying Nuxeo object.
   * @returns {Promise} A promise object resolved with the `Workflow` object.
   */
  fetch(workflowInstanceId, opts = {}) {
    const options = this._computeOptions(opts);
    const path = join(WORKFLOW_PATH, workflowInstanceId);
    return this._nuxeo.request(path)
      .get(options)
      .then((res) => {
        options.nuxeo = this._nuxeo;
        return new Workflow(res, options);
      });
  }

 /**
  * Deletes a workflow instance given a workflow instance id.
  * @param {string} workflowInstanceId - The workflow instance id.
  * @param {object} [opts] - Options overriding the ones from the underlying Nuxeo object.
  * @returns {Promise} A Promise object resolved with the result of the DELETE request.
  */
  delete(workflowInstanceId, opts = {}) {
    const options = this._computeOptions(opts);
    const path = join(WORKFLOW_PATH, workflowInstanceId);
    return this._nuxeo.request(path)
      .delete(options);
  }

  /**
   * Fetches the workflows started by the current user.
   * @param {string} workflowModelName - The workflow model name.
   * @param {object} [opts] - Options overriding the ones from the underlying Nuxeo object.
   * @returns {Promise} A promise object resolved with the started workflows.
   */
  fetchStartedWorkflows(workflowModelName, opts = {}) {
    const options = this._computeOptions(opts);
    return this._nuxeo.request(WORKFLOW_PATH)
      .queryParams({ workflowModelName })
      .get(options)
      .then(({ entries }) => {
        options.nuxeo = this._nuxeo;
        const workflows = entries.map((workflow) => {
          return new Workflow(workflow, options);
        });
        return workflows;
      });
  }

  /**
   * Fetches the tasks for a given workflow id and/or workflow model name and/or actor id.
   * @param {object} [tasksOpts] - Configuration options for the tasks fetch.
   * @param {object} [tasksOpts.actorId] - The actor id.
   * @param {object} [tasksOpts.workflowInstanceId] - The workflow id.
   * @param {object} [tasksOpts.workflowModelName] - The workflow model name.
   * @param {object} [opts] - Options overriding the ones from the underlying Nuxeo object.
   * @returns {Promise} A promise object resolved with the tasks.
   */
  fetchTasks(tasksOpts = {}, opts = {}) {
    const options = this._computeOptions(opts);
    return this._nuxeo.request(TASK_PATH)
      .queryParams({
        userId: tasksOpts.actorId,
        workflowInstanceId: tasksOpts.workflowInstanceId,
        workflowModelName: tasksOpts.workflowModelName,
      })
      .get(options)
      .then(({ entries }) => {
        options.nuxeo = this._nuxeo;
        const tasks = entries.map((task) => {
          return new Task(task, options);
        });
        return tasks;
      });
  }
}

export default Workflows;
