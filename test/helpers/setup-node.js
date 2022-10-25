const chai = require('chai');

const Nuxeo = require('../..');

global.Nuxeo = Nuxeo;
global.baseURL = process.env.NUXEO_BASE_URL || 'http://localhost:8080/nuxeo';
global.expect = chai.expect;
global.isBrowser = false;
