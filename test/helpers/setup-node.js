const Nuxeo = require('../..');

global.Nuxeo = Nuxeo;
global.baseURL = process.env.NUXEO_BASE_URL || 'http://localhost:8080/nuxeo';
global.isBrowser = false;
global.support = { readBlob: false };
