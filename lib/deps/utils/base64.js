'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.btoa = btoa;

var _buffer = require('./buffer');

var _buffer2 = _interopRequireDefault(_buffer);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function btoa(str) {
  return new _buffer2.default(str).toString('base64');
}