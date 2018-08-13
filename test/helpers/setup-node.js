const chai = require('chai');

const Nuxeo = require('../..');

global.Nuxeo = Nuxeo;
global.expect = chai.expect;
global.isBrowser = false;
