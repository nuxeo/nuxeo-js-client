const Nuxeo = require('../..');
const chai = require('chai');

global.Nuxeo = Nuxeo;
global.expect = chai.expect;
global.isBrowser = false;
