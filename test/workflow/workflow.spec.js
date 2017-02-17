const join = require('../../lib/deps/utils/join');

const WS_ROOT_PATH = '/default-domain/workspaces';
const WS_JS_TEST_NAME = 'ws-js-tests';
const WS_JS_TESTS_PATH = join(WS_ROOT_PATH, WS_JS_TEST_NAME);
const FILE_TEST_NAME = 'bar.txt';
const FILE_TEST_PATH = join(WS_JS_TESTS_PATH, FILE_TEST_NAME);

describe('Workflow spec', () => {
  let nuxeo;
  let repository;

  before(() => {
    nuxeo = new Nuxeo({ auth: { method: 'basic', username: 'Administrator', password: 'Administrator' } });
    repository = nuxeo.repository({
      schemas: ['dublincore'],
    });

    const newDoc = {
      name: WS_JS_TEST_NAME,
      type: 'Workspace',
      properties: {
        'dc:title': 'foo',
      },
    };
    const newDoc2 = {
      name: FILE_TEST_NAME,
      type: 'File',
      properties: {
        'dc:title': 'bar.txt',
      },
    };
    return nuxeo.repository().create(WS_ROOT_PATH, newDoc)
      .then(() => nuxeo.repository().create(WS_JS_TESTS_PATH, newDoc2));
  });

  after(() => (
    repository.delete(WS_JS_TESTS_PATH)
      .then(() => repository.delete('/task-root'))
      .then(() => repository.delete('/document-route-instances-root'))
  ));

  describe('Workflows', () => {
    describe('#fetchStartedWorkflows', () => {
      it('should fetch the workflows started by the current user for a workflow model name', () => {
        const workflows = nuxeo.workflows();
        return workflows.start('SerialDocumentReview')
          .then(() => workflows.fetchStartedWorkflows('SerialDocumentReview'))
          .then(({ entries }) => {
            expect(entries.length).to.be.equal(1);
          });
      });
    });

    describe('#fetchTasks', () => {
      it('should fetch all the tasks of the current user', () => {
        const workflows = nuxeo.workflows();
        return workflows.fetchTasks()
          .then(({ entries }) => {
            expect(entries.length).to.be.equal(1);
          });
      });

      it('should fetch the tasks of the current user for a given workflow', () => {
        const workflows = nuxeo.workflows();
        return workflows.fetchStartedWorkflows()
          .then(({ entries }) => entries[0])
          .then((wf) => workflows.fetchTasks({ workflowInstanceId: wf.id }))
          .then(({ entries }) => {
            expect(entries.length).to.be.equal(1);
          });
      });

      it('should fetch the tasks of the current user for a given workflow and actor', () => {
        const workflows = nuxeo.workflows();
        return workflows.fetchStartedWorkflows()
          .then(({ entries }) => entries[0])
          .then((wf) => workflows.fetchTasks({ workflowInstanceId: wf.id, actorId: 'Administrator' }))
          .then(({ entries }) => {
            expect(entries.length).to.be.equal(1);
          });
      });

      it('should fetch no task for a given workflow and non existing actor', () => {
        const workflows = nuxeo.workflows();
        return workflows.fetchStartedWorkflows()
          .then(({ entries }) => entries[0])
          .then((wf) => workflows.fetchTasks({ workflowInstanceId: wf.id, actorId: 'leela' }))
          .then(({ entries }) => {
            expect(entries.length).to.be.equal(0);
          });
      });

      it('should fetch the tasks of the current user for a given workflow and model', () => {
        const workflows = nuxeo.workflows();
        return workflows.fetchStartedWorkflows()
          .then(({ entries }) => entries[0])
          .then((wf) => workflows.fetchTasks({ workflowInstanceId: wf.id, workflowModelName: 'SerialDocumentReview' }))
          .then(({ entries }) => {
            expect(entries.length).to.be.equal(1);
          });
      });

      it('should fetch no task for a non started workflow model name', () => {
        const workflows = nuxeo.workflows();
        return workflows.fetchTasks({ workflowModelName: 'foo' })
          .then(({ entries }) => {
            expect(entries.length).to.be.equal(0);
          });
      });
    });
  });

  describe('Workflow', () => {
    describe('#fetchGraph', () => {
      it('should fetch the workflow graph', () => {
        const workflows = nuxeo.workflows();
        return workflows.fetchStartedWorkflows()
          .then(({ entries }) => entries[0])
          .then((wf) => wf.fetchGraph())
          .then((graph) => {
            expect(graph['entity-type']).to.be.equal('graph');
          });
      });
    });
  });

  it('should start and end a full serial review workflow on a document', () => {
    let currentWorkflow;
    return repository.fetch(FILE_TEST_PATH)
      .then((doc) => doc.startWorkflow('SerialDocumentReview'))
      .then((workflow) => {
        expect(workflow).to.be.an.instanceof(Nuxeo.Workflow);
        currentWorkflow = workflow;
        return workflow.fetchTasks();
      })
      .then(({ entries }) => {
        expect(entries.length).to.be.equal(1);
        return entries[0];
      })
      .then((task) => {
        expect(task).to.be.an.instanceof(Nuxeo.Task);
        task.variable('participants', ['user:Administrator'])
          .variable('assignees', ['user:Administrator'])
          .variable('end_date', '2011-10-23T12:00:00.00Z');
        return task.complete('start_review', { comment: 'a comment' });
      })
      .then((task) => {
        expect(task.state).to.be.equal('ended');
      })
      // next task
      .then(() => currentWorkflow.fetchTasks())
      .then(({ entries }) => {
        expect(entries.length).to.be.equal(1);
        return entries[0];
      })
      .then((task) => {
        expect(task).to.be.an.instanceof(Nuxeo.Task);
        return task.complete('validate');
      })
      .then((task) => {
        expect(task.state).to.be.equal('ended');
      })
      // check no workflow is running
      .then(() => repository.fetch(FILE_TEST_PATH))
      .then((doc) => doc.fetchWorkflows())
      .then(({ entries }) => {
        expect(entries.length).to.be.equal(0);
      });
  });
});
