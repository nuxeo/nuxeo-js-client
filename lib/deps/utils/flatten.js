'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = flatten;
function flatten(list) {
  return list.reduce(function (a, b) {
    return a.concat(Array.isArray(b) ? flatten(b) : b);
  }, []);
}
module.exports = exports['default'];