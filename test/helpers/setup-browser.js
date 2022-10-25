/* global window */

const chai = require('chai');

window.baseURL = __karma__.config.baseURL;

window.expect = chai.expect;

window.isBrowser = true;

window.support = {
  readBlob: 'FileReader' in window,
};
