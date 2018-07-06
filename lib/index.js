const Nuxeo = require('./nuxeo');
const Base = require('./base');
const Operation = require('./operation');
const Request = require('./request');
const Repository = require('./repository');
const Document = require('./document');
const BatchUpload = require('./upload/batch');
const Blob = require('./blob');
const BatchBlob = require('./upload/blob');
const Users = require('./user/users');
const User = require('./user/user');
const Groups = require('./group/groups');
const Group = require('./group/group');
const Directory = require('./directory/directory');
const DirectoryEntry = require('./directory/entry');
const Workflows = require('./workflow/workflows');
const Workflow = require('./workflow/workflow');
const Task = require('./workflow/task');
const constants = require('./deps/constants');
const Promise = require('./deps/promise');
const {
  basicAuthenticator,
  tokenAuthenticator,
  bearerTokenAuthenticator,
  portalAuthenticator,
} = require('./auth/auth');
const {
  documentUnmarshaller,
  documentsUnmarshaller,
  workflowUnmarshaller,
  workflowsUnmarshaller,
  taskUnmarshaller,
  tasksUnmarshaller,
  directoryEntryUnmarshaller,
  directoryEntriesUnmarshaller,
  userUnmarshaller,
  groupUnmarshaller,
} = require('./unmarshallers/unmarshallers');
const {
  documentMarshaller,
  directoryEntryMarshaller,
  userMarshaller,
  groupMarshaller,
} = require('./marshallers/marshallers');
const NuxeoVersions = require('./nuxeo-versions');
const { SERVER_VERSIONS } = require('./server-version');
const oauth2 = require('./auth/oauth2');

const pkg = require('../package.json');

Nuxeo.Base = Base;
Nuxeo.Operation = Operation;
Nuxeo.Request = Request;
Nuxeo.Repository = Repository;
Nuxeo.Document = Document;
Nuxeo.BatchUpload = BatchUpload;
Nuxeo.Blob = Blob;
Nuxeo.BatchBlob = BatchBlob;
Nuxeo.Users = Users;
Nuxeo.User = User;
Nuxeo.Groups = Groups;
Nuxeo.Group = Group;
Nuxeo.Directory = Directory;
Nuxeo.DirectoryEntry = DirectoryEntry;
Nuxeo.Workflows = Workflows;
Nuxeo.Workflow = Workflow;
Nuxeo.Task = Task;
Nuxeo.constants = constants;
Nuxeo.version = pkg.version;

// expose Nuxeo versions
Nuxeo.VERSIONS = NuxeoVersions;
// expose Nuxeo Server versions
Nuxeo.SERVER_VERSIONS = SERVER_VERSIONS;

Nuxeo.oauth2 = oauth2;

Nuxeo.promiseLibrary(Promise);

// register default authenticators
Nuxeo.registerAuthenticator('basic', basicAuthenticator);
Nuxeo.registerAuthenticator('token', tokenAuthenticator);
Nuxeo.registerAuthenticator('bearerToken', bearerTokenAuthenticator);
Nuxeo.registerAuthenticator('portal', portalAuthenticator);

// register default unmarshallers
Nuxeo.registerUnmarshaller('document', documentUnmarshaller);
Nuxeo.registerUnmarshaller('documents', documentsUnmarshaller);
Nuxeo.registerUnmarshaller('workflow', workflowUnmarshaller);
Nuxeo.registerUnmarshaller('workflows', workflowsUnmarshaller);
Nuxeo.registerUnmarshaller('task', taskUnmarshaller);
Nuxeo.registerUnmarshaller('tasks', tasksUnmarshaller);
Nuxeo.registerUnmarshaller('directoryEntry', directoryEntryUnmarshaller);
Nuxeo.registerUnmarshaller('directoryEntries', directoryEntriesUnmarshaller);
Nuxeo.registerUnmarshaller('user', userUnmarshaller);
Nuxeo.registerUnmarshaller('group', groupUnmarshaller);
// make the WorkflowsUnmarshaller work for Nuxeo 7.10
Nuxeo.registerUnmarshaller('worflows', workflowsUnmarshaller);

// register default marshallers
Nuxeo.registerMarshaller('document', documentMarshaller);
Nuxeo.registerMarshaller('directoryEntry', directoryEntryMarshaller);
Nuxeo.registerMarshaller('user', userMarshaller);
Nuxeo.registerMarshaller('group', groupMarshaller);

module.exports = Nuxeo;
