'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.groupUnmarshaller = exports.userUnmarshaller = exports.tasksUnmarshaller = exports.taskUnmarshaller = exports.workflowsUnmarshaller = exports.workflowUnmarshaller = exports.documentsUnmarshaller = exports.documentUnmarshaller = undefined;

var _document = require('../document');

var _document2 = _interopRequireDefault(_document);

var _workflow = require('../workflow/workflow');

var _workflow2 = _interopRequireDefault(_workflow);

var _task = require('../workflow/task');

var _task2 = _interopRequireDefault(_task);

var _user = require('../user/user');

var _user2 = _interopRequireDefault(_user);

var _group = require('../group/group');

var _group2 = _interopRequireDefault(_group);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var unmarshallers = {};

var Unmarshallers = {
  registerUnmarshaller: function registerUnmarshaller(entityType, unmarshaller) {
    unmarshallers[entityType] = unmarshaller;
  },

  unmarshall: function unmarshall(json, options) {
    var entityType = json['entity-type'];
    var unmarshaller = unmarshallers[entityType];
    return unmarshaller && unmarshaller(json, options) || json;
  }
};
exports.default = Unmarshallers;

// default unmarshallers

var documentUnmarshaller = exports.documentUnmarshaller = function documentUnmarshaller(json, options) {
  return new _document2.default(json, options);
};

var documentsUnmarshaller = exports.documentsUnmarshaller = function documentsUnmarshaller(json, options) {
  var entries = json.entries;

  var docs = entries.map(function (doc) {
    return new _document2.default(doc, options);
  });
  json.entries = docs;
  return json;
};

var workflowUnmarshaller = exports.workflowUnmarshaller = function workflowUnmarshaller(json, options) {
  return new _workflow2.default(json, options);
};

var workflowsUnmarshaller = exports.workflowsUnmarshaller = function workflowsUnmarshaller(json, options) {
  return json.entries.map(function (workflow) {
    return new _workflow2.default(workflow, options);
  });
};

var taskUnmarshaller = exports.taskUnmarshaller = function taskUnmarshaller(json, options) {
  return new _task2.default(json, options);
};

var tasksUnmarshaller = exports.tasksUnmarshaller = function tasksUnmarshaller(json, options) {
  return json.entries.map(function (task) {
    return new _task2.default(task, options);
  });
};

var userUnmarshaller = exports.userUnmarshaller = function userUnmarshaller(json, options) {
  return new _user2.default(json, options);
};

var groupUnmarshaller = exports.groupUnmarshaller = function groupUnmarshaller(json, options) {
  return new _group2.default(json, options);
};