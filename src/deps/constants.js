'use strict';

const depth = {
  ROOT: 'root',
  CHILDREN: 'children',
  MAX: 'max',
};

const enricher = {
  document: {
    ACLS: 'acls',
    BREADCRUMB: 'breadcrumb',
    CHILDREN: 'children',
    DOCUMENT_URL: 'documentURL',
    PERMISSIONS: 'permissions',
    PREVIEW: 'preview',
  },
};

export default {
  depth,
  enricher,
};
