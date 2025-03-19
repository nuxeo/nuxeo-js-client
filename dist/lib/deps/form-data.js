const FormData = require('form-data');

FormData.prototype.appendWithMimeType = function appendWithMimeType(key, value, mimeType) {
  this.append(key, value, { contentType: mimeType });
};

FormData.prototype.getContentType = function getContentType() {
  return this.getHeaders()['content-type'];
};

FormData.prototype.isBrowser = function isBrowser() {
  return false;
};

module.exports = FormData;
