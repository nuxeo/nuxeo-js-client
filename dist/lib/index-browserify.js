const extend = require('extend');

const N = require('./index');

// keep back anything declared on Nuxeo object
extend(true, N, window.Nuxeo || {});

window.Nuxeo = N;
