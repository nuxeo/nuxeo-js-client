'use strict';

import Document from '../document';
import Workflow from '../workflow/workflow';
import Task from '../workflow/task';
import User from '../user/user';
import Group from '../group/group';

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
export default Unmarshallers;

// default unmarshallers

export const documentUnmarshaller = (json, options) => {
  return new Document(json, options);
};

export const documentsUnmarshaller = (json, options) => {
  const { entries } = json;
  const docs = entries.map((doc) => {
    return new Document(doc, options);
  });
  json.entries = docs;
  return json;
};

export const workflowUnmarshaller = (json, options) => {
  return new Workflow(json, options);
};

export const workflowsUnmarshaller = (json, options) => {
  return json.entries.map((workflow) => {
    return new Workflow(workflow, options);
  });
};

export const taskUnmarshaller = (json, options) => {
  return new Task(json, options);
};

export const tasksUnmarshaller = (json, options) => {
  return json.entries.map((task) => {
    return new Task(task, options);
  });
};

export const userUnmarshaller = (json, options) => {
  return new User(json, options);
};

export const groupUnmarshaller = (json, options) => {
  return new Group(json, options);
};
