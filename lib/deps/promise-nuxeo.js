'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = newPromise;
function newPromise(func) {
  var N = typeof Nuxeo !== 'undefined' ? Nuxeo : require('../nuxeo');
  return new N.Promise(func);
}
module.exports = exports['default'];