const Document = require('../document');
const Workflow = require('../workflow/workflow');
const Task = require('../workflow/task');
const User = require('../user/user');
const Group = require('../group/group');
const DirectoryEntry = require('../directory/entry');

const unmarshallers = {};

const Unmarshallers = {
  registerUnmarshaller: (entityType, unmarshaller) => {
    unmarshallers[entityType] = unmarshaller;
  },

  unmarshall: (json, options) => {
    const entityType = json['entity-type'];
    const unmarshaller = unmarshallers[entityType];
    return (unmarshaller && unmarshaller(json, options)) || json;
  },
};

// default unmarshallers

const documentUnmarshaller = (json, options) => new Document(json, options);

const documentsUnmarshaller = (json, options) => {
  const { entries } = json;
  const docs = entries.map((doc) => new Document(doc, options));
  json.entries = docs;
  return json;
};

const workflowUnmarshaller = (json, options) => new Workflow(json, options);

const workflowsUnmarshaller = (json, options) => {
  const { entries } = json;
  const workflows = entries.map((workflow) => new Workflow(workflow, options));
  json.entries = workflows;
  return json;
};

const taskUnmarshaller = (json, options) => new Task(json, options);

const tasksUnmarshaller = (json, options) => {
  const { entries } = json;
  const tasks = entries.map((task) => new Task(task, options));
  json.entries = tasks;
  return json;
};

const directoryEntryUnmarshaller = (json, options) => new DirectoryEntry(json, options);

const directoryEntriesUnmarshaller = (json, options) => {
  const { entries } = json;
  const directoryEntries = entries.map((directoryEntry) => new DirectoryEntry(directoryEntry, options));
  json.entries = directoryEntries;
  return json;
};

const userUnmarshaller = (json, options) => new User(json, options);

const groupUnmarshaller = (json, options) => new Group(json, options);

Unmarshallers.documentUnmarshaller = documentUnmarshaller;
Unmarshallers.documentsUnmarshaller = documentsUnmarshaller;
Unmarshallers.workflowUnmarshaller = workflowUnmarshaller;
Unmarshallers.workflowsUnmarshaller = workflowsUnmarshaller;
Unmarshallers.taskUnmarshaller = taskUnmarshaller;
Unmarshallers.tasksUnmarshaller = tasksUnmarshaller;
Unmarshallers.directoryEntryUnmarshaller = directoryEntryUnmarshaller;
Unmarshallers.directoryEntriesUnmarshaller = directoryEntriesUnmarshaller;
Unmarshallers.userUnmarshaller = userUnmarshaller;
Unmarshallers.groupUnmarshaller = groupUnmarshaller;

module.exports = Unmarshallers;
