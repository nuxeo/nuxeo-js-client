/* global window */

const chai = require('chai');

window.expect = chai.expect;

window.isBrowser = true;

window.support = {
  readBlob: 'FileReader' in window,
};
