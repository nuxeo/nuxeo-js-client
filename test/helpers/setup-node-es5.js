/* eslint import/no-unresolved: 0 */
const chai = require('chai');

const Nuxeo = require('../../dist/es5');


global.Nuxeo = Nuxeo;
global.expect = chai.expect;
global.isBrowser = false;
