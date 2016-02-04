'use strict';

export default function newPromise(func) {
  const N = (typeof Nuxeo !== 'undefined') ? Nuxeo : require('../nuxeo');
  return new N.Promise(func);
}
