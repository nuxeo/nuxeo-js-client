/* eslint no-undef: 0 */
const globalObject = typeof self === 'undefined' ? global : self;
module.exports = globalObject.fetch.bind(globalObject);
