const chai = require('chai');

// Browser globals: baseURL, isBrowser, and support are set in
// test/browser-tests.html. We set expect here because it requires
// the chai instance that is bundled into the test bundle.
window.expect = chai.expect;
