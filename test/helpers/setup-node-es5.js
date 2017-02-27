/* eslint import/no-unresolved: 0 */
const Nuxeo = require('../../dist/es5');
const chai = require('chai');

global.Nuxeo = Nuxeo;
global.expect = chai.expect;
global.isBrowser = false;
