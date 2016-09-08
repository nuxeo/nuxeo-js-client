'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extend = require('extend');

var _extend2 = _interopRequireDefault(_extend);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * The `BatchBlob` class wraps a blob uploaded through a {@link BatchUpload} to be used
 * in an {@link Operation} input or as a property value on a {@link Document}.
 */
var BatchBlob = function BatchBlob() {
  var data = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

  _classCallCheck(this, BatchBlob);

  this['upload-batch'] = data.batchId;
  this['upload-fileId'] = '' + data.index;
  delete data.batchId;
  delete data.index;
  (0, _extend2.default)(this, data);
};

exports.default = BatchBlob;
module.exports = exports['default'];