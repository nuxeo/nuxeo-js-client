'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
var depth = {
  ROOT: 'root',
  CHILDREN: 'children',
  MAX: 'max'
};

var enricher = {
  document: {
    ACLS: 'acls',
    BREADCRUMB: 'breadcrumb',
    CHILDREN: 'children',
    DOCUMENT_URL: 'documentURL',
    PERMISSIONS: 'permissions',
    PREVIEW: 'preview'
  }
};

exports.default = {
  depth: depth,
  enricher: enricher
};
module.exports = exports['default'];