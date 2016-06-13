'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _nuxeo = require('./nuxeo');

var _nuxeo2 = _interopRequireDefault(_nuxeo);

var _base = require('./base');

var _base2 = _interopRequireDefault(_base);

var _operation = require('./operation');

var _operation2 = _interopRequireDefault(_operation);

var _request = require('./request');

var _request2 = _interopRequireDefault(_request);

var _repository = require('./repository');

var _repository2 = _interopRequireDefault(_repository);

var _document = require('./document');

var _document2 = _interopRequireDefault(_document);

var _batch = require('./upload/batch');

var _batch2 = _interopRequireDefault(_batch);

var _blob = require('./blob');

var _blob2 = _interopRequireDefault(_blob);

var _blob3 = require('./upload/blob');

var _blob4 = _interopRequireDefault(_blob3);

var _users = require('./user/users');

var _users2 = _interopRequireDefault(_users);

var _user = require('./user/user');

var _user2 = _interopRequireDefault(_user);

var _groups = require('./group/groups');

var _groups2 = _interopRequireDefault(_groups);

var _group = require('./group/group');

var _group2 = _interopRequireDefault(_group);

var _directory = require('./directory/directory');

var _directory2 = _interopRequireDefault(_directory);

var _entry = require('./directory/entry');

var _entry2 = _interopRequireDefault(_entry);

var _workflows = require('./workflow/workflows');

var _workflows2 = _interopRequireDefault(_workflows);

var _workflow = require('./workflow/workflow');

var _workflow2 = _interopRequireDefault(_workflow);

var _task = require('./workflow/task');

var _task2 = _interopRequireDefault(_task);

var _constants = require('./deps/constants');

var _constants2 = _interopRequireDefault(_constants);

var _promise = require('./deps/promise');

var _promise2 = _interopRequireDefault(_promise);

var _basicAuthenticator = require('./auth/basic-authenticator');

var _basicAuthenticator2 = _interopRequireDefault(_basicAuthenticator);

var _tokenAuthenticator = require('./auth/token-authenticator');

var _tokenAuthenticator2 = _interopRequireDefault(_tokenAuthenticator);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_nuxeo2.default.Base = _base2.default;
_nuxeo2.default.Operation = _operation2.default;
_nuxeo2.default.Request = _request2.default;
_nuxeo2.default.Repository = _repository2.default;
_nuxeo2.default.Document = _document2.default;
_nuxeo2.default.BatchUpload = _batch2.default;
_nuxeo2.default.Blob = _blob2.default;
_nuxeo2.default.BatchBlob = _blob4.default;
_nuxeo2.default.Users = _users2.default;
_nuxeo2.default.User = _user2.default;
_nuxeo2.default.Groups = _groups2.default;
_nuxeo2.default.Group = _group2.default;
_nuxeo2.default.Directory = _directory2.default;
_nuxeo2.default.DirectoryEntry = _entry2.default;
_nuxeo2.default.Workflows = _workflows2.default;
_nuxeo2.default.Workflow = _workflow2.default;
_nuxeo2.default.Task = _task2.default;
_nuxeo2.default.constants = _constants2.default;
_nuxeo2.default.version = '2.0.1';

_nuxeo2.default.promiseLibrary(_promise2.default);

_nuxeo2.default.registerAuthenticator(_basicAuthenticator2.default);
_nuxeo2.default.registerAuthenticator(_tokenAuthenticator2.default);

exports.default = _nuxeo2.default;
module.exports = exports['default'];